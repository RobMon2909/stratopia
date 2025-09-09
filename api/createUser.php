<?php
require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// 1. Verificar que el que hace la petición es un ADMIN
$authHeader = null; if (isset($_SERVER['Authorization'])) { $authHeader = $_SERVER['Authorization']; } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { $authHeader = $_SERVER['HTTP_AUTHORIZATION']; } if (!$authHeader) { http_response_code(401); die(json_encode(["message"=>"Encabezado no encontrado."]));} $arr = explode(" ", $authHeader); $jwt = $arr[1] ?? '';
try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $admin_id = $decoded->data->id;
    $stmt_role = $conn->prepare("SELECT role FROM users WHERE id = ?"); $stmt_role->bind_param("s", $admin_id); $stmt_role->execute(); $result_role = $stmt_role->get_result()->fetch_assoc();
    if (!$result_role || $result_role['role'] !== 'ADMIN') { http_response_code(403); die(json_encode(["message" => "Acceso denegado. Solo para administradores."]));}
} catch (Exception $e) { http_response_code(401); die(json_encode(["message" => "Token inválido."]));}

// 2. Obtener y validar los datos del nuevo usuario
$data = json_decode(file_get_contents("php://input"));
if (!isset($data->name) || !isset($data->email) || !isset($data->password) || !isset($data->role)) {
    http_response_code(400); die(json_encode(["message" => "Nombre, email, contraseña y rol son requeridos."]));
}
if (strlen($data->password) < 6) {
    http_response_code(400); die(json_encode(["message" => "La contraseña debe tener al menos 6 caracteres."]));
}
$email = $data->email;
$stmt_check = $conn->prepare("SELECT id FROM users WHERE email = ?"); $stmt_check->bind_param("s", $email); $stmt_check->execute();
if ($stmt_check->get_result()->num_rows > 0) {
    http_response_code(409); die(json_encode(["message" => "El email ya está en uso."]));
}
$stmt_check->close();

// 3. Crear el nuevo usuario
$user_id = uniqid('user_');

// --- LÍNEA CRÍTICA DE CORRECCIÓN ---
// Nos aseguramos de encriptar la contraseña ANTES de guardarla.
$hashed_password = password_hash($data->password, PASSWORD_BCRYPT);

$stmt = $conn->prepare("INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)");
// Y nos aseguramos de pasar la variable encriptada ($hashed_password) a la base de datos.
$stmt->bind_param("sssss", $user_id, $data->name, $data->email, $hashed_password, $data->role);

if ($stmt->execute()) {
    http_response_code(201);
    $newUser = ["id" => $user_id, "name" => $data->name, "email" => $data->email, "role" => $data->role, "createdAt" => date('Y-m-d H:i:s')];
    echo json_encode(["message" => "Usuario creado exitosamente.", "success" => true, "user" => $newUser]);
} else {
    http_response_code(500);
    echo json_encode(["message" => "Error al crear el usuario."]);
}
$stmt->close();
$conn->close();
?>