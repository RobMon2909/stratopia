<?php
// api/add_comment.php

error_reporting(E_ALL);
ini_set('display_errors', 1);
require 'db.php';
require 'vendor/autoload.php';
require_once 'send_notification.php'; // Reutilizamos nuestra función

use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// --- Autenticación y obtención de datos ---
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!$authHeader) { http_response_code(401); die(json_encode(["message"=>"Token no encontrado."]));}
$arr = explode(" ", $authHeader);
$jwt = $arr[1] ?? '';

$data = json_decode(file_get_contents("php://input"));
if (!isset($data->taskId) || !isset($data->commentText)) {
    http_response_code(400);
    die(json_encode(["message" => "Se requiere taskId y commentText."]));
}

try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $actorId = $decoded->data->id;
    $actorName = $decoded->data->name;
    
    $taskId = $data->taskId;
    $commentText = $data->commentText;
    $commentId = uniqid('comment_');

    // --- 1. Guardar el comentario en la base de datos ---
    // (Asumo que tienes una tabla 'comments')
    $stmt = $conn->prepare("INSERT INTO comments (id, taskId, userId, text) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("ssss", $commentId, $taskId, $actorId, $commentText);
    $stmt->execute();
    $stmt->close();

    // --- 2. Analizar menciones y enviar notificaciones PUSH ---
    // Expresión regular para encontrar todas las palabras que empiezan con @
    preg_match_all('/@(\w+)/', $commentText, $matches);
    $mentionedUsernames = $matches[1]; // $matches[1] contiene solo los nombres de usuario sin el @

    if (!empty($mentionedUsernames)) {
        // Preparamos una consulta para buscar los IDs de los usuarios mencionados
        $placeholders = implode(',', array_fill(0, count($mentionedUsernames), '?'));
        $stmt_users = $conn->prepare("SELECT id FROM users WHERE name IN ($placeholders)");
        $stmt_users->bind_param(str_repeat('s', count($mentionedUsernames)), ...$mentionedUsernames);
        $stmt_users->execute();
        $result = $stmt_users->get_result();

        // Obtenemos el título de la tarea para dar contexto en la notificación
        $stmt_task = $conn->prepare("SELECT title FROM tasks WHERE id = ?");
        $stmt_task->bind_param("s", $taskId);
        $stmt_task->execute();
        $task = $stmt_task->get_result()->fetch_assoc();
        $taskTitle = $task ? $task['title'] : 'una tarea';
        $stmt_task->close();

        while ($user = $result->fetch_assoc()) {
            $userIdToNotify = $user['id'];

            // Evitamos que un usuario se notifique a sí mismo
            if ($userIdToNotify !== $actorId) {
                // Preparamos y enviamos la notificación push
                $notificationTitle = 'Nueva Mención';
                $notificationBody = "$actorName te mencionó en un comentario en la tarea: \"$taskTitle\"";
                $notificationUrl = "/dashboard/tasks/$taskId";
                
                sendPushNotification($conn, $userIdToNotify, $notificationTitle, $notificationBody, $notificationUrl);
            }
        }
        $stmt_users->close();
    }
    
    http_response_code(201);
    echo json_encode(["message" => "Comentario añadido."]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["message" => "Error al añadir comentario.", "error" => $e->getMessage()]);
}

$conn->close();
?>