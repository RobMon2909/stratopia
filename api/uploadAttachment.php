<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// Lógica de token...
$authHeader = null; if (isset($_SERVER['Authorization'])) { $authHeader = $_SERVER['Authorization']; } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { $authHeader = $_SERVER['HTTP_AUTHORIZATION']; } if (!$authHeader) { http_response_code(401); die(json_encode(["message"=>"Encabezado no encontrado."]));} $arr = explode(" ", $authHeader); $jwt = $arr[1] ?? '';

try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $user_id = $decoded->data->id;

    // --- Validación de la Petición ---
    if (!isset($_POST['taskId']) || !isset($_FILES['file'])) {
        http_response_code(400); die(json_encode(["message" => "taskId y un archivo son requeridos."]));
    }
    $taskId = $_POST['taskId'];
    $file = $_FILES['file'];

    // --- Validación del Archivo ---
    if ($file['error'] !== UPLOAD_ERR_OK) {
        http_response_code(500); die(json_encode(["message" => "Error durante la subida del archivo."]));
    }
    $maxFileSize = 5 * 1024 * 1024; // 5 MB
    if ($file['size'] > $maxFileSize) {
        http_response_code(400); die(json_encode(["message" => "El archivo es demasiado grande (Máx 5MB)."]));
    }

    // --- Procesamiento y Guardado ---
    $uploadDir = 'uploads/';
    $originalName = basename($file["name"]);
    $fileExtension = pathinfo($originalName, PATHINFO_EXTENSION);
    $uniqueName = uniqid() . '-' . time() . '.' . $fileExtension;
    $targetPath = $uploadDir . $uniqueName;

    if (move_uploaded_file($file["tmp_name"], $targetPath)) {
        // El archivo se movió, ahora guardamos el registro en la DB
        $attachment_id = uniqid('att_');
        $stmt = $conn->prepare("INSERT INTO attachments (id, taskId, userId, fileName, filePath, fileType, fileSize) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssssssi", $attachment_id, $taskId, $user_id, $originalName, $targetPath, $file['type'], $file['size']);
        
        if ($stmt->execute()) {
            http_response_code(201);
            $newAttachment = ["id" => $attachment_id, "fileName" => $originalName, "filePath" => $targetPath];
            echo json_encode(["message" => "Archivo subido.", "success" => true, "attachment" => $newAttachment]);
        } else {
            // Si falla la DB, borramos el archivo subido para no dejar basura
            unlink($targetPath);
            http_response_code(500);
            echo json_encode(["message" => "No se pudo guardar el registro del archivo."]);
        }
    } else {
        http_response_code(500);
        echo json_encode(["message" => "No se pudo mover el archivo subido."]);
    }

} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(["message" => "Token inválido.", "error" => $e->getMessage()]);
}
$conn->close();
?>