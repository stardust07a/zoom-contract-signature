<?php
/* Tek bir sözleşmenin tüm verisini (payload dahil) döner — düzenleme için. Giriş gerekir. */
require __DIR__ . '/config.php';
json_headers();
require_login();

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if (!$id) { echo json_encode(['ok'=>false,'error'=>'Geçersiz id']); exit; }
try {
  $st = db()->prepare("SELECT sozlesme_no,alis,iade,filename,payload FROM contracts WHERE id=?");
  $st->execute([$id]); $row=$st->fetch();
  if (!$row) { echo json_encode(['ok'=>false,'error'=>'Bulunamadı']); exit; }
  echo json_encode(['ok'=>true,'payload'=>$row['payload'],'alis'=>$row['alis'],'iade'=>$row['iade']], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) { echo json_encode(['ok'=>false,'error'=>$e->getMessage()]); }
