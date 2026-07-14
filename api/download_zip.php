<?php
/* Tarih aralığındaki tüm sözleşme PDF'lerini ZIP olarak indirir. Giriş gerekir. */
require __DIR__.'/config.php';
if (!is_logged_in()) { http_response_code(401); exit('Giriş gerekli'); }

$start = isset($_GET['start']) ? $_GET['start'] : '';
$end   = isset($_GET['end'])   ? $_GET['end']   : '';

try {
  $sql="SELECT filename, ad, soyad, tarih FROM contracts WHERE 1=1";
  $args=[];
  if($start!==''){ $sql.=" AND tarih>=?"; $args[]=$start; }
  if($end!==''){   $sql.=" AND tarih<=?"; $args[]=$end; }
  $sql.=" ORDER BY created_at DESC";
  $st=db()->prepare($sql); $st->execute($args); $rows=$st->fetchAll();
} catch (Exception $e) { http_response_code(500); exit('Sunucu hatası'); }

if (!$rows) { http_response_code(404); exit('Bu aralıkta sözleşme yok'); }
if (!class_exists('ZipArchive')) { http_response_code(500); exit('ZIP desteği yok (ZipArchive)'); }

$tmp = tempnam(sys_get_temp_dir(),'zoomzip');
$zip = new ZipArchive();
if ($zip->open($tmp, ZipArchive::OVERWRITE)!==true) { http_response_code(500); exit('ZIP oluşturulamadı'); }
foreach ($rows as $r) {
  $path = STORE_DIR.'/'.basename($r['filename']);
  if (is_file($path)) $zip->addFile($path, basename($r['filename']));
}
$zip->close();

$name = 'sozlesmeler_'.($start?:'tum').'_'.($end?:'').'.zip';
header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="'.$name.'"');
header('Content-Length: '.filesize($tmp));
readfile($tmp);
@unlink($tmp);
