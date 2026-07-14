<?php
/* PDF kaydeder, veritabanına yazar, müşteriye e-posta gönderir. Giriş gerekir. */
require __DIR__ . '/config.php';
json_headers();
require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false,'error'=>'POST gerekli']); exit; }
$in = json_decode(file_get_contents('php://input'), true);
if (!$in) { echo json_encode(['ok'=>false,'error'=>'Geçersiz veri']); exit; }
foreach (['ad','soyad','filename','pdf_base64'] as $k) {
  if (empty($in[$k])) { echo json_encode(['ok'=>false,'error'=>"Eksik alan: $k"]); exit; }
}

if (!is_dir(STORE_DIR)) { @mkdir(STORE_DIR, 0775, true); }
$ht = STORE_DIR.'/.htaccess';
if (!file_exists($ht)) @file_put_contents($ht, "Require all denied\nDeny from all\n");

$pdf = base64_decode($in['pdf_base64']);
if ($pdf === false) { echo json_encode(['ok'=>false,'error'=>'PDF çözülemedi']); exit; }
$safe   = preg_replace('/[^A-Za-z0-9_\.\-]/', '_', $in['filename']);
$stored = date('Ymd_His') . '_' . $safe;
if (file_put_contents(STORE_DIR.'/'.$stored, $pdf) === false) { echo json_encode(['ok'=>false,'error'=>'PDF kaydedilemedi']); exit; }

try {
  $st = db()->prepare(
    "INSERT INTO contracts
     (sozlesme_no,ulke,ad,soyad,kimlik,dogum,baba,anne,telefon,email,plaka,model,alis,iade,tarih,saat,filename,payload,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())");
  $st->execute([
    $in['sozlesme_no']??'', $in['ulke']??'', $in['ad'], $in['soyad'], $in['kimlik']??'',
    $in['dogum']??'', $in['baba']??'', $in['anne']??'', $in['telefon']??'', $in['email']??'',
    $in['plaka']??'', $in['model']??'', $in['alis']??'', $in['iade']??'', $in['tarih']??'', $in['saat']??'',
    $stored, $in['payload']??''
  ]);
  $id = db()->lastInsertId();
} catch (Exception $e) { echo json_encode(['ok'=>false,'error'=>'DB: '.$e->getMessage()]); exit; }

$mailed = false;
if (!empty($in['email']) && filter_var($in['email'], FILTER_VALIDATE_EMAIL)) {
  $mailed = send_pdf_mail($in['email'], $in['ad'].' '.$in['soyad'], $safe, $pdf);
}
echo json_encode(['ok'=>true,'id'=>$id,'mailed'=>$mailed]);

function send_pdf_mail($to,$name,$filename,$pdfBinary){
  $boundary=md5(uniqid(time()));
  $headers ="From: ".mb_encode_mimeheader(MAIL_FROM_NAME)." <".MAIL_FROM.">\r\n";
  $headers.="Reply-To: ".MAIL_FROM."\r\nMIME-Version: 1.0\r\n";
  $headers.="Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";
  $body ="--$boundary\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n";
  $body.="Sayın $name,\r\n\r\nKira sözleşmenizin PDF kopyası ektedir.\r\n\r\nZOOM Rent A Car\r\n\r\n";
  $body.="--$boundary\r\nContent-Type: application/pdf; name=\"$filename\"\r\n";
  $body.="Content-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"$filename\"\r\n\r\n";
  $body.=chunk_split(base64_encode($pdfBinary))."\r\n--$boundary--";
  return @mail($to,'=?UTF-8?B?'.base64_encode('ZOOM Rent A Car - Kira Sozlesmeniz').'?=',$body,$headers);
}
