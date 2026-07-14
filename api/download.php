<?php
/* Kayıtlı bir sözleşme PDF'ini güvenli şekilde indirir. */
require __DIR__ . '/config.php';
if (!is_logged_in()) { http_response_code(401); exit('Giriş gerekli'); }

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if (!$id) { http_response_code(400); exit('Geçersiz istek'); }

try {
  $st = db()->prepare("SELECT filename FROM contracts WHERE id = ?");
  $st->execute([$id]);
  $row = $st->fetch();
} catch (Exception $e) { http_response_code(500); exit('Sunucu hatası'); }

if (!$row) { http_response_code(404); exit('Bulunamadı'); }

$path = STORE_DIR . '/' . basename($row['filename']);
if (!is_file($path)) { http_response_code(404); exit('Dosya yok'); }

header('Content-Type: application/pdf');
header('Content-Disposition: inline; filename="'.basename($row['filename']).'"');
header('Content-Length: '.filesize($path));
readfile($path);
