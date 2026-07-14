<?php
/* SURUM=v19 */
/* Sunucu tarafı PDF (mPDF). Başlık/etiketler Türkçe (Arapça kırılmasını önlemek için),
   madde metinleri çift dilli (TR + AR). Giriş gerekir. */
require __DIR__.'/config.php';
json_headers();
require_login();

@ini_set('memory_limit','1024M');
@set_time_limit(300);
@ini_set('pcre.backtrack_limit','100000000');
@ini_set('pcre.recursion_limit','100000000');

/* Resimleri HTML'e base64 gömmek yerine geçici dosyaya yazıp yol veriyoruz.
   Böylece HTML küçük kalır, mPDF'in PCRE sınırı aşılmaz. */
$TMPIMG = [];
register_shutdown_function(function(){ global $TMPIMG; if(!empty($TMPIMG)) foreach($TMPIMG as $f) @unlink($f); });
function saveImg($dataUri){
  global $TMPIMG;
  if (!$dataUri || strpos($dataUri,'data:image')!==0) return '';
  if (!preg_match('#^data:image/([a-zA-Z0-9\+\-\.]+);base64,#',$dataUri,$m)) return '';
  $type=strtolower($m[1]); $ext = (strpos($type,'svg')!==false)?'svg':(($type==='jpeg')?'jpg':$type);
  $bin=base64_decode(substr($dataUri, strpos($dataUri,',')+1)); if($bin===false) return '';
  if (!is_dir(STORE_DIR)) @mkdir(STORE_DIR,0775,true);
  $path = STORE_DIR.'/_tmp_'.md5(uniqid('',true)).'.'.$ext;
  if (@file_put_contents($path,$bin)===false) return '';
  $TMPIMG[]=$path; return $path;
}

$auto = null;
foreach ([__DIR__.'/vendor/autoload.php', __DIR__.'/../vendor/autoload.php'] as $a) { if (file_exists($a)) { $auto=$a; break; } }
if (!$auto) { echo json_encode(['ok'=>false,'error'=>'mPDF kurulu değil (composer require mpdf/mpdf)']); exit; }
require $auto;
if (!class_exists('\\Mpdf\\Mpdf')) { echo json_encode(['ok'=>false,'error'=>'mPDF sınıfı bulunamadı']); exit; }

$in = json_decode(file_get_contents('php://input'), true);
if (!$in || empty($in['payload'])) { echo json_encode(['ok'=>false,'error'=>'Eksik veri']); exit; }
$c = json_decode($in['payload'], true);
if (!is_array($c)) { echo json_encode(['ok'=>false,'error'=>'payload çözülemedi']); exit; }
$id = isset($in['id']) ? (int)$in['id'] : 0;
$wasUpdate = $id > 0;

function e($s){ return htmlspecialchars((string)($s??''), ENT_QUOTES, 'UTF-8'); }
function fdate($s){ if(!$s) return '—'; $p=explode('-',(string)$s); return count($p)===3 ? "$p[2].$p[1].$p[0]" : $s; }
function fdt($s){ if(!$s) return '—'; if(strpos((string)$s,'T')!==false){ list($d,$t)=explode('T',$s); return fdate($d).' '.substr($t,0,5);} return $s; }

$co = $c['company'] ?? []; $cfg = $c['cfg'] ?? []; $car = $c['car'] ?? []; $renters = $c['renters'] ?? [];
$dailyKm = e($cfg['dailyKm'] ?? '150'); $excess = e($cfg['excess'] ?? '15'); $court = e($cfg['court'] ?? 'İstanbul');
$logo = saveImg($co['logo'] ?? '');
$ownerImg = saveImg($co['ownerSig'] ?? '');

