# Zoom Rental Contract & Signature App

A mobile-first rental-contract application for preparing, signing, generating, storing, and managing car-rental agreements. It is designed for installation on PHP/MySQL shared hosting and can be added to a phone's home screen as a lightweight web app.

The application supports Turkish/Arabic contract content, touch signatures, driver-document capture, server-side PDF generation, cloud contract history, and protected administrative settings.

## Main workflow

1. Sign in to the application.
2. Select or enter the vehicle plate, model, and year.
3. Capture/upload the customer's driving licence and verify extracted fields.
4. Complete contact, rental date/time, mileage, delivery, and return details.
5. Preview the generated rental agreement.
6. Capture the customer's touch signature.
7. Combine it with the saved lessor/owner signature.
8. Generate and download a PDF.
9. Store the PDF and contract record on the server.
10. Optionally email the finished agreement to the customer.

## Features

- Responsive single-page contract wizard
- Installable web-app manifest
- Customer and vehicle detail capture
- Driving-licence image/OCR-oriented input flow
- Touch signature pads for contract parties
- Saved company profile and owner signature
- Configurable rental terms, mileage, fees, court, and location
- Contract preview before signing
- Server-side PDF generation with mPDF
- Arabic shaping and RTL PDF output
- MySQL-backed contract history
- Contract editing and PDF regeneration
- Invoice-status tracking
- Individual PDF download
- Date-range ZIP export
- Contract deletion
- Protected API session and changeable credentials
- Offline/local fallback for limited browser-only use

## Technology

- HTML5, CSS, and vanilla JavaScript
- PHP 7.4+
- MySQL / MariaDB through PDO
- mPDF through Composer
- Apache `.htaccess`
- Browser canvas, camera/file input, localStorage, and PWA manifest

## Requirements

- PHP 7.4 or newer
- MySQL or MariaDB
- PHP extensions: `pdo_mysql`, `mbstring`, `gd`, `zip`
- Composer for mPDF
- Apache-compatible hosting
- HTTPS for camera access and production security
- Recommended PHP memory limit: 256 MB

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/stardust07a/zoom-contract-signature.git
cd zoom-contract-signature
```

### 2. Configure the database

Copy the safe template:

```bash
cp api/db_config.example.php api/db_config.php
```

Set the real database host, name, user, password, mail sender, and bootstrap login values in `api/db_config.php`. The live file is ignored by Git.

### 3. Create the schema

Create a MySQL database and execute [`api/schema.sql`](api/schema.sql) using phpMyAdmin or the MySQL client.

### 4. Install PDF support

```bash
composer require mpdf/mpdf
```

The application searches for Composer's autoloader in both the project root and `api/vendor/`.

### 5. Serve through PHP/Apache

For local UI/API testing:

```bash
php -S localhost:8000
```

Open `http://localhost:8000`. For camera behavior, protected directories, and rewrite/security rules, test with HTTPS under Apache/XAMPP or the final hosting provider.

## Hostinger deployment

1. Upload the project to `public_html`, including both `.htaccess` files.
2. Enable SSL before testing mobile camera features.
3. Create the MySQL database and import `api/schema.sql`.
4. Create `api/db_config.php` from the example and enter production secrets.
5. Install `mpdf/mpdf` with Hostinger Composer or SSH.
6. Enable `mbstring`, `gd`, and `zip`.
7. Set `memory_limit=256M`, `post_max_size=64M`, `upload_max_filesize=64M`, and `max_execution_time=120` when large document images are expected.
8. Open `/api/check.php` and verify every environment check.
9. Confirm `/contracts/` returns 403 when accessed directly.
10. Change the bootstrap username/password in application settings.

Detailed Turkish guides are provided in [`KURULUM.md`](KURULUM.md), [`HOSTINGER_TASIMA.md`](HOSTINGER_TASIMA.md), and [`MPDF_KURULUM.md`](MPDF_KURULUM.md).

## API overview

| Endpoint | Purpose |
| --- | --- |
| `api/login.php`, `logout.php`, `me.php` | Session authentication |
| `api/change_credentials.php` | Change the application login |
| `api/settings.php` | Read/write company and contract settings |
| `api/save_contract.php` | Store a contract and PDF |
| `api/generate_pdf.php` | Generate the server-side PDF |
| `api/list_contracts.php` | List saved agreements |
| `api/get_contract.php` | Read one agreement for editing |
| `api/update_contract.php` | Update data and regenerate the PDF |
| `api/mark_invoice.php` | Update invoice status |
| `api/download.php` | Authenticated PDF download |
| `api/download_zip.php` | Export a date range as ZIP |
| `api/delete_contract.php` | Delete a record and its PDF |
| `api/check.php` | Deployment diagnostics |

## Project structure

```text
├── api/
│   ├── config.php             # Shared configuration, session, DB, and helpers
│   ├── db_config.example.php  # Safe production configuration template
│   ├── schema.sql             # Contract database schema
│   └── *.php                  # Auth, settings, CRUD, PDF, and export endpoints
├── assets/logo.svg
├── contracts/                 # Generated private PDFs/settings; ignored by Git
├── app.js                     # Wizard, signatures, local fallback, and API client
├── index.html                 # Application shell and forms
└── manifest.json              # Home-screen installation metadata
```

## Security and privacy

Rental agreements can contain identity numbers, driving-licence images, addresses, signatures, email addresses, and phone numbers. Treat the deployment as a personal-data system.

- Never commit `api/db_config.php`.
- Never commit generated PDFs, `contracts/settings.json`, or `contracts/auth.json`.
- Use HTTPS and secure hosting credentials.
- Change all bootstrap credentials before processing real customers.
- Keep `contracts/.htaccess` deployed and verify direct access is blocked.
- Restrict database permissions and back up encrypted data securely.
- Define retention/deletion procedures appropriate to applicable privacy law.

## Current limitations

- OCR accuracy depends on image quality and must always be verified by the operator.
- Email uses the host's PHP mail path unless a stronger mail integration is added.
- The browser-only fallback is not a replacement for the authenticated server archive.
- There is no multi-user role/permission model or audit trail.
- There is no qualified electronic-signature provider integration.
- Contract/legal wording must be reviewed for the operating jurisdiction.
- Automated security, API, and PDF regression tests are not included.

## Author

Built by **Aziz** as a mobile contract, signature, PDF, and rental-operations web application.
