<?php
require 'db.php';
require_once '../vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
// ... (manejo de CORS y obtención del token para conseguir el $user_id)

$data = json_decode(file_get_contents("php://input"));

if (!$user_id || !$data) {
    http_response_code(400); die(json_encode(["message" => "Datos inválidos."]));
}

try {
    $preferencesJson = json_encode($data);
    $stmt = $conn->prepare("UPDATE users SET tablePreferences = ? WHERE id = ?");
    $stmt->bind_param("ss", $preferencesJson, $user_id);
    
    if ($stmt->execute()) {
        http_response_code(200);
        echo json_encode(["success" => true]);
    } else {
        throw new Exception("No se pudo guardar en la base de datos.");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
$conn->close();
?>