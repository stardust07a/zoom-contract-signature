<?php
/* Kayıtlı sözleşmeleri döner (Sözleşmeler sekmesi). Giriş gerekir. */
require __DIR__ . '/config.php';
json_headers();
require_login();

$base = "SELECT id,sozlesme_no,ulke,ad,soyad,kimlik,plaka,tarih,saat,alis,iade,filename";
$order = " FROM contracts ORDER BY created_at DESC LIMIT 500";
try {
  // fatura sütunu varsa onunla, yoksa (henüz ALTER yapılmadıysa) onsuz getir
  try { $rows = db()->query($base.",COALESCE(fatura,0) AS fatura".$order)->fetchAll(); }
  catch (Exception $e2) { $rows = db()->query($base.$order)->fetchAll(); }

  $items = array_map(function($r){
    return [
      'id'=>$r['id'], 'no'=>$r['sozlesme_no'], 'ulke'=>$r['ulke'],
      'ad'=>$r['ad'], 'soyad'=>$r['soyad'], 'kimlik'=>$r['kimlik'], 'plaka'=>$r['plaka'],
      'tarih'=>$r['tarih'], 'saat'=>$r['saat'], 'alis'=>$r['alis'], 'iade'=>$r['iade'],
      'fatura'=>(int)($r['fatura'] ?? 0), 'filename'=>$r['filename'], 'url'=>'api/download.php?id='.$r['id'],
    ];
  }, $rows);
  echo json_encode(['ok'=>true,'items'=>$items], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) { echo json_encode(['ok'=>false,'error'=>$e->getMessage(),'items'=>[]]); }
