<?php
require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

$jwt_secret_key = "UNA_CLAVE_SECRETA_PARA_STRATOPIA";

// Lógica mejorada para obtener el token que funciona con .htaccess
$authHeader = null;
if (isset($_SERVER['Authorization'])) {
    $authHeader = $_SERVER['Authorization'];
} else if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
}

if (!$authHeader) {
    http_response_code(401);
    die(json_encode(["message" => "Acceso denegado. Encabezado de autorización no encontrado."]));
}

$arr = explode(" ", $authHeader);
$jwt = $arr[1] ?? '';

// Obtener los datos de la petición
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->name) || empty(trim($data->name))) {
    http_response_code(400);
    die(json_encode(["message" => "El nombre del espacio de trabajo es requerido."]));
}

try {
    $decoded = JWT::decode($jwt, new Key($jwt_secret_key, 'HS256'));
    $user_id = $decoded->data->id;
    
    // --- CORRECCIÓN CLAVE #1: Obtener el rol desde la base de datos ---
    // Es más seguro volver a verificar el rol del usuario desde la DB que confiar ciegamente en el token.
    $stmt_role = $conn->prepare("SELECT role FROM users WHERE id = ?");
    $stmt_role->bind_param("s", $user_id);
    $stmt_role->execute();
    $result_role = $stmt_role->get_result();
    if ($result_role->num_rows === 0) {
        http_response_code(404);
        die(json_encode(["message" => "Usuario no encontrado."]));
    }
    $user = $result_role->fetch_assoc();
    $user_role = $user['role'];

    // --- LÓGICA DE ROLES ---
    if ($user_role !== 'ADMIN') {
        http_response_code(403); // Forbidden
        die(json_encode(["message" => "Acceso denegado. Solo los administradores pueden crear espacios."]));
    }

    $workspace_id = uniqid('ws_');
    $workspace_name = trim($data->name);

    // Usaremos una transacción para asegurar que ambas inserciones funcionen o ninguna lo haga.
    $conn->begin_transaction();

    // 1. Insertar el nuevo workspace
    $stmt_ws = $conn->prepare("INSERT INTO workspaces (id, userId, name) VALUES (?, ?, ?)");
    $stmt_ws->bind_param("sss", $workspace_id, $user_id, $workspace_name);
    
    // 2. Añadir al admin como miembro
    $stmt_member = $conn->prepare("INSERT INTO workspace_members (workspaceId, userId) VALUES (?, ?)");
    $stmt_member->bind_param("ss", $workspace_id, $user_id);
    
    // --- CORRECCIÓN CLAVE #2: Ejecutar ambas consultas ---
    if ($stmt_ws->execute() && $stmt_member->execute()) {
        // Si ambas tuvieron éxito, confirmamos la transacción
        $conn->commit();
        http_response_code(201); // 201 Created
        echo json_encode([
            "message" => "Workspace creado exitosamente.",
            "success" => true,
            // Devolvemos el workspace completo para que React lo pueda añadir al estado.
            "workspace" => ["id" => $workspace_id, "name" => $workspace_name, "createdAt" => date('Y-m-d H:i:s')]
        ]);
    } else {
        // Si algo falló, revertimos la transacción
        $conn->rollback();
        http_response_code(500);
        echo json_encode(["message" => "Error en la base de datos al crear el espacio."]);
    }

    $stmt_ws->close();
    $stmt_member->close();
    $stmt_role->close();

} catch (Exception $e) {
    // Si hay un error, asegúrate de hacer rollback también
    if ($conn->inTransaction) {
        $conn->rollback();
    }
    http_response_code(401);
    echo json_encode(["message" => "Acceso denegado. Token inválido.", "error" => $e->getMessage()]);
}

$conn->close();
?>