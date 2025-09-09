<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// Lógica de token
$authHeader = null; 
if (isset($_SERVER['Authorization'])) { $authHeader = $_SERVER['Authorization']; } 
else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { $authHeader = $_SERVER['HTTP_AUTHORIZATION']; } 
if (!$authHeader) { http_response_code(401); die(json_encode([])); }
$arr = explode(" ", $authHeader);
$jwt = $arr[1] ?? '';

$workspaceId = $_GET['workspaceId'] ?? '';
if (!$workspaceId) {
    http_response_code(400); 
    die(json_encode(["message" => "Workspace ID es requerido."]));
}

try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $user_id = $decoded->data->id;

    // Verificamos que el usuario que pide es miembro
    $stmt_perm = $conn->prepare("SELECT userId FROM workspace_members WHERE userId = ? AND workspaceId = ?");
    $stmt_perm->bind_param("ss", $user_id, $workspaceId);
    $stmt_perm->execute();
    if ($stmt_perm->get_result()->num_rows === 0) {
        http_response_code(403); 
        die(json_encode(["message" => "Acceso denegado."]));
    }
    $stmt_perm->close();
    
    // Obtenemos todos los miembros de ese workspace
    $stmt = $conn->prepare("
        SELECT u.id, u.name 
        FROM users u 
        JOIN workspace_members wm ON u.id = wm.userId 
        WHERE wm.workspaceId = ?
        ORDER BY u.name ASC
    ");
    $stmt->bind_param("s", $workspaceId);
    $stmt->execute();
    $result = $stmt->get_result();
    $members = $result->fetch_all(MYSQLI_ASSOC);

    http_response_code(200);
    echo json_encode($members);
    
} catch (Exception $e) { 
    http_response_code(500); 
    echo json_encode(["message" => "Error en el servidor.", "error" => $e->getMessage()]); 
}

$conn->close();
?>