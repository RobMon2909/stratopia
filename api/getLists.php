<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// --- Autenticación y Autorización ---
$authHeader = null; 
if (isset($_SERVER['Authorization'])) { $authHeader = $_SERVER['Authorization']; } 
else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { $authHeader = $_SERVER['HTTP_AUTHORIZATION']; } 
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

    // --- CORRECCIÓN DE PERMISOS: Solo verificamos que sea miembro, no admin. ---
    $stmt_perm = $conn->prepare("SELECT userId FROM workspace_members WHERE userId = ? AND workspaceId = ?");
    $stmt_perm->bind_param("ss", $user_id, $workspaceId);
    $stmt_perm->execute();
    if ($stmt_perm->get_result()->num_rows === 0) {
        http_response_code(403); die(json_encode(["message" => "Acceso denegado. No eres miembro de este espacio."]));
    }
    $stmt_perm->close();

    // 2. Obtener las listas del workspace
    $stmt_lists = $conn->prepare("SELECT id, name, createdAt FROM lists WHERE workspaceId = ? ORDER BY createdAt ASC");
    $stmt_lists->bind_param("s", $workspaceId);
    $stmt_lists->execute();
    $result_lists = $stmt_lists->get_result();
    $lists = $result_lists->fetch_all(MYSQLI_ASSOC);
    $stmt_lists->close();

    // 3. Para cada lista, obtener sus tareas con datos enriquecidos
    foreach ($lists as $list_key => $list) {
        $stmt_tasks = $conn->prepare("SELECT * FROM tasks WHERE listId = ? ORDER BY createdAt ASC");
        $stmt_tasks->bind_param("s", $list['id']);
        $stmt_tasks->execute();
        $tasks = $stmt_tasks->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt_tasks->close();

        if (!empty($tasks)) {
            foreach ($tasks as $task_key => $task) {
                // --- LÓGICA CORREGIDA PARA ASIGNADOS MÚLTIPLES ---
                $stmt_assignees = $conn->prepare("SELECT u.id, u.name FROM users u JOIN task_assignees ta ON u.id = ta.userId WHERE ta.taskId = ?");
                $stmt_assignees->bind_param("s", $task['id']);
                $stmt_assignees->execute();
                $assignees = $stmt_assignees->get_result()->fetch_all(MYSQLI_ASSOC);
                $tasks[$task_key]['assignees'] = $assignees;
                $stmt_assignees->close();
                
                // (Lógica de campos personalizados)
                $stmt_cfv = $conn->prepare("SELECT cfv.fieldId, cfv.value, cfv.id as valueId, cfv.optionId, cf.type FROM task_custom_field_values cfv JOIN custom_fields cf ON cfv.fieldId = cf.id WHERE cfv.taskId = ?");
                $stmt_cfv->bind_param("s", $task['id']);
                $stmt_cfv->execute();
                $result_cfv = $stmt_cfv->get_result();
                $custom_fields_values = [];
                while($cfv_row = $result_cfv->fetch_assoc()) {
                    $fieldId = $cfv_row['fieldId'];
                    $custom_fields_values[$fieldId] = [ "value" => $cfv_row['value'], "valueId" => $cfv_row['valueId'], "optionId" => $cfv_row['optionId'] ];
                    if ($cfv_row['type'] === 'labels' && !empty($cfv_row['value'])) { $custom_fields_values[$fieldId]['optionIds'] = explode(',', $cfv_row['value']); }
                }
                $tasks[$task_key]['customFields'] = $custom_fields_values;
                $stmt_cfv->close();
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