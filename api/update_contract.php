<?php
/* Tarih düzenleme: yeni PDF'i kaydeder, kaydı günceller. Giriş gerekir. */
require __DIR__ . '/config.php';
json_headers();
require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false,'error'=>'POST gerekli']); exit; }
$in = json_decode(file_get_contents('php://input'), true);
$id = isset($in['id']) ? (int)$in['id'] : 0;
if (!$id || empty($in['pdf_base64']) || empty($in['filename'])) { echo json_encode(['ok'=>false,'error'=>'Eksik veri']); exit; }

$pdf = base64_decode($in['pdf_base64']);
if ($pdf === false) { echo json_encode(['ok'=>false,'error'=>'PDF çözülemedi']); exit; }

try {
  // eski dosyayı bul ve sil
  $st = db()->prepare("SELECT filename FROM contracts WHERE id=?");
  $st->execute([$id]); $old=$st->fetch();
  if ($old && is_file(STORE_DIR.'/'.basename($old['filename']))) @unlink(STORE_DIR.'/'.basename($old['filename']));

  $safe   = preg_replace('/[^A-Za-z0-9_\.\-]/','_',$in['filename']);
  $stored = date('Ymd_His').'_'.$safe;
  if (file_put_contents(STORE_DIR.'/'.$stored, $pdf) === false) { echo json_encode(['ok'=>false,'error'=>'PDF kaydedilemedi']); exit; }

  $u = db()->prepare("UPDATE contracts SET alis=?, iade=?, filename=?, payload=? WHERE id=?");
  $u->execute([$in['alis']??'', $in['iade']??'', $stored, $in['payload']??'', $id]);
  echo json_encode(['ok'=>true]);
} catch (Exception $e) { echo json_encode(['ok'=>false,'error'=>$e->getMessage()]); }
