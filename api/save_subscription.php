<?php
require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!$authHeader) { http_response_code(401); die(json_encode(["message"=>"Token no encontrado."]));}
$arr = explode(" ", $authHeader);
$jwt = $arr[1] ?? '';

$data = json_decode(file_get_contents("php://input"));
if (!isset($data->subscription)) {
    http_response_code(400); die(json_encode(["message" => "Subscription object is required."]));
}

try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $user_id = $decoded->data->id;
    
    $sub = $data->subscription;
    $endpoint = $sub->endpoint;
    $p256dh = $sub->keys->p256dh;
    $auth = $sub->keys->auth;
    
    // Usamos INSERT ... ON DUPLICATE KEY UPDATE para evitar duplicados
    $stmt = $conn->prepare("
        INSERT INTO push_subscriptions (userId, endpoint, p256dh, auth) 
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE p256dh = VALUES(p256dh), auth = VALUES(auth)
    ");
    $stmt->bind_param("ssss", $user_id, $endpoint, $p256dh, $auth);

    if ($stmt->execute()) {
        http_response_code(201);
        echo json_encode(["message" => "Subscription saved.", "success" => true]);
    } else {
        throw new Exception("Could not save subscription.");
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["message" => "Error saving subscription.", "error" => $e->getMessage()]);
}
$conn->close();
?>