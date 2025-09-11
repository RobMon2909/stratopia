<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// (La función auxiliar getTaskById no cambia)
function getTaskById($conn, $taskId) {
    $stmt = $conn->prepare("SELECT * FROM tasks WHERE id = ?");
    $stmt->bind_param("s", $taskId);
    $stmt->execute();
    $task = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$task) { return null; }

    $stmt_assignees = $conn->prepare("SELECT u.id, u.name FROM task_assignees ta JOIN users u ON ta.userId = u.id WHERE ta.taskId = ?");
    $stmt_assignees->bind_param("s", $taskId);
    $stmt_assignees->execute();
    $task['assignees'] = $stmt_assignees->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt_assignees->close();

    $stmt_fields = $conn->prepare("SELECT cf.id as fieldId, cf.name as fieldName, cf.type as fieldType, v.id as valueId, v.value, v.optionId FROM task_custom_field_values v JOIN custom_fields cf ON v.fieldId = cf.id WHERE v.taskId = ?");
    $stmt_fields->bind_param("s", $taskId);
    $stmt_fields->execute();
    $fields_result = $stmt_fields->get_result();
    $task['customFields'] = [];
    while ($row = $fields_result->fetch_assoc()) {
        if ($row['fieldType'] === 'labels' && !empty($row['optionId']) && json_decode($row['optionId']) !== null) {
            $row['optionIds'] = json_decode($row['optionId']);
            $row['optionId'] = null;
        }
        $task['customFields'][$row['fieldId']] = $row;
    }
    $stmt_fields->close();
    
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

$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!$authHeader) { http_response_code(401); die(json_encode(["message"=>"Encabezado no encontrado."]));}
$arr = explode(" ", $authHeader);
$jwt = $arr[1] ?? '';

$data = json_decode(file_get_contents("php://input"));
if (!isset($data->taskId)) { http_response_code(400); die(json_encode(["message" => "ID de la tarea es requerido."])); }

