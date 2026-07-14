<?php
require __DIR__.'/config.php';
json_headers();
echo json_encode(['auth'=>is_logged_in()]);
