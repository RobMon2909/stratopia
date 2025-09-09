<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// Lógica de token y autenticación
$authHeader = null; if (isset($_SERVER['Authorization'])) { $authHeader = $_SERVER['Authorization']; } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { $authHeader = $_SERVER['HTTP_AUTHORIZATION']; } if (!$authHeader) { http_response_code(401); die(json_encode(["message"=>"Encabezado no encontrado."]));} $arr = explode(" ", $authHeader); $jwt = $arr[1] ?? '';

// Obtenemos los parámetros de la URL
$workspaceId = $_GET['workspaceId'] ?? '';
$searchTerm = $_GET['searchTerm'] ?? '';

if (!$workspaceId) {
    http_response_code(400); die(json_encode(["message" => "Workspace ID es requerido."]));
}

try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $user_id = $decoded->data->id;

    // Verificamos que el usuario es miembro del workspace para poder buscar en él
    $stmt_perm = $conn->prepare("SELECT userId FROM workspace_members WHERE userId = ? AND workspaceId = ?");
    $stmt_perm->bind_param("ss", $user_id, $workspaceId);
    $stmt_perm->execute();
    if ($stmt_perm->get_result()->num_rows === 0) {
        http_response_code(403); die(json_encode(["message" => "Acceso denegado a este espacio."]));
    }
    $stmt_perm->close();
    
    // Si no hay término de búsqueda, devolvemos un array vacío
    if (empty(trim($searchTerm))) {
        http_response_code(200);
        echo json_encode([]);
        exit();
    }

    // Preparamos el término de búsqueda para la consulta LIKE
    $likeTerm = "%" . $searchTerm . "%";

    // Buscamos en todas las tareas que pertenezcan a las listas de este workspace
    $stmt = $conn->prepare("
        SELECT t.*, u.name as assigneeName 
        FROM tasks t
        JOIN lists l ON t.listId = l.id
        LEFT JOIN users u ON t.assigneeId = u.id
        WHERE l.workspaceId = ? AND (t.title LIKE ? OR t.description LIKE ?)
        ORDER BY t.createdAt DESC
    ");
    $stmt->bind_param("sss", $workspaceId, $likeTerm, $likeTerm);
    $stmt->execute();
    $tasks = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    
    // Aquí, al igual que en getLists.php, se añadiría la lógica para obtener
    // los campos personalizados de cada tarea encontrada para que la UI los muestre.
    // (Por brevedad, se omite este bucle, pero es necesario para una funcionalidad completa)

    http_response_code(200);
    echo json_encode($tasks);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["message" => "Error procesando la búsqueda.", "error" => $e->getMessage()]);
}

$conn->close();
?>