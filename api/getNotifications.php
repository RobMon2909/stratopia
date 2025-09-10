<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// Lógica de token
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!$authHeader) { http_response_code(401); die(json_encode([])); }
$arr = explode(" ", $authHeader);
$jwt = $arr[1] ?? '';

try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $user_id = $decoded->data->id;

    // Obtenemos las notificaciones y las enriquecemos con los nombres del actor y la tarea
    $stmt = $conn->prepare("
        SELECT 
            n.id, n.actionType, n.entityId, n.isRead, n.createdAt,
            actor.name as actorName,
            task.title as taskTitle
        FROM notifications n
        LEFT JOIN users actor ON n.actorId = actor.id
        LEFT JOIN tasks task ON n.entityId = task.id
        WHERE n.userId = ?
        ORDER BY n.createdAt DESC
        LIMIT 20
    ");
    $stmt->bind_param("s", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $notifications = $result->fetch_all(MYSQLI_ASSOC);

    http_response_code(200);
    echo json_encode($notifications);

} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(["message" => "Token inválido."]);
}
$conn->close();
?>