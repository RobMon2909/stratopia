<?php
header("Content-Type: application/json; charset=UTF-8");

// --- ¡IMPORTANTE! ---
// Pega aquí la CLAVE PÚBLICA que generaste en el paso 2.
$vapid_public_key = 'BI***************************************************_A';

http_response_code(200);
echo json_encode(['publicKey' => $vapid_public_key]);
?>