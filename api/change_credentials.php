<?php
/* Kullanıcı adı + şifre değiştirme. Giriş gerekir + mevcut şifre doğrulanır. */
require __DIR__.'/config.php';
json_headers();
require_login();

$in = json_decode(file_get_contents('php://input'), true);
$cur = $in['curPass'] ?? '';
$nu  = trim($in['newUser'] ?? '');
$np  = $in['newPass'] ?? '';

if (!verify_pass($cur)) { echo json_encode(['ok'=>false,'error'=>'Mevcut şifre yanlış']); exit; }
if ($nu==='' ) { echo json_encode(['ok'=>false,'error'=>'Kullanıcı adı boş olamaz']); exit; }
if (strlen($np) < 4) { echo json_encode(['ok'=>false,'error'=>'Yeni şifre en az 4 karakter olmalı']); exit; }

if (save_creds($nu, $np)) echo json_encode(['ok'=>true]);
else echo json_encode(['ok'=>false,'error'=>'Kaydedilemedi (klasör izni?)']);
