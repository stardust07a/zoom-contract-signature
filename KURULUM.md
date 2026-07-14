# ZOOM Rent A Car — Sözleşme Sitesi · Kurulum Rehberi

Bu site, müşterinin telefondan araç kiralama sözleşmesini imzalamasını sağlar.
Ehliyetten **isim / soyisim / TC** otomatik okunur, müşteri parmağıyla imzalar,
sözleşme **PDF** olur → telefona iner, **buluta (Hostinger sunucunuza) kaydedilir**
ve müşteriye **e-posta** ile gönderilir. "Sözleşmeler" sekmesinde tüm kayıtlar
tarih/saat ile listelenir.

---

## 1) Dosyalar
```
zoom-site/
├─ index.html          ← ana site
├─ app.js              ← uygulama mantığı
├─ manifest.json       ← "Ana ekrana ekle" için
├─ assets/logo.svg     ← logo (kendi PNG'nizle değiştirebilirsiniz)
└─ api/
   ├─ config.php       ← BURAYI DÜZENLEYİN (veritabanı + giriş + e-posta)
   ├─ schema.sql       ← veritabanı tablosu
   ├─ login.php / logout.php / me.php   ← güvenli giriş
   ├─ settings.php     ← şirket bilgileri + sahip imzası
   ├─ save_contract.php
   ├─ list_contracts.php
   ├─ get_contract.php   ← düzenleme için tek kayıt
   ├─ update_contract.php ← tarih/km düzenle + PDF yenile
   ├─ download_zip.php   ← tarih aralığındaki tüm PDF'leri ZIP indir
   └─ download.php
```

> **ZIP indirme:** `download_zip.php` PHP'nin **ZipArchive** eklentisini kullanır
> (Hostinger'da standarttır, açıktır). Yerelde (XAMPP) de açıktır.

> **ÖNEMLİ — güncelleme:** Daha önce veritabanı tablosunu kurduysanız, yeni
> alanlar (ülke, doğum, alış/iade, payload vb.) eklendiği için tabloyu yeniden
> kurun: phpMyAdmin > SQL sekmesinde önce `DROP TABLE IF EXISTS contracts;`
> çalıştırın, sonra `api/schema.sql` içeriğini çalıştırın.

## Giriş bilgileri (güvenlik)
Site açılınca giriş ekranı gelir. Varsayılan:
- **Kullanıcı adı:** `ayoup`
- **Şifre:** `zoom2026*`

Değiştirmek için `api/config.php` içindeki `AUTH_USER` ve `AUTH_PASS` satırlarını düzenleyin.
Sözleşmeler ve PDF'ler giriş yapılmadan görüntülenemez (sunucu tarafında korunur).

## Ayarlar sekmesi
İlk kullanımda **Ayarlar**'a girip şirket bilgilerini doldurun ve **şirket sahibinin imzasını bir kez** atıp kaydedin. Bu imza her sözleşmede otomatik olarak "KİRAYA VEREN" tarafına yerleşir.

## 2) Hostinger'da yayına alma
1. Hostinger hesabı + bir **alan adı** (domain) alın.
2. **hPanel → Dosya Yöneticisi → public_html** klasörünü açın.
3. `zoom-site` içindeki **tüm dosyaları** `public_html` içine yükleyin
   (klasör yapısını koruyun: `api/` ve `assets/` alt klasörleriyle).

## 3) Veritabanı (PDF'lerin buluta kaydı için)
1. hPanel → **Veritabanları → MySQL Veritabanları**.
2. Yeni bir veritabanı + kullanıcı oluşturun, şifreyi not alın.
3. **phpMyAdmin**'i açın → veritabanını seçin → **SQL** sekmesi →
   `api/schema.sql` içeriğini yapıştırıp **Çalıştır**.
4. `api/config.php` dosyasını açıp şu satırları kendi bilgilerinizle doldurun:
   - `DB_NAME`, `DB_USER`, `DB_PASS` (DB_HOST genelde `localhost`)

## 4) E-posta (müşteriye PDF gönderimi)
1. hPanel → **E-postalar** → alan adınızla bir e-posta oluşturun
   (örn: `noreply@alanadiniz.com`).
2. `api/config.php` içinde `MAIL_FROM` değerini bu adres yapın.
   (Spam'e düşmemesi için gönderen adresin kendi domaininiz olması önemlidir.)

## 5) Telefonda "uygulama gibi" kullanma
1. iPhone'da **Safari** ile sitenizi açın (örn: `https://alanadiniz.com`).
2. Paylaş düğmesi → **Ana Ekrana Ekle**.
3. Artık ana ekranda ZOOM simgesiyle, tam ekran bir uygulama gibi açılır.
   (Android'de Chrome → menü → "Ana ekrana ekle".)

---

## Kullanım akışı
1. **Yeni Sözleşme** → plaka + model.
2. **Ehliyet** → fotoğraf çek/galeriden seç → bilgiler otomatik dolar, kontrol et.
3. **İletişim** → telefon, e-posta, tarih ve saat.
4. **Önizleme** → sözleşmeyi göster.
5. **İmza** → telefonu müşteriye uzat, imzalasın → **Kaydet**.
6. PDF telefona iner + buluta kaydolur + müşteriye e-posta gider.
   Dosya adı: `TC_Isim_Soyisim.pdf`.

## Notlar
- **Bulut/e-posta bağlı değilken** (örn. dosyayı bilgisayarda açınca) site yine
  çalışır; PDF telefona iner ve "Sözleşmeler" listesi o cihazda tutulur. Sunucuya
  yükleyince bulut + e-posta otomatik devreye girer.
- **Logoyu değiştirme:** `assets/` klasörüne kendi logonuzu `logo.png` olarak atın,
  `index.html` ve `app.js` içindeki `assets/logo.svg` yazan yerleri `assets/logo.png`
  yapın (2 yerde).
- **Firma bilgileri / vergi no:** `app.js` en üstteki `LESSOR` bölümünden değiştirin
  (şu an vergi no örnek: 1234567890).
- **Güvenlik:** Sözleşmeler kişisel veri içerir. `contracts/` klasörü dış erişime
  kapatılır. Listeyi şifreyle korumak isterseniz söyleyin, basit bir giriş ekleyelim.
