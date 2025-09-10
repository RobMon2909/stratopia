<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// Lógica de token
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!$authHeader) { http_response_code(401); die(json_encode(["message" => "Token no encontrado"])); }
$arr = explode(" ", $authHeader);
$jwt = $arr[1] ?? '';

try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $user_id = $decoded->data->id;

    // Marcamos todas las notificaciones no leídas del usuario como leídas
    $stmt = $conn->prepare("UPDATE notifications SET isRead = 1 WHERE userId = ? AND isRead = 0");
    $stmt->bind_param("s", $user_id);
    
    if ($stmt->execute()) {
        http_response_code(200);
        echo json_encode(["message" => "Notificaciones marcadas como leídas.", "success" => true]);
    } else {
        throw new Exception("No se pudieron actualizar las notificaciones.");
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["message" => "Error procesando la petición.", "error" => $e->getMessage()]);
}
$conn->close();
?>