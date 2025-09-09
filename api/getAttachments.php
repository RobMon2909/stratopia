<?php
require 'db.php'; // Incluye la conexión y los headers
// ... (Lógica de token - puedes copiarla de cualquier otro endpoint)
// ...
$taskId = $_GET['taskId'] ?? '';
if (!$taskId) {
    http_response_code(400); die(json_encode(["message" => "Se requiere taskId."]));
}
$stmt = $conn->prepare("SELECT id, fileName, filePath FROM attachments WHERE taskId = ?");
$stmt->bind_param("s", $taskId);
$stmt->execute();
$result = $stmt->get_result();
$attachments = $result->fetch_all(MYSQLI_ASSOC);
http_response_code(200);
echo json_encode($attachments);
$conn->close();
?>