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

$data = json_decode(file_get_contents("php://input"));
if (!isset($data->userId) || !isset($data->workspaceIds) || !is_array($data->workspaceIds)) {
    http_response_code(400);
    die(json_encode(["message" => "Se requiere userId y un array de workspaceIds."]));
}
$userId = $data->userId;
$workspaceIds = $data->workspaceIds;

// Usamos una transacción para seguridad
$conn->begin_transaction();
try {
    // 1. Borramos todas las asignaciones existentes para este usuario
    $stmt_delete = $conn->prepare("DELETE FROM workspace_members WHERE userId = ?");
    $stmt_delete->bind_param("s", $userId);
    $stmt_delete->execute();
    $stmt_delete->close();
    
    // 2. Insertamos las nuevas asignaciones
    if (!empty($workspaceIds)) {
        $stmt_insert = $conn->prepare("INSERT INTO workspace_members (userId, workspaceId) VALUES (?, ?)");
        foreach ($workspaceIds as $workspaceId) {
            $stmt_insert->bind_param("ss", $userId, $workspaceId);
            $stmt_insert->execute();
        }
        $stmt_insert->close();
    }
    
    // Si todo salió bien, confirmamos los cambios
    $conn->commit();
    http_response_code(200);
    echo json_encode(["message" => "Asignaciones actualizadas.", "success" => true]);

} catch(Exception $e) {
    // Si algo falla, revertimos todo
    $conn->rollback();
    http_response_code(500);
    echo json_encode(["message" => "Error en la transacción.", "error" => $e->getMessage()]);
}
$conn->close();
?>