$partyHtml = '';
foreach ($renters as $i => $r) {
  $no=$i+1; $kl = (($r['kimlikTipi']??'')==='Pasaport') ? 'Pasaport No' : 'T.C. / Kimlik No';
  $baba = !empty($r['baba']) ? '<tr><td class="k">Baba Adı</td><td>'.e($r['baba']).'</td></tr>' : '';
  $anne = !empty($r['anne']) ? '<tr><td class="k">Anne Adı</td><td>'.e($r['anne']).'</td></tr>' : '';
  $partyHtml .= '<p class="who">Kiracı '.$no.'</p><table>'
    .'<tr><td class="k">Ad Soyad</td><td>'.e($r['ad']).' '.e($r['soyad']).'</td></tr>'
    .'<tr><td class="k">Uyruk</td><td>'.e($r['ulke']).'</td></tr>'
    .'<tr><td class="k">'.$kl.'</td><td>'.e($r['kimlikNo']).'</td></tr>'
    .'<tr><td class="k">Doğum Tarihi</td><td>'.fdate($r['dogum']??'').'</td></tr>'
    .$baba.$anne
    .'<tr><td class="k">Telefon</td><td>'.e($r['tel']).'</td></tr></table>';
}

/* imzaları dosyaya yaz, yol tut */
$rSigPath = [];
foreach ($renters as $i=>$r){ $rSigPath[$i] = saveImg($r['sig'] ?? ''); }

$sigCells = '<td class="sb"><div class="sl">'.($ownerImg?'<img src="'.$ownerImg.'" height="46">':'').'</div>'
  .'<div class="sn">KİRALAYAN<br>'.e($co['unvan']??'').'</div></td>';
foreach ($renters as $i=>$r){ $no=$i+1;
  $sigCells .= '<td class="sb"><div class="sl">'.($rSigPath[$i]?'<img src="'.$rSigPath[$i].'" height="46">':'').'</div>'
    .'<div class="sn">KİRACI '.$no.'<br>'.e($r['ad']).' '.e($r['soyad']).'</div></td>';
}

$footCells='<td class="fc">'.($ownerImg?'<img src="'.$ownerImg.'" height="26"><br>':'').'Kiralayan: '.e($co['unvan']??'').'</td>';
foreach ($renters as $i=>$r){ $no=$i+1; $footCells.='<td class="fc">'.($rSigPath[$i]?'<img src="'.$rSigPath[$i].'" height="26"><br>':'').'Kiracı '.$no.': '.e($r['ad']).' '.e($r['soyad']).'</td>'; }
$footerHtml = '<table class="ft" width="100%"><tr>'.$footCells.'</tr></table>';

$photoHtml='';
foreach ($renters as $i=>$r){ $no=$i+1; $ph=$r['photos']??[]; $k=0; $cnt=count($ph);
  foreach ($ph as $p){ $k++; $pp=saveImg($p); if(!$pp) continue;
    $photoHtml.='<pagebreak /><div class="pl">Belge - Kiracı '.$no.' ('.$k.'/'.$cnt.')</div>'
      .'<div style="text-align:center"><img src="'.$pp.'" style="max-width:170mm;max-height:235mm"></div>';
  }
}