try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $user_id = $decoded->data->id;
    $userName = $decoded->data->name;
    $taskId = $data->taskId;
    
    $conn->begin_transaction();

    $stmt_get = $conn->prepare("SELECT * FROM tasks WHERE id = ?");
    $stmt_get->bind_param("s", $taskId); $stmt_get->execute();
    $existingTask = $stmt_get->get_result()->fetch_assoc();
    $stmt_get->close();
    if (!$existingTask) { throw new Exception("Tarea no encontrada."); }
    
    if (isset($data->title) || isset($data->description) || isset($data->dueDate)) {
        $title = $data->title ?? $existingTask['title'];
        $description = $data->description ?? $existingTask['description'];
        $dueDate = $data->dueDate ?? $existingTask['dueDate'];
        $stmt_update_main = $conn->prepare("UPDATE tasks SET title = ?, description = ?, dueDate = ? WHERE id = ?");
        $stmt_update_main->bind_param("ssss", $title, $description, $dueDate, $taskId);
        $stmt_update_main->execute();
        $stmt_update_main->close();
    }
    
    if (isset($data->assigneeIds) && is_array($data->assigneeIds)) {
        $stmt_get_assignees = $conn->prepare("SELECT userId FROM task_assignees WHERE taskId = ?");
        $stmt_get_assignees->bind_param("s", $taskId);
        $stmt_get_assignees->execute();
        $current_assignees_result = $stmt_get_assignees->get_result();
        $current_assignee_ids = [];
        while ($row = $current_assignees_result->fetch_assoc()) { $current_assignee_ids[] = $row['userId']; }
        $stmt_get_assignees->close();
        
        $stmt_del_assignees = $conn->prepare("DELETE FROM task_assignees WHERE taskId = ?");
        $stmt_del_assignees->bind_param("s", $taskId); 
        $stmt_del_assignees->execute(); 
        $stmt_del_assignees->close();
        
        if (!empty($data->assigneeIds)) {
            $placeholders = implode(',', array_fill(0, count($data->assigneeIds), '(?, ?)'));
            $types = str_repeat('ss', count($data->assigneeIds));
            $values = [];
            foreach ($data->assigneeIds as $assigneeId) {
                $values[] = $taskId;
                $values[] = $assigneeId;
            }
            $stmt_add_assignees = $conn->prepare("INSERT INTO task_assignees (taskId, userId) VALUES " . $placeholders);
            $stmt_add_assignees->bind_param($types, ...$values);
            $stmt_add_assignees->execute();
            $stmt_add_assignees->close();
        }

        $newly_assigned_ids = array_diff($data->assigneeIds, $current_assignee_ids);
        if (!empty($newly_assigned_ids)) {
            $stmt_notif = $conn->prepare("INSERT INTO notifications (id, userId, actorId, actionType, entityId) VALUES (?, ?, ?, ?, ?)");
            foreach ($newly_assigned_ids as $assigneeId) { 
                if ($assigneeId !== $user_id) {
                    $notif_id = uniqid('notif_');
                    $actionType = 'ASSIGNED_TASK';
                    $stmt_notif->bind_param("sssss", $notif_id, $assigneeId, $user_id, $actionType, $taskId);
                    $stmt_notif->execute();
                    
                    // Notificación por WebSocket se dispara más abajo, después del commit.
                }
            }
            $stmt_notif->close();
        }
    }
    
    if (isset($data->customFields) && is_array($data->customFields)) {
        $stmt_upsert_field = $conn->prepare(
            "INSERT INTO task_custom_field_values (id, taskId, fieldId, value, optionId) 
             VALUES (?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE value = VALUES(value), optionId = VALUES(optionId)"
        );
        
        foreach ($data->customFields as $field) {
            if (!isset($field->fieldId)) continue;
            
            $valueId = $field->valueId ?? uniqid('cfv_');
            $value = $field->value ?? null;
            $optionIdValue = null;

            if (isset($field->type) && $field->type === 'labels' && isset($field->optionIds)) {
                // Para etiquetas, codificamos el array de IDs como un string JSON.
                $optionIdValue = json_encode($field->optionIds);
            } else {
                // Para dropdowns y otros, usamos el optionId simple.
                $optionIdValue = $field->optionId ?? null;
            }

            $stmt_upsert_field->bind_param("sssss", $valueId, $taskId, $field->fieldId, $value, $optionIdValue);
            $stmt_upsert_field->execute();
        }
        $stmt_upsert_field->close();
        
        // --- LA AUTOMATIZACIÓN AHORA SE EJECUTA DESPUÉS DE GUARDAR ---
        $supervisorId = 'user_...';
        $statusFieldId = 'field_...';
        $doneOptionId = 'opt_...';
        
        $wasMovedToDone = false;
        foreach ($data->customFields as $field) {
            if (isset($field->fieldId) && $field->fieldId === $statusFieldId && isset($field->optionId) && $field->optionId === $doneOptionId) {
                $wasMovedToDone = true;
                break;
            }
        }

        if ($wasMovedToDone) {
            $stmt_del = $conn->prepare("DELETE FROM task_assignees WHERE taskId = ?");
            $stmt_del->bind_param("s", $taskId); $stmt_del->execute(); $stmt_del->close();
            
            $stmt_assign = $conn->prepare("INSERT INTO task_assignees (taskId, userId) VALUES (?, ?)");
            $stmt_assign->bind_param("ss", $taskId, $supervisorId); $stmt_assign->execute(); $stmt_assign->close();
        }
    }
    
    $conn->commit();

    // (El resto del script, con la notificación WebSocket y la respuesta, no cambia)
    try {
        $client = new \WebSocket\Client("ws://127.0.0.1:8081");
        $payload = json_encode([ "event" => "task_updated", "taskId" => $taskId, "updatedBy" => $user_id ]);
        $client->send($payload);
        $client->close();
    } catch (Exception $e) {
        error_log("Could not send generic update to WebSocket: ". $e->getMessage());
    }
    
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