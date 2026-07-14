# ZOOM Rent A Car — Hostinger'a Taşıma Rehberi (Adım Adım)

## 1. Dosyaları yükle
hPanel → **Dosya Yöneticisi → public_html**.
`zoom-site` içindeki **tüm dosyaları** public_html'e yükle (klasör yapısını koru:
`api/`, `assets/`, `.htaccess`, `index.html`, `app.js`, `manifest.json`).
> Not: gizli `.htaccess` dosyalarının da yüklendiğinden emin ol (Dosya Yöneticisi'nde
> "gizli dosyaları göster" açık olsun).

## 2. SSL'i aç (HTTPS) — ÖNEMLİ
hPanel → **Güvenlik → SSL** → alan adın için ücretsiz SSL'i etkinleştir.
Aktif olduktan sonra `.htaccess` dosyasını aç ve en alttaki **HTTPS zorlama**
bölümündeki 3 satırın başındaki `#` işaretlerini kaldır (kaydet).
Kamera (kimlik/ehliyet fotoğrafı) yalnızca HTTPS'te çalışır — bu adım şart.

## 3. Veritabanı
hPanel → **Veritabanları → MySQL**: yeni veritabanı + kullanıcı oluştur (şifreyi not al).
**phpMyAdmin** → veritabanını seç → **SQL** → `api/schema.sql` içeriğini çalıştır.
Sonra `api/config.php` içinde:
```
define('DB_HOST','localhost');
define('DB_NAME','uXXXXXX_zoom');   // Hostinger'ın verdiği ad
define('DB_USER','uXXXXXX_zoom');
define('DB_PASS','veritabanı_şifresi');
```

## 4. mPDF kur (Arapça PDF için)
hPanel → **Gelişmiş → PHP Yapılandırması**: `mbstring` ve `gd` açık olsun.
hPanel → **Gelişmiş → Composer** (veya SSH) ile public_html'de:
```
composer require mpdf/mpdf
```
Doğrula: `https://alanadiniz.com/api/check.php` → "mPDF kurulu: EVET ✓".

## 5. E-posta (müşteriye PDF)
hPanel → **E-postalar** → alan adınla bir kutu aç (örn: `noreply@alanadiniz.com`).
`api/config.php` içinde `MAIL_FROM` = bu adres olsun.

## 6. PHP limitleri
hPanel → **PHP Yapılandırması → Seçenekler**:
- `memory_limit = 256M`
- `post_max_size = 64M`
- `upload_max_filesize = 64M`
- `max_execution_time = 120`

## 7. Güvenlik — son kontrol
- `https://alanadiniz.com/api/check.php` her şey ✓ olmalı.
- `https://alanadiniz.com/contracts/` açmayı dene → **erişim engellenmeli** (403). PDF'ler korumalı demektir.
- Uygulamaya gir → **Ayarlar → Giriş Bilgileri**'nden kullanıcı adı ve şifreyi **değiştir**
  (varsayılan ayoup / zoom2026* ile kalma).

## 8. Telefonda uygulama gibi
Safari'de siteyi aç → Paylaş → **Ana Ekrana Ekle**. Tam ekran, uygulama gibi açılır.

---
### Sorun giderme
- PDF Arapçası bozuk / telefon-bilgisayar farklı → mPDF kurulu değildir (adım 4, check.php).
- Sözleşme listede görünmüyor → DB bağlı değil (adım 3, check.php "Veritabanı").
- Kamera açılmıyor → SSL/HTTPS yok (adım 2).
- Kayıt "veri çok büyük" → PHP limitleri (adım 6).
