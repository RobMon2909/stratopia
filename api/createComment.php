<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// Lógica de token para obtener el userId
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
    
    $comment_id = uniqid('comment_');
    $taskId = $data->taskId;
    $content = $data->content; // Aquí recibiremos el HTML del editor

    // NOTA: En una aplicación real, deberías sanitizar el HTML aquí para prevenir ataques XSS.
    // Librerías como HTML Purifier son excelentes para esto.
    
    $stmt = $conn->prepare("INSERT INTO task_comments (id, taskId, userId, content) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("ssss", $comment_id, $taskId, $user_id, $content);
    
    if ($stmt->execute()) {
        // Devolvemos el comentario recién creado junto con la información del usuario
        $stmt_get = $conn->prepare("
            SELECT c.*, u.name as userName 
            FROM task_comments c 
            JOIN users u ON c.userId = u.id 
            WHERE c.id = ?
        ");
        $stmt_get->bind_param("s", $comment_id);
        $stmt_get->execute();
        $newComment = $stmt_get->get_result()->fetch_assoc();
        $stmt_get->close();

        http_response_code(201);
        echo json_encode(["message" => "Comentario creado.", "success" => true, "comment" => $newComment]);
    } else {
        throw new Exception("No se pudo guardar el comentario.");
    }
    $stmt->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["message" => "Error al crear el comentario.", "error" => $e->getMessage()]);
}
$conn->close();
?>