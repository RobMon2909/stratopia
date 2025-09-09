<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// Lógica de token y permisos de Admin (la misma que en los otros endpoints de admin)
$authHeader = null; 
if (isset($_SERVER['Authorization'])) { $authHeader = $_SERVER['Authorization']; } 
else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { $authHeader = $_SERVER['HTTP_AUTHORIZATION']; } 
if (!$authHeader) { http_response_code(401); die(json_encode(["message"=>"Encabezado de autorización no encontrado."])); }
$arr = explode(" ", $authHeader);
$jwt = $arr[1] ?? '';

try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $admin_id = $decoded->data->id;
    
    $stmt_role = $conn->prepare("SELECT role FROM users WHERE id = ?");
    $stmt_role->bind_param("s", $admin_id);
    $stmt_role->execute();
    $result_role = $stmt_role->get_result()->fetch_assoc();
    
    if (!$result_role || $result_role['role'] !== 'ADMIN') {
        http_response_code(403);
        die(json_encode(["message" => "Acceso denegado. Solo para administradores."]));
    }
    $stmt_role->close();

} catch (Exception $e) {
    http_response_code(401);
    die(json_encode(["message" => "Token inválido.", "error" => $e->getMessage()]));
}

// Obtener los datos para la actualización
$data = json_decode(file_get_contents("php://input"));
if (!isset($data->optionId) || !isset($data->value) || !isset($data->color)) {
    http_response_code(400);
    die(json_encode(["message" => "Se requiere optionId, value y color."]));
}

$optionId = $data->optionId;
$newValue = $data->value;
$newColor = $data->color;

$stmt = $conn->prepare("UPDATE custom_field_options SET value = ?, color = ? WHERE id = ?");
$stmt->bind_param("sss", $newValue, $newColor, $optionId);

if ($stmt->execute()) {
    http_response_code(200);
    $updatedOption = ["id" => $optionId, "value" => $newValue, "color" => $newColor];
    echo json_encode(["message" => "Opción actualizada exitosamente.", "success" => true, "option" => $updatedOption]);
} else {
    http_response_code(500);
    echo json_encode(["message" => "Error al actualizar la opción."]);
}

$stmt->close();
$conn->close();
?>