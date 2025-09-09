<?php
// --- LÍNEAS DE DEPURACIÓN ---
// Frozamos a PHP a mostrar cualquier error que esté ocurriendo.
error_reporting(E_ALL);
ini_set('display_errors', 1);
// --------------------------------

require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// Lógica de token y permisos de Admin (verificamos que quien pide es un Admin)
$authHeader = null; 
if (isset($_SERVER['Authorization'])) { $authHeader = $_SERVER['Authorization']; } 
else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { $authHeader = $_SERVER['HTTP_AUTHORIZATION']; } 

if (!$authHeader) { 
    http_response_code(401); 
    die(json_encode(["message"=>"Encabezado de autorización no encontrado."]));
}
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

// Obtenemos el ID del workspace de la URL
$workspaceId = $_GET['workspaceId'] ?? '';
if (!$workspaceId) {
    http_response_code(400); 
    die(json_encode(["message" => "Se requiere workspaceId."]));
}

// Preparamos y ejecutamos la consulta para obtener los campos personalizados
$stmt = $conn->prepare("SELECT id, name, type FROM custom_fields WHERE workspaceId = ? ORDER BY name ASC");
if ($stmt === false) {
    http_response_code(500);
    die(json_encode(["message" => "Error al preparar la consulta.", "error" => $conn->error]));
}

$stmt->bind_param("s", $workspaceId);

if (!$stmt->execute()) {
    http_response_code(500);
    die(json_encode(["message" => "Error al ejecutar la consulta.", "error" => $stmt->error]));
}

$result = $stmt->get_result();
$fields = $result->fetch_all(MYSQLI_ASSOC);

http_response_code(200);
echo json_encode($fields);

$stmt->close();
$conn->close();
?>