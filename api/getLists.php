<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// --- Autenticación y Autorización (sin cambios) ---
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!$authHeader) { http_response_code(401); die(json_encode(["message"=>"Encabezado de autorización no encontrado."]));}
$arr = explode(" ", $authHeader);
$jwt = $arr[1] ?? '';

$workspaceId = $_GET['workspaceId'] ?? '';
if (!$workspaceId) {
    http_response_code(400); die(json_encode(["message" => "Workspace ID es requerido."]));
}

// --- NUEVO: Obtener el parámetro de ordenamiento ---
$orderByClause = "ORDER BY t.createdAt ASC"; // Orden por defecto
$groupBy = $_GET['groupBy'] ?? 'default';

switch ($groupBy) {
    case 'priority':
        // Ordenamos por prioridad de forma manual, ya que es texto
        $orderByClause = "ORDER BY FIELD(t.priority, 'Urgente', 'Alta', 'Normal', 'Baja'), t.createdAt ASC";
        break;
    case 'dueDate':
        $orderByClause = "ORDER BY t.dueDate ASC, t.createdAt ASC";
        break;
    // El caso 'assignee' y 'status' se manejan mejor en el frontend
}


try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $user_id = $decoded->data->id;
    
    // Verificación de permisos (sin cambios)
    $stmt_perm = $conn->prepare("SELECT userId FROM workspace_members WHERE userId = ? AND workspaceId = ?");
    $stmt_perm->bind_param("ss", $user_id, $workspaceId);
    $stmt_perm->execute();
    if ($stmt_perm->get_result()->num_rows === 0) {
        http_response_code(403); die(json_encode(["message" => "Acceso denegado."]));
    }
    $stmt_perm->close();

    // Obtener listas (sin cambios)
    $stmt_lists = $conn->prepare("SELECT id, name FROM lists WHERE workspaceId = ? ORDER BY createdAt ASC");
    $stmt_lists->bind_param("s", $workspaceId);
    $stmt_lists->execute();
    $lists = $stmt_lists->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt_lists->close();
    
    // Para cada lista, obtener sus tareas con datos enriquecidos
    foreach ($lists as $list_key => $list) {
        // --- CONSULTA DE TAREAS MODIFICADA ---
        $stmt_tasks = $conn->prepare("SELECT * FROM tasks t WHERE listId = ? " . $orderByClause);
        $stmt_tasks->bind_param("s", $list['id']);
        $stmt_tasks->execute();
        $tasks = $stmt_tasks->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt_tasks->close();

        if (!empty($tasks)) {
            foreach ($tasks as $task_key => $task) {
                $taskId = $task['id'];
                
                // Lógica de asignados y campos personalizados (sin cambios)
                $stmt_assignees = $conn->prepare("SELECT u.id, u.name FROM users u JOIN task_assignees ta ON u.id = ta.userId WHERE ta.taskId = ?");
                $stmt_assignees->bind_param("s", $taskId); $stmt_assignees->execute();
                $tasks[$task_key]['assignees'] = $stmt_assignees->get_result()->fetch_all(MYSQLI_ASSOC);
                $stmt_assignees->close();
                
                $stmt_cfv = $conn->prepare("SELECT cfv.fieldId, cfv.value, cfv.id as valueId, cfv.optionId FROM task_custom_field_values cfv WHERE cfv.taskId = ?");
                $stmt_cfv->bind_param("s", $taskId); $stmt_cfv->execute();
                $result_cfv = $stmt_cfv->get_result();
                $custom_fields_values = [];
                while($cfv_row = $result_cfv->fetch_assoc()) {
                    $custom_fields_values[$cfv_row['fieldId']] = $cfv_row;
                }
                $tasks[$task_key]['customFields'] = $custom_fields_values;
                $stmt_cfv->close();
                
                // --- NUEVO: Obtener dependencias de la tarea ---
                // Tareas que esta tarea está bloqueando
                $stmt_blocking = $conn->prepare("SELECT t.id, t.title FROM tasks t JOIN task_dependencies d ON t.id = d.waitingTaskId WHERE d.blockingTaskId = ?");
                $stmt_blocking->bind_param("s", $taskId); $stmt_blocking->execute();
                $tasks[$task_key]['blocking'] = $stmt_blocking->get_result()->fetch_all(MYSQLI_ASSOC);
                $stmt_blocking->close();
                
                // Tareas que están esperando a esta tarea
                $stmt_waiting = $conn->prepare("SELECT t.id, t.title FROM tasks t JOIN task_dependencies d ON t.id = d.blockingTaskId WHERE d.waitingTaskId = ?");
                $stmt_waiting->bind_param("s", $taskId); $stmt_waiting->execute();
                $tasks[$task_key]['waitingFor'] = $stmt_waiting->get_result()->fetch_all(MYSQLI_ASSOC);
                $stmt_waiting->close();
            }
        }
        $lists[$list_key]['tasks'] = $tasks;
    }
    
    http_response_code(200);
    echo json_encode($lists);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["message" => "Error procesando la petición.", "error" => $e->getMessage()]);
}
$conn->close();
?>