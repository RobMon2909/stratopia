<?php
require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// Lógica de token y permisos de Admin (copiar de getUsers.php)
$authHeader = null; if (isset($_SERVER['Authorization'])) { $authHeader = $_SERVER['Authorization']; } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { $authHeader = $_SERVER['HTTP_AUTHORIZATION']; } if (!$authHeader) { http_response_code(401); die(json_encode(["message"=>"Encabezado no encontrado."]));} $arr = explode(" ", $authHeader); $jwt = $arr[1] ?? '';
try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $admin_id = $decoded->data->id;
    $stmt_role = $conn->prepare("SELECT role FROM users WHERE id = ?"); $stmt_role->bind_param("s", $admin_id); $stmt_role->execute(); $result_role = $stmt_role->get_result()->fetch_assoc();
    if (!$result_role || $result_role['role'] !== 'ADMIN') { http_response_code(403); die(json_encode(["message" => "Acceso denegado. Solo para administradores."]));}
} catch (Exception $e) { http_response_code(401); die(json_encode(["message" => "Token inválido."]));}

// Obtener los datos para la actualización
$data = json_decode(file_get_contents("php://input"));
if (!isset($data->userId) || !isset($data->role)) {
    http_response_code(400);
    die(json_encode(["message" => "Se requiere userId y role."]));
}

$userIdToUpdate = $data->userId;
$newRole = $data->role;
$validRoles = ['ADMIN', 'MEMBER', 'VIEWER'];

if (!in_array($newRole, $validRoles)) {
    http_response_code(400);
    die(json_encode(["message" => "Rol inválido."]));
}

// Medida de seguridad: un admin no puede quitarse el rol a sí mismo
if ($userIdToUpdate === $admin_id) {
    http_response_code(403);
    die(json_encode(["message" => "No puedes cambiar tu propio rol."]));
}

$stmt = $conn->prepare("UPDATE users SET role = ? WHERE id = ?");
$stmt->bind_param("ss", $newRole, $userIdToUpdate);

if ($stmt->execute()) {
    http_response_code(200);
    echo json_encode(["message" => "Rol de usuario actualizado exitosamente.", "success" => true]);
} else {
    http_response_code(500);
    echo json_encode(["message" => "Error al actualizar el rol."]);
}
$stmt->close();
$conn->close();
?>