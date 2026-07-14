<?php
/* ====== AYAR DOSYASI ======
   Hostinger'da MySQL oluşturduktan sonra aşağıdaki bilgileri doldurun.
   XAMPP'ta varsayılan: DB_USER 'root', DB_PASS '' */

/* Sunucuya özel ayarlar 'api/db_config.php' dosyasından okunur.
   O dosya ZIP güncellemeleriyle GELMEZ ve ÜZERİNE YAZILMAZ — bilgilerin kaybolmaz. */
$__dbc = __DIR__ . '/db_config.php';
if (file_exists($__dbc)) require $__dbc;

if (!defined('DB_HOST')) define('DB_HOST', 'localhost');
if (!defined('DB_NAME')) define('DB_NAME', 'zoom');
if (!defined('DB_USER')) define('DB_USER', 'root');
if (!defined('DB_PASS')) define('DB_PASS', '');
if (!defined('AUTH_USER')) define('AUTH_USER', 'ayoup');
if (!defined('AUTH_PASS')) define('AUTH_PASS', 'zoom2026*');
if (!defined('MAIL_FROM')) define('MAIL_FROM', 'noreply@zoomrentacars.com');
if (!defined('MAIL_FROM_NAME')) define('MAIL_FROM_NAME', 'ZOOM Rent A Car');

/* PDF ve ayar dosyalarının saklanacağı klasör (otomatik oluşturulur) */
define('STORE_DIR', __DIR__ . '/../contracts');
define('SETTINGS_FILE', STORE_DIR . '/settings.json');
define('AUTH_FILE', STORE_DIR . '/auth.json');

/* ---- veritabanı ---- */
function db() {
  static $pdo = null;
  if ($pdo === null) {
    $pdo = new PDO('mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset=utf8mb4',
      DB_USER, DB_PASS,
      [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
  }
  return $pdo;
}

function json_headers(){
  header('Content-Type: application/json; charset=utf-8');
  header('Access-Control-Allow-Origin: '.(isset($_SERVER['HTTP_ORIGIN'])?$_SERVER['HTTP_ORIGIN']:'*'));
  header('Access-Control-Allow-Credentials: true');
  header('Access-Control-Allow-Headers: Content-Type');
  header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
  if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){ http_response_code(204); exit; }
}

/* ---- oturum / giriş ---- */
function start_sess(){
  if (session_status() === PHP_SESSION_NONE) {
    @ini_set('session.gc_maxlifetime', 2592000); // 30 gün
    session_set_cookie_params(['lifetime'=>2592000,'path'=>'/','httponly'=>true,'samesite'=>'Lax']);
    session_start();
  }
}
function is_logged_in(){ start_sess(); return !empty($_SESSION['zoom_auth']); }
function require_login(){
  if (!is_logged_in()){ http_response_code(401); echo json_encode(['ok'=>false,'error'=>'Giriş gerekli']); exit; }
}

/* ---- kimlik bilgileri (değiştirilebilir) ---- */
function get_creds(){
  if (is_file(AUTH_FILE)) { $j=json_decode(file_get_contents(AUTH_FILE),true);
    if (is_array($j) && !empty($j['user']) && !empty($j['hash'])) return $j; }
  return ['user'=>AUTH_USER, 'hash'=>password_hash(AUTH_PASS, PASSWORD_DEFAULT)];
}
function check_creds($user,$pass){ $c=get_creds(); return hash_equals($c['user'], (string)$user) && password_verify((string)$pass, $c['hash']); }
function verify_pass($pass){ $c=get_creds(); return password_verify((string)$pass, $c['hash']); }
function save_creds($user,$pass){
  if (!is_dir(STORE_DIR)) { @mkdir(STORE_DIR,0775,true); }
  return @file_put_contents(AUTH_FILE, json_encode(['user'=>$user,'hash'=>password_hash($pass, PASSWORD_DEFAULT)])) !== false;
}
