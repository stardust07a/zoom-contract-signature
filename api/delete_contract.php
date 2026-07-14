<?php
/* Sözleşme sil (kayıt + PDF dosyası). Giriş gerekir. */
require __DIR__.'/config.php';
json_headers();
require_login();

$in = json_decode(file_get_contents('php://input'), true);
$id = isset($in['id']) ? (int)$in['id'] : 0;
if (!$id) { echo json_encode(['ok'=>false,'error'=>'Geçersiz id']); exit; }

try {
  $st = db()->prepare("SELECT filename FROM contracts WHERE id=?");
  $st->execute([$id]); $row=$st->fetch();
  if ($row && is_file(STORE_DIR.'/'.basename($row['filename']))) @unlink(STORE_DIR.'/'.basename($row['filename']));
  db()->prepare("DELETE FROM contracts WHERE id=?")->execute([$id]);
  echo json_encode(['ok'=>true]);
} catch (Exception $e) { echo json_encode(['ok'=>false,'error'=>$e->getMessage()]); }
