<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// Lógica de token para verificar que el usuario está logueado
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

    if ($blockingTaskId === $waitingTaskId) {
        http_response_code(400); die(json_encode(["message" => "Una tarea no puede depender de sí misma."]));
    }

    $stmt = $conn->prepare("INSERT INTO task_dependencies (blockingTaskId, waitingTaskId) VALUES (?, ?)");
    $stmt->bind_param("ss", $blockingTaskId, $waitingTaskId);

    if ($stmt->execute()) {
        http_response_code(201);
        echo json_encode(["message" => "Dependencia creada.", "success" => true]);
    } else {
        throw new Exception("No se pudo crear la dependencia. Es posible que ya exista.");
    }
    $stmt->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["message" => "Error al crear la dependencia.", "error" => $e->getMessage()]);
}
$conn->close();
?>