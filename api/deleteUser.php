<?php
require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// Lógica de token y permisos de Admin (idéntica a la de arriba)
$authHeader = null; if (isset($_SERVER['Authorization'])) { $authHeader = $_SERVER['Authorization']; } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { $authHeader = $_SERVER['HTTP_AUTHORIZATION']; } if (!$authHeader) { http_response_code(401); die(json_encode(["message"=>"Encabezado no encontrado."]));} $arr = explode(" ", $authHeader); $jwt = $arr[1] ?? '';
try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $admin_id = $decoded->data->id;
    $stmt_role = $conn->prepare("SELECT role FROM users WHERE id = ?"); $stmt_role->bind_param("s", $admin_id); $stmt_role->execute(); $result_role = $stmt_role->get_result()->fetch_assoc();
    if (!$result_role || $result_role['role'] !== 'ADMIN') { http_response_code(403); die(json_encode(["message" => "Acceso denegado. Solo para administradores."]));}
} catch (Exception $e) { http_response_code(401); die(json_encode(["message" => "Token inválido."]));}

$data = json_decode(file_get_contents("php://input"));
if (!isset($data->userId)) {
    http_response_code(400);
    die(json_encode(["message" => "Se requiere userId."]));
}
$userIdToDelete = $data->userId;

if ($userIdToDelete === $admin_id) {
    http_response_code(403);
    die(json_encode(["message" => "No puedes eliminar tu propia cuenta."]));
}

$stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
$stmt->bind_param("s", $userIdToDelete);

if ($stmt->execute()) {
    http_response_code(200);
    echo json_encode(["message" => "Usuario eliminado exitosamente.", "success" => true]);
} else {
    http_response_code(500);
    echo json_encode(["message" => "Error al eliminar el usuario."]);
}
$stmt->close();
$conn->close();
?>