<?php
/* Bir sözleşmeyi 'fatura kesildi' olarak işaretler/kaldırır. Giriş gerekir.
   'fatura' sütunu yoksa OTOMATİK ekler (manuel ALTER gerekmez). */
require __DIR__.'/config.php';
json_headers();
require_login();

$in = json_decode(file_get_contents('php://input'), true);
$id = isset($in['id']) ? (int)$in['id'] : 0;
$f  = !empty($in['fatura']) ? 1 : 0;
if (!$id) { echo json_encode(['ok'=>false,'error'=>'Geçersiz id']); exit; }

/* fatura sütunu var mı? yoksa ekle */
try { db()->query("SELECT fatura FROM contracts LIMIT 1"); }
catch (Exception $e) {
  try { db()->exec("ALTER TABLE contracts ADD COLUMN fatura TINYINT DEFAULT 0"); }
  catch (Exception $e2) { echo json_encode(['ok'=>false,'error'=>'Sütun eklenemedi: '.$e2->getMessage()]); exit; }
}

try {
  db()->prepare("UPDATE contracts SET fatura=? WHERE id=?")->execute([$f,$id]);
  echo json_encode(['ok'=>true,'fatura'=>$f]);
} catch (Exception $e) { echo json_encode(['ok'=>false,'error'=>$e->getMessage()]); }
