<?php
// api/save_subscription.php
// VERSIÓN CORREGIDA Y MÁS ROBUSTA

require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Manejar la petición OPTIONS de pre-vuelo para CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- Lógica de token MEJORADA ---
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!$authHeader) {
    http_response_code(401);
    die(json_encode(["message"=>"Token de autorización no encontrado."]));
}

$tokenParts = explode(" ", $authHeader);
if (count($tokenParts) < 2 || $tokenParts[0] !== 'Bearer') {
    http_response_code(401);
    die(json_encode(["message"=>"Formato de token inválido."]));
}
$jwt = $tokenParts[1] ?? '';

$data = json_decode(file_get_contents("php://input"));
if (!isset($data->subscription)) {
    http_response_code(400);
    die(json_encode(["message" => "El objeto de suscripción es requerido."]));
}

try {
    // Este es el bloque que generaba el error
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $user_id = $decoded->data->id;
    
    $sub = $data->subscription;
    $endpoint = $sub->endpoint;
    $p256dh = $sub->keys->p256dh;
    $auth = $sub->keys->auth;
    
    $stmt = $conn->prepare("
        INSERT INTO push_subscriptions (userId, endpoint, p256dh, auth) 
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE userId = VALUES(userId), p256dh = VALUES(p256dh), auth = VALUES(auth)
    ");
    $stmt->bind_param("ssss", $user_id, $endpoint, $p256dh, $auth);

    if ($stmt->execute()) {
        http_response_code(201);
        echo json_encode(["message" => "Suscripción guardada.", "success" => true]);
    } else {
        throw new Exception("No se pudo guardar la suscripción en la base de datos.");
    }
    $stmt->close();

} catch (Exception $e) {
    // Si el error es "Wrong number of segments", es un problema de token.
    if ($e->getMessage() === "Wrong number of segments") {
        http_response_code(401); // 401 Unauthorized
        echo json_encode(["message" => "Error al guardar la suscripción.", "error" => "El token proporcionado es inválido."]);
    } else {
        http_response_code(500); // Otro tipo de error
        echo json_encode(["message" => "Error al guardar la suscripción.", "error" => $e->getMessage()]);
    }
}
$conn->close();
?>