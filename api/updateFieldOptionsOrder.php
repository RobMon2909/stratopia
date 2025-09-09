<?php
require 'db.php';
// ... (Lógica de token y permisos de Admin)
$data = json_decode(file_get_contents("php://input"));
if (!isset($data->optionIds) || !is_array($data->optionIds)) {
    http_response_code(400); die(json_encode(["message" => "Se requiere un array de optionIds."]));
}

$conn->begin_transaction();
try {
    $stmt = $conn->prepare("UPDATE custom_field_options SET sortOrder = ? WHERE id = ?");
    foreach ($data->optionIds as $index => $optionId) {
        $stmt->bind_param("is", $index, $optionId);
        $stmt->execute();
    }
    $conn->commit();
    http_response_code(200);
    echo json_encode(["message" => "Orden actualizado.", "success" => true]);
} catch(Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(["message" => "Error al actualizar el orden.", "error" => $e->getMessage()]);
}
$conn->close();
?>