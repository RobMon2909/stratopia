<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// --- Autenticación y obtención de IDs (sin cambios) ---
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!$authHeader) { http_response_code(401); die(json_encode(["message"=>"Encabezado de autorización no encontrado."]));}
$arr = explode(" ", $authHeader);
$jwt = $arr[1] ?? '';

$workspaceId = $_GET['workspaceId'] ?? '';
if (!$workspaceId) { http_response_code(400); die(json_encode(["message" => "Workspace ID es requerido."])); }

$orderByClause = "ORDER BY t.createdAt ASC";
$groupBy = $_GET['groupBy'] ?? 'default';
switch ($groupBy) {
    case 'priority': $orderByClause = "ORDER BY FIELD(t.priority, 'Urgente', 'Alta', 'Normal', 'Baja'), t.createdAt ASC"; break;
    case 'dueDate': $orderByClause = "ORDER BY t.dueDate ASC, t.createdAt ASC"; break;
}

try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $user_id = $decoded->data->id;
    
    // Verificación de permisos (sin cambios)
    $stmt_perm = $conn->prepare("SELECT userId FROM workspace_members WHERE userId = ? AND workspaceId = ?");
    $stmt_perm->bind_param("ss", $user_id, $workspaceId);
    $stmt_perm->execute();
    if ($stmt_perm->get_result()->num_rows === 0) {
        http_response_code(403); die(json_encode(["message" => "Acceso denegado. No eres miembro de este espacio."]));
    }
    $stmt_perm->close();

    // Obtener listas (sin cambios)
    $stmt_lists = $conn->prepare("SELECT id, name FROM lists WHERE workspaceId = ? ORDER BY createdAt ASC");
    $stmt_lists->bind_param("s", $workspaceId);
    $stmt_lists->execute();
    $lists = $stmt_lists->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt_lists->close();
    
    foreach ($lists as $list_key => $list) {
        $stmt_tasks = $conn->prepare("SELECT * FROM tasks t WHERE listId = ? " . $orderByClause);
        $stmt_tasks->bind_param("s", $list['id']);
        $stmt_tasks->execute();
        $tasks = $stmt_tasks->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt_tasks->close();

        if (!empty($tasks)) {
            foreach ($tasks as $task_key => $task) {
                $taskId = $task['id'];
                
                // Lógica de asignados (sin cambios)
                $stmt_assignees = $conn->prepare("SELECT u.id, u.name FROM users u JOIN task_assignees ta ON u.id = ta.userId WHERE ta.taskId = ?");
                $stmt_assignees->bind_param("s", $taskId); $stmt_assignees->execute();
                $tasks[$task_key]['assignees'] = $stmt_assignees->get_result()->fetch_all(MYSQLI_ASSOC);
                $stmt_assignees->close();
                
                // --- LÓGICA MEJORADA PARA LEER CAMPOS PERSONALIZADOS Y ETIQUETAS ---
                $stmt_cfv = $conn->prepare("SELECT cfv.fieldId, cfv.value, cfv.id as valueId, cfv.optionId, cf.type as fieldType FROM task_custom_field_values cfv JOIN custom_fields cf ON cfv.fieldId = cf.id WHERE cfv.taskId = ?");
                $stmt_cfv->bind_param("s", $taskId); $stmt_cfv->execute();
                $result_cfv = $stmt_cfv->get_result();
                $custom_fields_values = [];
                while($cfv_row = $result_cfv->fetch_assoc()) {
                    if ($cfv_row['fieldType'] === 'labels' && $cfv_row['optionId'] !== null) {
                        $decoded_ids = json_decode($cfv_row['optionId'], true);
                        $cfv_row['optionIds'] = is_array($decoded_ids) ? $decoded_ids : [];
                        $cfv_row['optionId'] = null;
                    }
                    $custom_fields_values[$cfv_row['fieldId']] = $cfv_row;
                }
                $tasks[$task_key]['customFields'] = $custom_fields_values;
                $stmt_cfv->close();
                
                // Lógica de dependencias (sin cambios)
                $stmt_blocking = $conn->prepare("SELECT t.id, t.title FROM tasks t JOIN task_dependencies d ON t.id = d.waitingTaskId WHERE d.blockingTaskId = ?");
                $stmt_blocking->bind_param("s", $taskId); $stmt_blocking->execute();
                $tasks[$task_key]['blocking'] = $stmt_blocking->get_result()->fetch_all(MYSQLI_ASSOC);
                $stmt_blocking->close();
                
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