<?php
require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// Lógica de token...
$authHeader = null; if (isset($_SERVER['Authorization'])) { $authHeader = $_SERVER['Authorization']; } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { $authHeader = $_SERVER['HTTP_AUTHORIZATION']; } if (!$authHeader) { http_response_code(401); die(json_encode(["message"=>"Encabezado no encontrado."]));} $arr = explode(" ", $authHeader); $jwt = $arr[1] ?? '';

$data = json_decode(file_get_contents("php://input"));
if (!isset($data->taskId) || !isset($data->fieldId) || !isset($data->newOptionId)) {
    http_response_code(400); die(json_encode(["message" => "taskId, fieldId y newOptionId son requeridos."]));
}

try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    
    $taskId = $data->taskId;
    $fieldId = $data->fieldId;
    $newOptionId = $data->newOptionId;
    $newValue = $data->newValue ?? null; // El texto de la nueva opción

    // Actualizamos o insertamos el valor del campo de estado
    $stmt = $conn->prepare(
        "INSERT INTO task_custom_field_values (id, taskId, fieldId, value, optionId) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE value = VALUES(value), optionId = VALUES(optionId)"
    );
    $value_id = uniqid('cfv_');
    $stmt->bind_param("sssss", $value_id, $taskId, $fieldId, $newValue, $newOptionId);
    
    if ($stmt->execute()) {
        http_response_code(200);
        echo json_encode(["message" => "Estado de la tarea actualizado.", "success" => true]);
    } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al actualizar el estado."]);
    }
    $stmt->close();
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(["message" => "Token inválido.", "error" => $e->getMessage()]);
}
$conn->close();
?>