<?php
/* ====== SUNUCUYA ÖZEL AYARLAR ======
   Bu dosyayı 'db_config.php' adıyla KOPYALA ve kendi bilgilerinle doldur.
   db_config.php ZIP güncellemeleriyle GELMEZ ve ÜZERİNE YAZILMAZ — bilgilerin korunur.

   Hostinger için örnek (kendi değerlerinle değiştir): */

define('DB_HOST', 'localhost');
define('DB_NAME', 'u373305847_zoom');     // Hostinger veritabanı adın
define('DB_USER', 'u373305847_zoom');     // Hostinger veritabanı kullanıcı adın
define('DB_PASS', 'BURAYA_SIFRE');        // veritabanı şifren

/* Müşteriye PDF gönderen e-posta (kendi alan adınla bir kutu) */
define('MAIL_FROM', 'noreply@zoomrentacars.com');
define('MAIL_FROM_NAME', 'ZOOM Rent A Car');
