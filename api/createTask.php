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
if (!isset($data->title) || !isset($data->listId)) {
    http_response_code(400); die(json_encode(["message" => "Título y ID de lista son requeridos."]));
}

try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $user_id = $decoded->data->id;

    $conn->begin_transaction();
    $task_id = uniqid('task_');
    $parentId = $data->parentId ?? null;
    $title = $data->title;
    $listId = $data->listId;
    $description = $data->description ?? null;
    $dueDate = $data->dueDate ?? null;

    $stmt_task = $conn->prepare("INSERT INTO tasks (id, listId, parentId, title, description, dueDate) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt_task->bind_param("ssssss", $task_id, $listId, $parentId, $title, $description, $dueDate);
    $stmt_task->execute();
    $stmt_task->close();

    if (isset($data->assigneeIds) && is_array($data->assigneeIds)) {
        $stmt_assign = $conn->prepare("INSERT INTO task_assignees (taskId, userId) VALUES (?, ?)");
        foreach ($data->assigneeIds as $assigneeId) {
            $stmt_assign->bind_param("ss", $task_id, $assigneeId);
            $stmt_assign->execute();
        }
        $stmt_assign->close();
    }
    
    if (isset($data->customFields) && is_array($data->customFields)) {
        $stmt_cf = $conn->prepare("INSERT INTO task_custom_field_values (id, taskId, fieldId, value, optionId) VALUES (?, ?, ?, ?, ?)");
        foreach ($data->customFields as $cf) {
            if (!isset($cf->fieldId)) continue;
            $value_id = uniqid('cfv_');
            $value = $cf->value ?? null;
            $optionId = $cf->optionId ?? null;
            if (isset($cf->type) && $cf->type === 'labels' && isset($cf->optionIds) && is_array($cf->optionIds)) {
                $value = implode(',', $cf->optionIds);
                $optionId = null;
            }
            $stmt_cf->bind_param("sssss", $value_id, $task_id, $cf->fieldId, $value, $optionId);
            $stmt_cf->execute();
        }
        $stmt_cf->close();
    }
    $conn->commit();
    
    http_response_code(201);
    echo json_encode(["message" => "Tarea creada.", "success" => true]);
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(["message" => "Error al crear la tarea.", "error" => $e->getMessage()]);
}
$conn->close();
?>