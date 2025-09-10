<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require 'db.php';

// Este endpoint no necesita validación de token tan estricta si las tareas son visibles por miembros del workspace.
// Se puede añadir lógica de permisos si es necesario.

$taskId = $_GET['taskId'] ?? '';
if (!$taskId) {
    http_response_code(400); die(json_encode(["message" => "taskId es requerido."]));
}

try {
    $stmt = $conn->prepare("
        SELECT c.id, c.content, c.createdAt, u.id as userId, u.name as userName 
        FROM task_comments c
        JOIN users u ON c.userId = u.id
        WHERE c.taskId = ?
        ORDER BY c.createdAt ASC
    ");
    $stmt->bind_param("s", $taskId);
    $stmt->execute();
    $result = $stmt->get_result();
    $comments = $result->fetch_all(MYSQLI_ASSOC);
    
    http_response_code(200);
    echo json_encode($comments);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["message" => "Error al obtener los comentarios.", "error" => $e->getMessage()]);
}
$conn->close();
?>