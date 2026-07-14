<?php
require __DIR__.'/config.php';
json_headers();
$in=json_decode(file_get_contents('php://input'),true);
$u=isset($in['user'])?trim($in['user']):'';
$p=isset($in['pass'])?$in['pass']:'';
if (check_creds($u,$p)) {
  start_sess();
  $_SESSION['zoom_auth']=true;
  echo json_encode(['ok'=>true]);
} else {
  http_response_code(401);
  echo json_encode(['ok'=>false,'error'=>'Hatalı giriş']);
}