$css = '
<style>
body{font-family:dejavusans;font-size:9.4pt;color:#15181d;line-height:1.4}
.hd{text-align:center} .hd img{height:42px} .co{font-size:8pt;color:#444;margin-top:1mm}
h1{text-align:center;font-size:13pt;margin:3mm 0 0} .ar{text-align:center;font-size:11pt;color:#333;margin-bottom:2mm}
h3{font-size:9.7pt;font-weight:normal;color:#22304a;background:#eef1f6;border-left:2.5pt solid #2b3a55;padding:1.4mm 2mm;margin:3mm 0 1.4mm}
table{width:100%;border-collapse:collapse;margin:1mm 0} td{border:0.2mm solid #cfd4dc;padding:1.1mm 1.8mm;vertical-align:top}
td.k{width:36%;font-weight:normal;color:#333;background:#f6f8fb} p{margin:1.2mm 0;text-align:justify}
.arp{color:#333;direction:rtl;text-align:right} .who{font-weight:bold;color:#22304a;margin:2mm 0 0.5mm}
.sigt{width:100%;margin-top:4mm} .sb{border:0;text-align:center;width:50%} .sl{border:0.2mm solid #b9c0cc;height:18mm;padding:1mm}
.sn{font-size:8pt;color:#444;margin-top:1mm}
.ft{font-size:6.5pt;color:#666;border-top:0.2mm solid #ccc} .ft .fc{border:0;text-align:center}
.pl{font-weight:bold;font-size:10pt;margin:2mm 0;text-align:center}
.meta{text-align:right;color:#777;font-size:7.5pt;margin-top:2mm}
</style>';

$body = '
<div class="hd">'.($logo!==''?'<img src="'.$logo.'">':'<div style="font-weight:bold;font-size:16pt">ZOOM RENT A CAR</div>').'
<div class="co">'.e($co['unvan']??'').(!empty($co['tel'])?' • Tel: '.e($co['tel']):'').(!empty($co['email'])?' • '.e($co['email']):'').'</div></div>
<h1>ARAÇ KİRALAMA SÖZLEŞMESİ</h1><div class="ar">عقد إيجار سيارة</div>
<table>
<tr><td class="k">Sözleşme Yeri</td><td>'.e($c['yer']??'').'</td></tr>
<tr><td class="k">Sözleşme No</td><td>'.e($c['no']??'').'</td></tr></table>
<h3>1. TARAFLAR</h3>
<p class="who">Kiralayan</p>
<table>
<tr><td class="k">Ünvan</td><td>'.e($co['unvan']??'').'</td></tr>
<tr><td class="k">Yetkili</td><td>'.e($co['ad']??'').'</td></tr>
<tr><td class="k">Adres</td><td>'.e($co['adres']??'').'</td></tr>
<tr><td class="k">Telefon</td><td>'.e($co['tel']??'').'</td></tr>
<tr><td class="k">Vergi No</td><td>'.e($co['vergi']??'').'</td></tr></table>
'.$partyHtml.'
<h3>2. ARAÇ BİLGİLERİ</h3>
<table>
<tr><td class="k">Plaka</td><td>'.e($car['plaka']??'').'</td></tr>
<tr><td class="k">Marka-Model</td><td>'.e($car['model']??'').'</td></tr>
<tr><td class="k">Model Yılı</td><td>'.e($car['yil']??'').'</td></tr>
<tr><td class="k">Teslim KM</td><td>'.(e($c['teslimKm']??'')?:'—').'</td></tr>
<tr><td class="k">İade KM</td><td>'.(e($c['iadeKm']??'')?:'—').'</td></tr></table>
<h3>3. KİRALAMA SÜRESİ</h3>
<table>
<tr><td class="k">Başlangıç</td><td>'.fdt($c['alis']??'').'</td></tr>
<tr><td class="k">Bitiş</td><td>'.fdt($c['iade']??'').'</td></tr></table>
<p>Kiracı, aracı belirtilen bitiş tarihinde ve saatinde eksiksiz, hasarsız ve teslim aldığı durumla aynı şekilde iade etmekle yükümlüdür.</p>
<p class="arp">يلتزم المستأجر بإعادة السيارة في تاريخ ووقت انتهاء الإيجار كاملة وبدون أضرار وبنفس الحالة التي استلمها بها.</p>
<h3>4. ÖDEME VE DEPOZİTO</h3>
<p>Kiracı, kira bedelini ve varsa ek ücretleri zamanında ödemeyi kabul eder. Depozito; hasar, ceza, eksik yakıt, fazla kilometre, geç teslim veya üçüncü kişi talepleri yoksa araç iade edildikten sonra iade edilir.</p>
<p class="arp">يُعاد مبلغ التأمين بعد إعادة السيارة إذا لم توجد أضرار أو مخالفات أو نقص وقود أو كيلومترات زائدة أو تأخير أو مطالبات من الغير.</p>
<h3>5. GÜNLÜK KİLOMETRE SINIRI</h3>
<p>Günlük kullanım sınırı '.$dailyKm.' KM\'dir. Kiracı bu sınırı aşarsa, aşan her kilometre için '.$excess.' TL ödemeyi kabul eder. Kullanılmayan kilometreler sonraki günlere devredilmez.</p>
<p class="arp">الحد المسموح للاستخدام اليومي هو '.$dailyKm.' كم. في حال التجاوز يلتزم المستأجر بدفع '.$excess.' ليرة عن كل كيلومتر زائد. الكيلومترات غير المستخدمة لا تُرحّل.</p>
<h3>6. SİGORTA: KASKO YOKTUR</h3>
<p>Taraflar araçta KASKO sigortası bulunmadığını, yalnızca Zorunlu Trafik Sigortası bulunduğunu kabul eder. Sigorta kapsamı kanun ve poliçe ile sınırlıdır; aracın kendi hasarını, değer kaybını, gelir kaybını, tamir/çekici/otopark masraflarını karşılamayabilir. Sigortanın karşılamadığı her türlü zarardan kiracı sorumludur.</p>
<p class="arp">يقرّ الطرفان بعدم وجود تأمين كاسكو، ووجود تأمين المرور الإجباري فقط، وأن المستأجر مسؤول عن كل ضرر لا يغطيه التأمين.</p>
<h3>7. KİRACININ SORUMLULUĞU</h3>
<p>Kiracı; teslim aldığı andan iade ettiği ana kadar araç, anahtar, ruhsat ve ekipmandan ve araçla ilgili tüm hukuki, cezai, idari, mali sonuçlardan sorumludur. Özellikle: trafik kazaları, hasar, çizik, cam, lastik, jant, motor, şanzıman, mekanik/elektronik hasarlar; trafik cezaları, OGS/HGS, köprü/otoyol, otopark; çekici, ekspertiz, değer kaybı, gelir kaybı; sigortanın rücu bedelleri; üçüncü kişi/kurum/mahkeme talepleri.</p>
<p class="arp">المستأجر مسؤول عن السيارة والمفاتيح والرخصة والمعدات وجميع النتائج القانونية والمالية، بما في ذلك الحوادث والأضرار والمخالفات ورسوم الطرق والمواقف والسحب ونقصان القيمة ومطالبات الغير.</p>
<h3>8. YASAK KULLANIMLAR</h3>
<p>Kiracı aracı şu şekilde kullanamaz/kullandıramaz: uyuşturucu, kaçak, yasak madde/eşya, silah, patlayıcı taşımak; suç işlemek veya araçla suça yardım; alkollü/uyuşturucu etkisinde veya ehliyetsiz kullanmak; yarış, drift, off-road, ağır yük, çekme, ticari yolcu/taksi/kurye; kiralayanın yazılı izni olmadan İstanbul dışına çıkarmak; üçüncü kişiye vermek/alt kiralamak veya sözleşmede adı olmayan kişiye kullandırmak. Aykırılık halinde tüm sorumluluk kiracıya aittir.</p>
<p class="arp">يُمنع استعمال السيارة في نقل المواد الممنوعة أو الأسلحة، أو في أي فعل جرمي، أو القيادة تحت تأثير الكحول/المخدرات أو بدون رخصة، أو السباق والطرق الوعرة والنقل التجاري، أو إخراجها خارج اسطنبول بدون إذن خطي، أو تسليمها لغير المذكور في العقد.</p>
<h3>9. KAZA/HASAR BİLDİRİMİ</h3>
<p>Kaza, hasar, arıza, hırsızlık, polis/jandarma işlemi veya araca el konulması halinde kiracı derhal kiralayana haber verir; olay yerinden ayrılmaz, tutanak düzenletir, gerekli testlerden kaçınmaz, fotoğraf çeker ve belgeleri teslim eder. Aksi halde doğan tüm zararlar kiracıya aittir.</p>
<p class="arp">عند وقوع حادث أو ضرر أو حجز، يبلّغ المستأجر المؤجّر فوراً، ولا يغادر مكان الحادث، وينظّم التقرير ويسلّم الوثائق، وإلا تحمّل كامل الأضرار.</p>
<h3>10. TESLİM VE İADE</h3>
<p>Araç; teslim formundaki kilometre, yakıt, ekipman ve hasar durumu ile teslim edilmiştir ve aynı durumda, aynı yerde iade edilecektir. Eksik yakıt/ekipman, anahtar/ruhsat kaybı veya geç iade bedelleri kiracıdan tahsil edilir.</p>
<p class="arp">تُسلّم السيارة بحالتها المذكورة وتُعاد بنفس الحالة وفي المكان المتفق عليه، ويتحمل المستأجر تكاليف النقص أو الفقدان أو التأخير.</p>
<h3>11. CEZA ŞARTI</h3>
<p>Kiracı; aracı yasak amaçla kullanır, üçüncü kişiye kullandırır, kazayı gizler, sahte beyanda bulunur veya aracı iade etmezse, kiralayanın zararları saklı kalmak üzere zarara göre cezai şart ödemeyi kabul eder.</p>
<p class="arp">إذا خالف المستأجر الشروط أو لم يُعد السيارة، يلتزم بدفع شرط جزائي حسب الضرر مع حفظ حق المؤجّر بالمطالبة بالأضرار الإضافية.</p>
<h3>12. EKLER</h3>
<p>Kiracının kimlik/ikamet ve ehliyet fotokopisi, araç ruhsatı, trafik sigortası poliçesi, teslim-tesellüm formu ve teslim anı fotoğrafları bu sözleşmenin ekidir. (Belge fotoğrafları sözleşmenin sonuna eklenmiştir.)</p>
<p class="arp">تُرفق صور هوية ورخصة المستأجر ورخصة السيارة وبوليصة التأمين ومحضر التسليم وصور السيارة. (صور الوثائق مرفقة في نهاية العقد.)</p>
<h3>13. YETKİLİ MAHKEME</h3>
<p>İşbu sözleşmeden doğacak uyuşmazlıklarda '.$court.' Mahkemeleri ve İcra Daireleri yetkilidir; Türk Hukuku uygulanır.</p>
<p class="arp">تختص محاكم '.$court.' ودوائر تنفيذها بأي نزاع، ويُطبّق القانون التركي.</p>
<h3>14. DİL</h3>
<p>Bu sözleşme Türkçe ve Arapça düzenlenmiştir. Yorum farkında Türkçe metin esastır. Taraflar her iki metni okuyup anladıklarını kabul eder.</p>
<p class="arp">حُرّر العقد بالتركية والعربية، ويُعتمد النص التركي عند الاختلاف، ويقرّ الطرفان بقراءتهما وفهمهما للنصين.</p>
<h3>15. İMZA</h3>
<p>Taraflar sözleşmeyi okuyarak serbest iradeleriyle imzalamıştır.</p>
<table class="sigt"><tr>'.$sigCells.'</tr></table>
<div class="meta">Sözleşme No: '.e($c['no']??'').'</div>
'.$photoHtml;

try {
  $mpdf = new \Mpdf\Mpdf([
    'mode'=>'utf-8','format'=>'A4',
    'margin_top'=>12,'margin_bottom'=>22,'margin_left'=>11,'margin_right'=>11,
    'autoScriptToLang'=>true,'autoLangToFont'=>true,'autoArabic'=>true
  ]);
  $mpdf->SetHTMLFooter($footerHtml);
  $mpdf->WriteHTML($css.$body);
  $pdf = $mpdf->Output('', 'S');
} catch (\Throwable $ex) { echo json_encode(['ok'=>false,'error'=>'mPDF: '.$ex->getMessage()]); exit; }

if (!is_dir(STORE_DIR)) { @mkdir(STORE_DIR,0775,true); }
$ht=STORE_DIR.'/.htaccess'; if(!file_exists($ht)) @file_put_contents($ht,"Require all denied\nDeny from all\n");
$safe = preg_replace('/[^A-Za-z0-9_\.\-]/','_', $in['filename'] ?? ('sozlesme_'.($c['no']??'').'.pdf'));
$stored = date('Ymd_His').'_'.$safe;
if (file_put_contents(STORE_DIR.'/'.$stored, $pdf)===false) { echo json_encode(['ok'=>false,'error'=>'PDF kaydedilemedi','pdf_base64'=>base64_encode($pdf)]); exit; }

$r0 = $renters[0] ?? [];
try {
  if ($wasUpdate) {
    $old = db()->prepare("SELECT filename FROM contracts WHERE id=?"); $old->execute([$id]); $orow=$old->fetch();
    if ($orow && is_file(STORE_DIR.'/'.basename($orow['filename']))) @unlink(STORE_DIR.'/'.basename($orow['filename']));
    db()->prepare("UPDATE contracts SET ad=?,soyad=?,kimlik=?,alis=?,iade=?,filename=?,payload=? WHERE id=?")
        ->execute([$r0['ad']??'', $r0['soyad']??'', $r0['kimlikNo']??'', $c['alis']??'', $c['iade']??'', $stored, $in['payload'], $id]);
  } else {
    db()->prepare("INSERT INTO contracts (sozlesme_no,ulke,ad,soyad,kimlik,dogum,baba,anne,telefon,email,plaka,model,alis,iade,tarih,saat,filename,payload,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())")
      ->execute([$c['no']??'', $r0['ulke']??'', $r0['ad']??'', $r0['soyad']??'', $r0['kimlikNo']??'', $r0['dogum']??'',
        $r0['baba']??'', $r0['anne']??'', $r0['tel']??'', $r0['email']??'', $car['plaka']??'', $car['model']??'',
        $c['alis']??'', $c['iade']??'', $c['tarih']??'', $c['saat']??'', $stored, $in['payload']]);
    $id = db()->lastInsertId();
  }
} catch (Exception $ex) { echo json_encode(['ok'=>false,'error'=>'DB: '.$ex->getMessage(),'id'=>$id,'pdf_base64'=>base64_encode($pdf)]); exit; }

$mailed=false;
if (!$wasUpdate && !empty($r0['email']) && filter_var($r0['email'], FILTER_VALIDATE_EMAIL)) {
  $mailed = send_pdf_mail($r0['email'], ($r0['ad']??'').' '.($r0['soyad']??''), $safe, $pdf);
}
echo json_encode(['ok'=>true,'id'=>$id,'mailed'=>$mailed,'pdf_base64'=>base64_encode($pdf)]);

function send_pdf_mail($to,$name,$filename,$pdfBinary){
  $boundary=md5(uniqid(time()));
  $headers ="From: ".mb_encode_mimeheader(MAIL_FROM_NAME)." <".MAIL_FROM.">\r\nReply-To: ".MAIL_FROM."\r\nMIME-Version: 1.0\r\n";
  $headers.="Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";
  $body ="--$boundary\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n";
  $body.="Sayın $name,\r\n\r\nKira sözleşmenizin PDF kopyası ektedir.\r\n\r\nZOOM Rent A Car\r\n\r\n";
  $body.="--$boundary\r\nContent-Type: application/pdf; name=\"$filename\"\r\nContent-Transfer-Encoding: base64\r\n";
  $body.="Content-Disposition: attachment; filename=\"$filename\"\r\n\r\n".chunk_split(base64_encode($pdfBinary))."\r\n--$boundary--";
  return @mail($to,'=?UTF-8?B?'.base64_encode('ZOOM Rent A Car - Kira Sozlesmeniz').'?=',$body,$headers);
}
