-- ZOOM Rent A Car — veritabanı tablosu
-- phpMyAdmin > (zoom veritabanını seçin) > SQL sekmesine yapıştırıp çalıştırın.
-- NOT: Daha önce eski tabloyu kurduysanız önce şu satırı çalıştırın: DROP TABLE IF EXISTS contracts;

CREATE TABLE IF NOT EXISTS contracts (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  sozlesme_no  VARCHAR(40)  NOT NULL,
  ulke         VARCHAR(60),
  ad           VARCHAR(80)  NOT NULL,
  soyad        VARCHAR(80)  NOT NULL,
  kimlik       VARCHAR(40),
  dogum        VARCHAR(12),
  baba         VARCHAR(80),
  anne         VARCHAR(80),
  telefon      VARCHAR(30),
  email        VARCHAR(120),
  plaka        VARCHAR(20),
  model        VARCHAR(80),
  alis         VARCHAR(20),
  iade         VARCHAR(20),
  tarih        VARCHAR(12),
  saat         VARCHAR(8),
  filename     VARCHAR(180) NOT NULL,
  payload      LONGTEXT,
  fatura       TINYINT      DEFAULT 0,
  created_at   DATETIME     NOT NULL,
  INDEX (created_at),
  INDEX (tarih),
  INDEX (ad), INDEX (soyad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
