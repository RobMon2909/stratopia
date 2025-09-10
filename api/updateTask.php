<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

/*
 * ======================================================================
 * FUNCIÓN AUXILIAR PARA OBTENER UNA TAREA COMPLETA
 * ======================================================================
 */
function getTaskById($conn, $taskId) {
    // Obtener datos base de la tarea
    $stmt = $conn->prepare("SELECT * FROM tasks WHERE id = ?");
    $stmt->bind_param("s", $taskId);
    $stmt->execute();
    $task = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$task) {
        return null;
    }

    // Obtener asignados
    $stmt_assignees = $conn->prepare("SELECT u.id, u.name FROM task_assignees ta JOIN users u ON ta.userId = u.id WHERE ta.taskId = ?");
    $stmt_assignees->bind_param("s", $taskId);
    $stmt_assignees->execute();
    $assignees_result = $stmt_assignees->get_result();
    $task['assignees'] = $assignees_result->fetch_all(MYSQLI_ASSOC);
    $stmt_assignees->close();

    // Obtener campos personalizados
    $stmt_fields = $conn->prepare(
        "SELECT cf.id as fieldId, cf.name as fieldName, cf.type as fieldType, 
                v.id as valueId, v.value, v.optionId
         FROM task_custom_field_values v 
         JOIN custom_fields cf ON v.fieldId = cf.id 
         WHERE v.taskId = ?"
    );
    $stmt_fields->bind_param("s", $taskId);
    $stmt_fields->execute();
    $fields_result = $stmt_fields->get_result();
    $task['customFields'] = [];
    while ($row = $fields_result->fetch_assoc()) {
        $task['customFields'][$row['fieldId']] = $row;
    }
    $stmt_fields->close();

    return $task;
}


// --- Lógica de token ---
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!$authHeader) { http_response_code(401); die(json_encode(["message"=>"Encabezado no encontrado."]));}
$arr = explode(" ", $authHeader);
$jwt = $arr[1] ?? '';

$data = json_decode(file_get_contents("php://input"));
if (!isset($data->taskId)) { http_response_code(400); die(json_encode(["message" => "ID de la tarea es requerido."])); }

try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $user_id = $decoded->data->id;
    $user_role = $decoded->data->role;

    if ($user_role === 'VIEWER') {
        http_response_code(403);
        die(json_encode(["message" => "Acción no permitida. Los observadores solo pueden ver."]));
    }
    
    $taskId = $data->taskId;
    
    $conn->begin_transaction();

    $stmt_get = $conn->prepare("SELECT * FROM tasks WHERE id = ?");
    $stmt_get->bind_param("s", $taskId); $stmt_get->execute();
    $existingTask = $stmt_get->get_result()->fetch_assoc();
    $stmt_get->close();
    if (!$existingTask) { throw new Exception("Tarea no encontrada."); }
    
    // Actualizar campos básicos
    $title = $data->title ?? $existingTask['title'];
    $description = $data->description ?? $existingTask['description'];
    $dueDate = $data->dueDate ?? $existingTask['dueDate'];
    $priority = $data->priority ?? $existingTask['priority'];
    $stmt_update = $conn->prepare("UPDATE tasks SET title = ?, description = ?, dueDate = ?, priority = ? WHERE id = ?");
    $stmt_update->bind_param("sssss", $title, $description, $dueDate, $priority, $taskId);
    $stmt_update->execute();
    $stmt_update->close();
    
    // Actualizar asignados
    if (isset($data->assigneeIds) && is_array($data->assigneeIds)) {
        $stmt_del_assignees = $conn->prepare("DELETE FROM task_assignees WHERE taskId = ?");
        $stmt_del_assignees->bind_param("s", $taskId); $stmt_del_assignees->execute(); $stmt_del_assignees->close();
        if(!empty($data->assigneeIds)) {
            $stmt_add_assignees = $conn->prepare("INSERT INTO task_assignees (taskId, userId) VALUES (?, ?)");
            foreach ($data->assigneeIds as $userId) { $stmt_add_assignees->bind_param("ss", $taskId, $userId); $stmt_add_assignees->execute(); }
            $stmt_add_assignees->close();
        }
    }
    
    // Actualizar campos personalizados
    if (isset($data->customFields) && is_array($data->customFields)) {
        $stmt_upsert_field = $conn->prepare(
            "INSERT INTO task_custom_field_values (id, taskId, fieldId, value, optionId) VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE value = VALUES(value), optionId = VALUES(optionId)"
        );
        foreach ($data->customFields as $field) {
            $valueId = $field->valueId ?? uniqid('cfv_');
            $value = $field->value ?? null;
            $optionId = $field->optionId ?? null;
            $stmt_upsert_field->bind_param("sssss", $valueId, $taskId, $field->fieldId, $value, $optionId);
            $stmt_upsert_field->execute();
        }
        $stmt_upsert_field->close();
    }
    
    $conn->commit();
    
    // Devolver la tarea actualizada completa
    $updatedTask = getTaskById($conn, $taskId);

    http_response_code(200);
    echo json_encode(["message" => "Tarea actualizada.", "success" => true, "task" => $updatedTask]);

} catch (Exception $e) {
    if ($conn->ping()) {
        $conn->rollback();
    }
    http_response_code(500);
    echo json_encode(["message" => "Error al actualizar la tarea.", "error" => $e->getMessage()]);
}
$conn->close();
?>