<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// Lógica de token
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!$authHeader) { http_response_code(401); die(json_encode(["message"=>"Token no encontrado."]));}
$arr = explode(" ", $authHeader);
$jwt = $arr[1] ?? '';

$data = json_decode(file_get_contents("php://input"));
if (!isset($data->blockingTaskId) || !isset($data->waitingTaskId)) {
    http_response_code(400); die(json_encode(["message" => "Se requieren blockingTaskId y waitingTaskId."]));
}

try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    
    $blockingTaskId = $data->blockingTaskId;
    $waitingTaskId = $data->waitingTaskId;

    $stmt = $conn->prepare("DELETE FROM task_dependencies WHERE blockingTaskId = ? AND waitingTaskId = ?");
    $stmt->bind_param("ss", $blockingTaskId, $waitingTaskId);

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            http_response_code(200);
            echo json_encode(["message" => "Dependencia eliminada.", "success" => true]);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Dependencia no encontrada."]);
        }
    } else {
        throw new Exception("Error al eliminar la dependencia.");
    }
    $stmt->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["message" => "Error al eliminar la dependencia.", "error" => $e->getMessage()]);
}
$conn->close();
?>