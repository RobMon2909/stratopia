<?php
require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// Lógica de token y permisos de Admin... (la misma que arriba)
$authHeader = null; if (isset($_SERVER['Authorization'])) { $authHeader = $_SERVER['Authorization']; } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { $authHeader = $_SERVER['HTTP_AUTHORIZATION']; } if (!$authHeader) { http_response_code(401); die(json_encode(["message"=>"Encabezado no encontrado."]));} $arr = explode(" ", $authHeader); $jwt = $arr[1] ?? '';
try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $admin_id = $decoded->data->id;
    $stmt_role = $conn->prepare("SELECT role FROM users WHERE id = ?"); $stmt_role->bind_param("s", $admin_id); $stmt_role->execute(); $result_role = $stmt_role->get_result()->fetch_assoc();
    if (!$result_role || $result_role['role'] !== 'ADMIN') { http_response_code(403); die(json_encode(["message" => "Acceso denegado. Solo para administradores."]));}
} catch (Exception $e) { http_response_code(401); die(json_encode(["message" => "Token inválido."]));}

// Obtenemos el userId de la URL (ej: ?userId=user_123)
$userId = $_GET['userId'] ?? '';
if (!$userId) {
    http_response_code(400); die(json_encode(["message" => "Se requiere userId."]));
}

$stmt = $conn->prepare("SELECT workspaceId FROM workspace_members WHERE userId = ?");
$stmt->bind_param("s", $userId);
$stmt->execute();
$result = $stmt->get_result();
$workspaceIds = [];
while($row = $result->fetch_assoc()) {
    $workspaceIds[] = $row['workspaceId'];
}

http_response_code(200);
echo json_encode($workspaceIds);
$stmt->close();
$conn->close();
?>