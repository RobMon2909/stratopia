<?php
require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// 1. Verificar que el que hace la petición es un ADMIN (igual que arriba)
$authHeader = null; if (isset($_SERVER['Authorization'])) { $authHeader = $_SERVER['Authorization']; } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { $authHeader = $_SERVER['HTTP_AUTHORIZATION']; } if (!$authHeader) { http_response_code(401); die(json_encode(["message"=>"Encabezado no encontrado."]));} $arr = explode(" ", $authHeader); $jwt = $arr[1] ?? '';
try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $admin_id = $decoded->data->id;
    $stmt_role = $conn->prepare("SELECT role FROM users WHERE id = ?"); $stmt_role->bind_param("s", $admin_id); $stmt_role->execute(); $result_role = $stmt_role->get_result()->fetch_assoc();
    if (!$result_role || $result_role['role'] !== 'ADMIN') { http_response_code(403); die(json_encode(["message" => "Acceso denegado. Solo para administradores."]));}
} catch (Exception $e) { http_response_code(401); die(json_encode(["message" => "Token inválido."]));}

// 2. Obtener y validar datos
$data = json_decode(file_get_contents("php://input"));
if (!isset($data->id) || !isset($data->name) || !isset($data->email) || !isset($data->role)) {
    http_response_code(400); die(json_encode(["message" => "ID, Nombre, email y rol son requeridos."]));
}
$userIdToUpdate = $data->id;

// 3. Un admin no puede cambiar su propio rol para evitar bloquearse
if ($userIdToUpdate === $admin_id && $result_role['role'] !== $data->role) {
    http_response_code(403); die(json_encode(["message" => "No puedes cambiar tu propio rol."]));
}

// 4. Actualizar usuario
$stmt = $conn->prepare("UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?");
$stmt->bind_param("ssss", $data->name, $data->email, $data->role, $userIdToUpdate);

if ($stmt->execute()) {
    http_response_code(200);
    $updatedUser = ["id" => $userIdToUpdate, "name" => $data->name, "email" => $data->email, "role" => $data->role, "createdAt" => $data->createdAt]; // Reutilizamos createdAt
    echo json_encode(["message" => "Usuario actualizado.", "success" => true, "user" => $updatedUser]);
} else {
    http_response_code(500);
    echo json_encode(["message" => "Error al actualizar. El email podría ya estar en uso."]);
}
$stmt->close();
$conn->close();
?>