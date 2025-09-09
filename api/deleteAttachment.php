<?php
require 'db.php'; // Incluye la conexión y los headers
// ... (Lógica de token y permisos de Admin/Miembro)
// ...
$data = json_decode(file_get_contents("php://input"));
if (!isset($data->attachmentId)) {
    http_response_code(400); die(json_encode(["message" => "Se requiere attachmentId."]));
}
$attachmentId = $data->attachmentId;
// 1. Obtener la ruta del archivo antes de borrar el registro
$stmt_get = $conn->prepare("SELECT filePath FROM attachments WHERE id = ?");
$stmt_get->bind_param("s", $attachmentId);
$stmt_get->execute();
$result = $stmt_get->get_result();
$attachment = $result->fetch_assoc();
if ($attachment) {
    // 2. Borrar el registro de la DB
    $stmt_del = $conn->prepare("DELETE FROM attachments WHERE id = ?");
    $stmt_del->bind_param("s", $attachmentId);
    if ($stmt_del->execute()) {
        // 3. Si se borró de la DB, borrar el archivo físico
        if (file_exists($attachment['filePath'])) {
            unlink($attachment['filePath']);
        }
        http_response_code(200);
        echo json_encode(["message" => "Adjunto eliminado.", "success" => true]);
    } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al eliminar el registro."]);
    }
} else {
    http_response_code(404);
    echo json_encode(["message" => "Adjunto no encontrado."]);
}
$conn->close();
?>