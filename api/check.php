<?php
/* Tanılama: mPDF / PHP eklentileri / veritabanı durumu.
   Tarayıcıda aç: http://<adres>/zoom-site/api/check.php  */
require __DIR__.'/config.php';
header('Content-Type: text/plain; charset=utf-8');

$mpdf=false;
foreach ([__DIR__.'/vendor/autoload.php', __DIR__.'/../vendor/autoload.php'] as $a) {
  if (file_exists($a)) { require $a; $mpdf = class_exists('\\Mpdf\\Mpdf'); break; }
}

function fileVer($f){ if(!is_file($f)) return 'DOSYA YOK'; $t=@file_get_contents($f); if($t!==false && preg_match('/SURUM=(v\d+)/',$t,$m)) return $m[1]; return 'ESKİ (güncel değil)'; }

echo "ZOOM Rent A Car — Sistem Kontrolü\n";
echo "================================\n";
echo "app.js sürümü      : ".fileVer(__DIR__.'/../app.js')."   (güncel: v19)\n";
echo "generate_pdf sürümü: ".fileVer(__DIR__.'/generate_pdf.php')."   (güncel: v19)\n";
echo "--------------------------------\n";
echo "PHP sürümü     : ".PHP_VERSION."\n";
echo "mPDF kurulu    : ".($mpdf ? "EVET ✓ (PDF sunucuda üretilir, Arapça kusursuz)" : "HAYIR ✗  ->  Kur: composer require mpdf/mpdf")."\n";
echo "mbstring       : ".(extension_loaded('mbstring') ? "var ✓" : "YOK ✗ (php.ini'de aç)")."\n";
echo "gd             : ".(extension_loaded('gd') ? "var ✓" : "YOK ✗ (php.ini'de aç)")."\n";
echo "memory_limit   : ".ini_get('memory_limit')."  (256M önerilir)\n";
echo "post_max_size  : ".ini_get('post_max_size')."  (64M önerilir)\n";
try { db()->query('SELECT 1'); echo "Veritabanı     : bağlandı ✓\n"; }
catch (Exception $e) { echo "Veritabanı     : HATA ✗ - ".$e->getMessage()."\n"; }
try { $n=db()->query('SELECT COUNT(*) c FROM contracts')->fetch(); echo "contracts tablo: var ✓ ($n[c] kayıt)\n"; }
catch (Exception $e) { echo "contracts tablo: YOK/HATA ✗ (api/schema.sql çalıştırın)\n"; }

echo "\nSonuç: ".($mpdf ? "Hazır. PDF her cihazda aynı ve Arapça düzgün çıkar." : "mPDF KURULMALI. Kurulana kadar telefonda Arapça bozuk olur.")."\n";
