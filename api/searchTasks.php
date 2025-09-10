<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// --- FUNCIÓN AUXILIAR REUTILIZADA ---
// Incluimos la misma función que usamos en updateTask.php para obtener todos los detalles de una tarea.
// Esto asegura que la estructura de datos sea consistente en toda la aplicación.
function getTaskById($conn, $taskId) {
    $stmt = $conn->prepare("SELECT * FROM tasks WHERE id = ?");
    $stmt->bind_param("s", $taskId);
    $stmt->execute();
    $task = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$task) return null;

    $stmt_assignees = $conn->prepare("SELECT u.id, u.name FROM task_assignees ta JOIN users u ON ta.userId = u.id WHERE ta.taskId = ?");
    $stmt_assignees->bind_param("s", $taskId);
    $stmt_assignees->execute();
    $task['assignees'] = $stmt_assignees->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt_assignees->close();

    $stmt_fields = $conn->prepare("SELECT cf.id as fieldId, v.id as valueId, v.value, v.optionId FROM task_custom_field_values v JOIN custom_fields cf ON v.fieldId = cf.id WHERE v.taskId = ?");
    $stmt_fields->bind_param("s", $taskId);
    $stmt_fields->execute();
    $fields_result = $stmt_fields->get_result();
    $task['customFields'] = [];
    while ($row = $fields_result->fetch_assoc()) {
        $task['customFields'][$row['fieldId']] = $row;
    }
    $stmt_fields->close();
    
    // Añadimos dependencias
    $stmt_blocking = $conn->prepare("SELECT t.id, t.title FROM tasks t JOIN task_dependencies d ON t.id = d.waitingTaskId WHERE d.blockingTaskId = ?");
    $stmt_blocking->bind_param("s", $taskId); $stmt_blocking->execute();
    $task['blocking'] = $stmt_blocking->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt_blocking->close();
    
    $stmt_waiting = $conn->prepare("SELECT t.id, t.title FROM tasks t JOIN task_dependencies d ON t.id = d.blockingTaskId WHERE d.waitingTaskId = ?");
    $stmt_waiting->bind_param("s", $taskId); $stmt_waiting->execute();
    $task['waitingFor'] = $stmt_waiting->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt_waiting->close();

    return $task;
}

// --- Lógica Principal del Endpoint ---
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!$authHeader) { http_response_code(401); die(json_encode(["message"=>"Encabezado no encontrado."]));}
$arr = explode(" ", $authHeader);
$jwt = $arr[1] ?? '';

$workspaceId = $_GET['workspaceId'] ?? '';
$searchTerm = $_GET['searchTerm'] ?? '';

if (!$workspaceId) {
    http_response_code(400); die(json_encode(["message" => "Workspace ID es requerido."]));
}

try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $user_id = $decoded->data->id;

    // Verificamos permisos (sin cambios)
    $stmt_perm = $conn->prepare("SELECT userId FROM workspace_members WHERE userId = ? AND workspaceId = ?");
    $stmt_perm->bind_param("ss", $user_id, $workspaceId);
    $stmt_perm->execute();
    if ($stmt_perm->get_result()->num_rows === 0) {
        http_response_code(403); die(json_encode(["message" => "Acceso denegado a este espacio."]));
    }
    $stmt_perm->close();
    
    if (empty(trim($searchTerm))) {
        http_response_code(200);
        echo json_encode([]);
        exit();
    }

    $likeTerm = "%" . $searchTerm . "%";

    // --- LÓGICA DE BÚSQUEDA CORREGIDA ---
    // 1. Buscamos solo los IDs de las tareas que coincidan
    $stmt = $conn->prepare("
        SELECT DISTINCT t.id 
        FROM tasks t
        JOIN lists l ON t.listId = l.id
        WHERE l.workspaceId = ? AND t.title LIKE ?
    ");
    $stmt->bind_param("ss", $workspaceId, $likeTerm);
    $stmt->execute();
    $result = $stmt->get_result();
    $task_ids = [];
    while ($row = $result->fetch_assoc()) {
        $task_ids[] = $row['id'];
    }
    $stmt->close();

    // 2. Para cada ID encontrado, obtenemos el objeto completo y enriquecido de la tarea
    $tasks = [];
    if (!empty($task_ids)) {
        foreach ($task_ids as $taskId) {
            $task_data = getTaskById($conn, $taskId);
            if ($task_data) {
                $tasks[] = $task_data;
            }
        }
    }

    http_response_code(200);
    echo json_encode($tasks);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["message" => "Error procesando la búsqueda.", "error" => $e->getMessage()]);
}

$conn->close();
?>