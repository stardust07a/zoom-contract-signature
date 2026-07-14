# mPDF Kurulumu — Arapça'nın PDF'te kusursuz çıkması için

Artık PDF, telefonun tarayıcısında değil **sunucuda (PHP + mPDF)** üretiliyor.
Böylece Arapça harfler doğru birleşir, sağdan sola dizilir ve **her cihazda birebir aynı** çıkar.
Bunun için sunucuya bir kez **mPDF** kütüphanesini kurman gerekiyor.

> Not: mPDF kurulu değilse site yine çalışır; o durumda eski (telefonda Arapçası
> bozuk) yöntem yedek olarak devreye girer. Yani kurulum yapınca Arapça düzelir.

---

## A) XAMPP (kendi bilgisayarında test için)

XAMPP'ta Composer gerekir. Yoksa:

1. Composer'ı indir/kur: https://getcomposer.org/Composer-Setup.exe (Windows). Kurulumda PHP yolu olarak `C:\xampp\php\php.exe` seçili olsun.
2. **Komut İstemi (cmd)** aç ve site klasörüne gir:
   ```
   cd C:\xampp\htdocs\zoom-site
   composer require mpdf/mpdf
   ```
3. Bu, `zoom-site\vendor\` klasörünü oluşturur. (generate_pdf.php bunu otomatik bulur.)
4. `C:\xampp\php\php.ini` içinde şu satırların başındaki `;` kaldırılmış (açık) olmalı:
   ```
   extension=mbstring
   extension=gd
   ```
   Değiştirdiysen XAMPP'tan Apache'yi yeniden başlat.

Test: telefondan/bilgisayardan yeni sözleşme oluştur → PDF artık Arapça düzgün gelir.

---

## B) Hostinger (canlı site)

İki yol var:

**Yol 1 — hPanel Composer aracı (en kolay):**
1. hPanel → **Gelişmiş → PHP Yapılandırması**: `mbstring` ve `gd` eklentilerinin açık olduğundan emin ol.
2. hPanel → **Gelişmiş → Composer** (veya "PHP Composer") aracını aç.
3. Site dizininde (public_html) şu paketi ekle: `mpdf/mpdf`  → Kur.
   - Çalıştırılacak komut: `composer require mpdf/mpdf`

**Yol 2 — SSH ile:**
```
cd ~/public_html         # veya zoom-site'ın bulunduğu klasör
composer require mpdf/mpdf
```

Kurulum bitince `public_html/vendor/` oluşur ve PDF üretimi otomatik sunucuya geçer.

---

## Gereksinimler
- PHP 7.4+ (Hostinger ve güncel XAMPP uygun)
- PHP eklentileri: **mbstring**, **gd** (genelde açık)
- Yeterli bellek: `php.ini` içinde `memory_limit = 256M` önerilir (büyük/fotoğraflı sözleşmeler için).

## Sık sorun
- "mPDF kurulu değil" uyarısı → `vendor/` oluşmamış; composer komutunu site kök klasöründe çalıştır.
- Boş/hatalı PDF → `php.ini`'de `memory_limit`'i 256M yap, `post_max_size`/`upload_max_filesize` 64M olsun.
