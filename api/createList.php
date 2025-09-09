<?php
require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// Lógica para obtener el token (la misma que en los otros archivos)
$authHeader = null;
if (isset($_SERVER['Authorization'])) {
    $authHeader = $_SERVER['Authorization'];
} else if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
}
if (!$authHeader) {
    http_response_code(401);
    die(json_encode(["message" => "Encabezado de autorización no encontrado."]));
}
$arr = explode(" ", $authHeader);
$jwt = $arr[1] ?? '';

// Obtener los datos de la petición (nombre de lista y workspaceId)
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->name) || empty(trim($data->name)) || !isset($data->workspaceId)) {
    http_response_code(400);
    die(json_encode(["message" => "El nombre de la lista y el ID del espacio son requeridos."]));
}

try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $user_id = $decoded->data->id;
    $workspaceId = $data->workspaceId;
    $listName = trim($data->name);

    // --- LÓGICA DE PERMISOS ---
    // 1. Verificamos que el usuario es miembro de este workspace.
    $stmt_perm = $conn->prepare("SELECT users.role FROM workspace_members JOIN users ON workspace_members.userId = users.id WHERE workspace_members.userId = ? AND workspace_members.workspaceId = ?");
    $stmt_perm->bind_param("ss", $user_id, $workspaceId);
    $stmt_perm->execute();
    $result_perm = $stmt_perm->get_result();
    if ($result_perm->num_rows === 0) {
        http_response_code(403); // Forbidden
        die(json_encode(["message" => "Acceso denegado. No eres miembro de este espacio."]));
    }

    // 2. Verificamos que el rol no sea 'VIEWER' (Observador).
    $user = $result_perm->fetch_assoc();
    if ($user['role'] === 'VIEWER') {
        http_response_code(403);
        die(json_encode(["message" => "Los observadores no pueden crear listas."]));
    }

    // --- LÓGICA DE CREACIÓN ---
    $list_id = uniqid('list_');
    $stmt = $conn->prepare("INSERT INTO lists (id, workspaceId, name) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $list_id, $workspaceId, $listName);

    if ($stmt->execute()) {
        http_response_code(201);
        echo json_encode([
            "message" => "Lista creada exitosamente.",
            "success" => true,
            // Devolvemos la lista completa para que React la pueda añadir al estado
            "list" => ["id" => $list_id, "name" => $listName, "tasks" => []]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(["message" => "Error en la base de datos al crear la lista."]);
    }

    $stmt->close();
    $stmt_perm->close();

} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(["message" => "Token inválido.", "error" => $e->getMessage()]);
}

$conn->close();
?>