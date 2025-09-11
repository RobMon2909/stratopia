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

$fieldId = $_GET['fieldId'] ?? '';
if (!$fieldId) {
    http_response_code(400); die(json_encode(["message" => "Se requiere fieldId."]));
}

try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $user_id = $decoded->data->id;

    // --- LÓGICA DE PERMISOS CORREGIDA ---
    // 1. Obtenemos el workspaceId al que pertenece el campo personalizado.
    $stmt_ws = $conn->prepare("SELECT workspaceId FROM custom_fields WHERE id = ?");
    $stmt_ws->bind_param("s", $fieldId);
    $stmt_ws->execute();
    $result_ws = $stmt_ws->get_result()->fetch_assoc();
    if (!$result_ws) {
        http_response_code(404);
        die(json_encode(["message" => "Campo personalizado no encontrado."]));
    }
    $workspaceId = $result_ws['workspaceId'];

    // 2. Verificamos si el usuario es miembro de ese workspace.
    $stmt_perm = $conn->prepare("SELECT userId FROM workspace_members WHERE userId = ? AND workspaceId = ?");
    $stmt_perm->bind_param("ss", $user_id, $workspaceId);
    $stmt_perm->execute();
    if ($stmt_perm->get_result()->num_rows === 0) {
        http_response_code(403);
        die(json_encode(["message" => "Acceso denegado. No eres miembro de este espacio de trabajo."]));
    }
    $stmt_perm->close();

    // --- Lógica para obtener las opciones (sin cambios) ---
    $stmt = $conn->prepare("SELECT id, value, color, sortOrder FROM custom_field_options WHERE fieldId = ? ORDER BY sortOrder ASC");
    $stmt->bind_param("s", $fieldId);
    $stmt->execute();
    $result = $stmt->get_result();
    $options = $result->fetch_all(MYSQLI_ASSOC);

    http_response_code(200);
    echo json_encode($options);
    $stmt->close();

} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(["message" => "Token inválido.", "error" => $e->getMessage()]);
}

$conn->close();
?>