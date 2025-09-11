<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// Lógica de token
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!$authHeader) { http_response_code(401); die(json_encode(["message"=>"Encabezado no encontrado."]));}
$arr = explode(" ", $authHeader);
$jwt = $arr[1] ?? '';

$data = json_decode(file_get_contents("php://input"));
if (!isset($data->taskId) || !isset($data->content)) {
    http_response_code(400); die(json_encode(["message" => "taskId y content son requeridos."]));
}

try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $user_id = $decoded->data->id;
    
    $taskId = $data->taskId;
    $content = $data->content;
    
    // --- INICIAMOS LA TRANSACCIÓN ---
    $conn->begin_transaction();

    // 1. Guardar el comentario principal
    $comment_id = uniqid('comment_');
    $stmt_comment = $conn->prepare("INSERT INTO task_comments (id, taskId, userId, content) VALUES (?, ?, ?, ?)");
    $stmt_comment->bind_param("ssss", $comment_id, $taskId, $user_id, $content);
    if (!$stmt_comment->execute()) {
        throw new Exception("No se pudo guardar el comentario en la base de datos.");
    }
    $stmt_comment->close();

    // 2. Procesar y guardar notificaciones de menciones
    preg_match_all('/data-id="([^"]+)"/', $content, $matches);
    $mentioned_user_ids = array_unique($matches[1]);
    
    if (!empty($mentioned_user_ids)) {
        $stmt_notif = $conn->prepare("INSERT INTO notifications (id, userId, actorId, actionType, entityId) VALUES (?, ?, ?, ?, ?)");
        $actionType = 'MENTIONED';
        foreach ($mentioned_user_ids as $mentioned_id) {
            if ($mentioned_id !== $user_id) { // No te notifiques a ti mismo
                $notif_id = uniqid('notif_');
                $stmt_notif->bind_param("sssss", $notif_id, $mentioned_id, $user_id, $actionType, $taskId);
                if (!$stmt_notif->execute()) {
                    // Si falla una notificación, lanzamos una excepción para revertir todo
                    throw new Exception("No se pudo guardar una notificación de mención.");
                }
            }
        }
        $stmt_notif->close();
    }
    
    // --- SI TODO SALIÓ BIEN, CONFIRMAMOS LOS CAMBIOS ---
    $conn->commit();

    // Devolvemos el comentario recién creado junto con la información del usuario
    $stmt_get = $conn->prepare("SELECT c.*, u.name as userName FROM task_comments c JOIN users u ON c.userId = u.id WHERE c.id = ?");
    $stmt_get->bind_param("s", $comment_id);
    $stmt_get->execute();
    $newComment = $stmt_get->get_result()->fetch_assoc();
    $stmt_get->close();

    http_response_code(201);
    echo json_encode(["message" => "Comentario creado.", "success" => true, "comment" => $newComment]);

} catch (Exception $e) {
    // --- SI ALGO FALLÓ, REVERTIMOS TODOS LOS CAMBIOS ---
    $conn->rollback();
    http_response_code(500);
    echo json_encode(["message" => "Error al crear el comentario.", "error" => $e->getMessage()]);
}
$conn->close();
?>