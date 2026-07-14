<?php
/* Şirket bilgileri + değerler + araç listesi + sahip imzasını saklar/okur. Giriş gerekir. */
require __DIR__.'/config.php';
json_headers();
require_login();

if (!is_dir(STORE_DIR)) { @mkdir(STORE_DIR,0775,true); }
$ht=STORE_DIR.'/.htaccess';
if (!file_exists($ht)) @file_put_contents($ht,"Require all denied\nDeny from all\n");

if ($_SERVER['REQUEST_METHOD']==='POST') {
  $in=json_decode(file_get_contents('php://input'),true);
  if(!is_array($in)){ echo json_encode(['ok'=>false,'error'=>'Geçersiz veri']); exit; }
  $cars=[];
  if(!empty($in['cars']) && is_array($in['cars'])){
    foreach($in['cars'] as $c){ if(!is_array($c)) continue;
      $cars[]=[ 'plaka'=>substr(trim($c['plaka']??''),0,20),
                'model'=>substr(trim($c['model']??''),0,80),
                'yil'=>substr(trim($c['yil']??''),0,8) ];
      if(count($cars)>=200) break;
    }
  }
  $clean=[
    'ad'=>substr(trim($in['ad']??''),0,120),
    'unvan'=>substr(trim($in['unvan']??''),0,120),
    'adres'=>substr(trim($in['adres']??''),0,250),
    'tel'=>substr(trim($in['tel']??''),0,40),
    'email'=>substr(trim($in['email']??''),0,120),
    'vergi'=>substr(trim($in['vergi']??''),0,40),
    'dailyKm'=>substr(trim($in['dailyKm']??''),0,10),
    'excess'=>substr(trim($in['excess']??''),0,10),
    'court'=>substr(trim($in['court']??''),0,60),
    'yer'=>substr(trim($in['yer']??''),0,60),
    'ownerSig'=>(isset($in['ownerSig'])&&strpos($in['ownerSig'],'data:image')===0)?$in['ownerSig']:'',
    'ownerSigRatio'=>isset($in['ownerSigRatio'])?(float)$in['ownerSigRatio']:0,
    'logo'=>(isset($in['logo'])&&strpos($in['logo'],'data:image')===0)?$in['logo']:'',
    'cars'=>$cars
  ];
  $ok=@file_put_contents(SETTINGS_FILE,json_encode($clean,JSON_UNESCAPED_UNICODE))!==false;
  echo json_encode(['ok'=>$ok]); exit;
}

$settings=null;
if (is_file(SETTINGS_FILE)) { $settings=json_decode(file_get_contents(SETTINGS_FILE),true); }
echo json_encode(['ok'=>true,'settings'=>$settings], JSON_UNESCAPED_UNICODE);
