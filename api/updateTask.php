<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

/**
 * ======================================================================
 * FUNCIÓN AUXILIAR PARA OBTENER UNA TAREA COMPLETA CON TODOS SUS DATOS
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
    $task['assignees'] = $stmt_assignees->get_result()->fetch_all(MYSQLI_ASSOC);
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
    
    // Obtener dependencias
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
    $taskId = $data->taskId;
    
    $conn->begin_transaction();

    $stmt_get = $conn->prepare("SELECT * FROM tasks WHERE id = ?");
    $stmt_get->bind_param("s", $taskId); $stmt_get->execute();
    $existingTask = $stmt_get->get_result()->fetch_assoc();
    $stmt_get->close();
    if (!$existingTask) { throw new Exception("Tarea no encontrada."); }
    
    // Actualizar campos básicos si se proporcionan
    if (isset($data->title) || isset($data->description) || isset($data->dueDate) || isset($data->priority)) {
        $title = $data->title ?? $existingTask['title'];
        $description = $data->description ?? $existingTask['description'];
        $dueDate = $data->dueDate ?? $existingTask['dueDate'];
        $priority = $data->priority ?? $existingTask['priority'];
        $stmt_update = $conn->prepare("UPDATE tasks SET title = ?, description = ?, dueDate = ?, priority = ? WHERE id = ?");
        $stmt_update->bind_param("sssss", $title, $description, $dueDate, $priority, $taskId);
        $stmt_update->execute();
        $stmt_update->close();
    }
    
    // Actualizar asignados si se proporcionan
    if (isset($data->assigneeIds) && is_array($data->assigneeIds)) {
        // ... (Aquí iría la lógica de notificaciones de asignación que ya tienes)
        $stmt_del_assignees = $conn->prepare("DELETE FROM task_assignees WHERE taskId = ?");
        $stmt_del_assignees->bind_param("s", $taskId); $stmt_del_assignees->execute(); $stmt_del_assignees->close();
        if(!empty($data->assigneeIds)) {
            $stmt_add_assignees = $conn->prepare("INSERT INTO task_assignees (taskId, userId) VALUES (?, ?)");
            foreach ($data->assigneeIds as $assigneeId) { $stmt_add_assignees->bind_param("ss", $taskId, $assigneeId); $stmt_add_assignees->execute(); }
            $stmt_add_assignees->close();
        }
    }
    
    // Actualizar campos personalizados y ejecutar automatización
    if (isset($data->customFields) && is_array($data->customFields)) {
        // Actualizar los valores en la base de datos
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

        // LÓGICA DE AUTOMATIZACIÓN
    $supervisorId = 'user_68bc64d232975'; // <-- REEMPLAZA con el ID real de tu usuario supervisor
    $statusFieldId = 'field_68bf47ab3dd2c'; // <-- REEMPLAZA con el ID real de tu campo "Estado"
    $doneOptionId = 'opt_68bf47dee4725';  // <-- REEMPLAZA con el ID real de tu opción "Hecho"

    // 2. Busca si el cambio de estado a "Hecho" ocurrió en esta actualización
    $wasMovedToDone = false;
        foreach ($data->customFields as $field) {
            if (isset($field->fieldId) && $field->fieldId === $statusFieldId && isset($field->optionId) && $field->optionId === $doneOptionId) {
                $wasMovedToDone = true;
                break;
            }
        }

        if ($wasMovedToDone) {
            $stmt_del = $conn->prepare("DELETE FROM task_assignees WHERE taskId = ?");
            $stmt_del->bind_param("s", $taskId);
            $stmt_del->execute();
            $stmt_del->close();
            
            $stmt_assign = $conn->prepare("INSERT INTO task_assignees (taskId, userId) VALUES (?, ?)");
            $stmt_assign->bind_param("ss", $taskId, $supervisorId);
            $stmt_assign->execute();
            $stmt_assign->close();
        }
    }
    
    // --- PUNTO CRÍTICO: GUARDAMOS LOS CAMBIOS EN LA BASE DE DATOS ---
    $conn->commit();

    // --- NOTIFICACIÓN WEBSOCKET (MÉTODO HTTP INTERNO, SIN DEPENDENCIAS) ---
    try {
        $payload = json_encode([
            "event" => "task_updated",
            "taskId" => $taskId,
            "updatedBy" => $user_id
        ]);
        $options = [
            'http' => [
                'header'  => "Content-type: application/json\r\n",
                'method'  => 'POST',
                'content' => $payload,
                'ignore_errors' => true
            ]
        ];
        $context = stream_context_create($options);
        // Usamos el puerto 8082, donde escucha nuestro servidor interno
        file_get_contents('http://127.0.0.1:8082/broadcast', false, $context);
    } catch (Exception $e) {
        error_log("Could not send notification to internal WebSocket server: " . $e->getMessage());
    }
    
    // --- Devolver la tarea actualizada completa ---
    $updatedTask = getTaskById($conn, $taskId);
    http_response_code(200);
    echo json_encode(["message" => "Tarea actualizada.", "success" => true, "task" => $updatedTask]);

} catch (Exception $e) {
    if ($conn->ping()) { $conn->rollback(); }
    http_response_code(500);
    echo json_encode(["message" => "Error al actualizar la tarea.", "error" => $e->getMessage()]);
}
$conn->close();
?>