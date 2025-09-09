<?php
require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// Lógica de token y permisos de Admin...
$authHeader = null; if (isset($_SERVER['Authorization'])) { $authHeader = $_SERVER['Authorization']; } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { $authHeader = $_SERVER['HTTP_AUTHORIZATION']; } if (!$authHeader) { http_response_code(401); die(json_encode(["message"=>"Encabezado no encontrado."]));} $arr = explode(" ", $authHeader); $jwt = $arr[1] ?? ''; try { $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256')); $admin_id = $decoded->data->id; $stmt_role = $conn->prepare("SELECT role FROM users WHERE id = ?"); $stmt_role->bind_param("s", $admin_id); $stmt_role->execute(); $result_role = $stmt_role->get_result()->fetch_assoc(); if (!$result_role || $result_role['role'] !== 'ADMIN') { http_response_code(403); die(json_encode(["message" => "Acceso denegado."]));}} catch (Exception $e) { http_response_code(401); die(json_encode(["message" => "Token inválido."]));}

$data = json_decode(file_get_contents("php://input"));
if (!isset($data->fieldId) || !isset($data->value) || !isset($data->color)) {
    http_response_code(400); die(json_encode(["message" => "fieldId, value y color son requeridos."]));
}

$option_id = uniqid('opt_');
$stmt = $conn->prepare("INSERT INTO custom_field_options (id, fieldId, value, color) VALUES (?, ?, ?, ?)");
$stmt->bind_param("ssss", $option_id, $data->fieldId, $data->value, $data->color);

if ($stmt->execute()) {
    http_response_code(201);
    $newOption = ["id" => $option_id, "value" => $data->value, "color" => $data->color];
    echo json_encode(["message" => "Opción creada.", "success" => true, "option" => $newOption]);
} else {
    http_response_code(500);
    echo json_encode(["message" => "Error al crear la opción."]);
}
$stmt->close();
$conn->close();
?>