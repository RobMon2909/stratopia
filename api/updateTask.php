<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// Lógica de token
$authHeader = null; if (isset($_SERVER['Authorization'])) { $authHeader = $_SERVER['Authorization']; } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { $authHeader = $_SERVER['HTTP_AUTHORIZATION']; } if (!$authHeader) { http_response_code(401); die(json_encode(["message"=>"Encabezado no encontrado."]));} $arr = explode(" ", $authHeader); $jwt = $arr[1] ?? '';

$data = json_decode(file_get_contents("php://input"));
if (!isset($data->taskId)) { http_response_code(400); die(json_encode(["message" => "ID de la tarea es requerido."])); }

try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $taskId = $data->taskId;
    
    $conn->begin_transaction();
    $stmt_get = $conn->prepare("SELECT * FROM tasks WHERE id = ?");
    $stmt_get->bind_param("s", $taskId); $stmt_get->execute();
    $existingTask = $stmt_get->get_result()->fetch_assoc();
    $stmt_get->close();
    if (!$existingTask) { throw new Exception("Tarea no encontrada."); }

    $title = $data->title ?? $existingTask['title'];
    $description = $data->description ?? $existingTask['description'];
    $dueDate = $data->dueDate ?? $existingTask['dueDate'];
    
    $stmt_update = $conn->prepare("UPDATE tasks SET title = ?, description = ?, dueDate = ? WHERE id = ?");
    $stmt_update->bind_param("ssss", $title, $description, $dueDate, $taskId);
    $stmt_update->execute();
    $stmt_update->close();
    
    if (isset($data->assigneeIds) && is_array($data->assigneeIds)) {
        $stmt_del_assignees = $conn->prepare("DELETE FROM task_assignees WHERE taskId = ?");
        $stmt_del_assignees->bind_param("s", $taskId); $stmt_del_assignees->execute(); $stmt_del_assignees->close();
        if(!empty($data->assigneeIds)) {
            $stmt_add_assignees = $conn->prepare("INSERT INTO task_assignees (taskId, userId) VALUES (?, ?)");
            foreach ($data->assigneeIds as $userId) { $stmt_add_assignees->bind_param("ss", $taskId, $userId); $stmt_add_assignees->execute(); }
            $stmt_add_assignees->close();
        }
    }
    
    if (isset($data->customFields) && is_array($data->customFields)) {
        $stmt_delete_cf = $conn->prepare("DELETE FROM task_custom_field_values WHERE taskId = ?");
        $stmt_delete_cf->bind_param("s", $taskId); $stmt_delete_cf->execute(); $stmt_delete_cf->close();
        if (!empty($data->customFields)) {
            $stmt_cf = $conn->prepare("INSERT INTO task_custom_field_values (id, taskId, fieldId, value, optionId) VALUES (?, ?, ?, ?, ?)");
            foreach ($data->customFields as $cf) {
                if (!isset($cf->fieldId) || (empty($cf->value) && empty($cf->optionId) && empty($cf->optionIds))) continue;
                $value_id = uniqid('cfv_');
                $value = $cf->value ?? null;
                $optionId = $cf->optionId ?? null;
                if (isset($cf->type) && $cf->type === 'labels' && isset($cf->optionIds) && is_array($cf->optionIds)) {
                    $value = implode(',', $cf->optionIds);
                    $optionId = null;
                }
                $stmt_cf->bind_param("sssss", $value_id, $taskId, $cf->fieldId, $value, $optionId);
                $stmt_cf->execute();
            }
            $stmt_cf->close();
        }
    }
    $conn->commit();
    
    http_response_code(200);
    echo json_encode(["message" => "Tarea actualizada.", "success" => true]);
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(["message" => "Error al actualizar la tarea.", "error" => $e->getMessage()]);
}
$conn->close();
?>