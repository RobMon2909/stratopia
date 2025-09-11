<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// --- Autenticación y obtención de IDs ---
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!$authHeader) { http_response_code(401); die(json_encode(["message"=>"Encabezado de autorización no encontrado."]));}
$arr = explode(" ", $authHeader);
$jwt = $arr[1] ?? '';

$workspaceId = $_GET['workspaceId'] ?? '';
if (!$workspaceId) {
    http_response_code(400); die(json_encode(["message" => "Workspace ID es requerido."]));
}

try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $user_id = $decoded->data->id;

    // --- LÓGICA DE PERMISOS CORREGIDA ---
    // En lugar de verificar si el rol es 'ADMIN', ahora verificamos si el usuario
    // es miembro del workspace, sin importar su rol.
    // Este es el mismo código que ya funciona en getLists.php
    $stmt_perm = $conn->prepare("SELECT userId FROM workspace_members WHERE userId = ? AND workspaceId = ?");
    $stmt_perm->bind_param("ss", $user_id, $workspaceId);
    $stmt_perm->execute();
    if ($stmt_perm->get_result()->num_rows === 0) {
        http_response_code(403);
        die(json_encode(["message" => "Acceso denegado. No eres miembro de este espacio."]));
    }
    $stmt_perm->close();

    // --- Lógica para obtener los campos (sin cambios) ---
    $stmt = $conn->prepare("SELECT id, name, type FROM custom_fields WHERE workspaceId = ?");
    $stmt->bind_param("s", $workspaceId);
    $stmt->execute();
    $result = $stmt->get_result();
    $fields = $result->fetch_all(MYSQLI_ASSOC);

    http_response_code(200);
    echo json_encode($fields);

} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(["message" => "Token inválido.", "error" => $e->getMessage()]);
}

$conn->close();
?>