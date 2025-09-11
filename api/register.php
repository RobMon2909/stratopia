<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;

$jwt_secret_key = "UNA_CLAVE_SECRETA_PARA_STRATOPIA";

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->name) || !isset($data->email) || !isset($data->password)) {
    http_response_code(400);
    die(json_encode(["message" => "Name, email, and password are required.", "success" => false]));
}
if (strlen($data->password) < 6) {
    http_response_code(400);
    die(json_encode(["message" => "Password must be at least 6 characters.", "success" => false]));
}
if (!filter_var($data->email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    die(json_encode(["message" => "Invalid email format.", "success" => false]));
}

$email = $data->email;
$stmt_check = $conn->prepare("SELECT id FROM users WHERE email = ?");
$stmt_check->bind_param("s", $email);
$stmt_check->execute();
if ($stmt_check->get_result()->num_rows > 0) {
    http_response_code(409); // Conflict
    die(json_encode(["message" => "Email already exists.", "success" => false]));
}
$stmt_check->close();

$hashed_password = password_hash($data->password, PASSWORD_BCRYPT);
$user_id = uniqid('user_');
$user_role = 'MEMBER'; // Rol por defecto para nuevos registros

$stmt = $conn->prepare("INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)");
$stmt->bind_param("sssss", $user_id, $data->name, $data->email, $hashed_password, $user_role);

if ($stmt->execute()) {
    $token_payload = [
        "iss" => "http://localhost",
        "aud" => "http://localhost",
        "iat" => time(),
        "nbf" => time(),
        "exp" => time() + (3600 * 24 * 30), // Token válido por 30 días
        "data" => [
            "id" => $user_id,
            "name" => $data->name, // <-- ESTA ES LA LÍNEA CLAVE QUE FALTABA
            "email" => $data->email,
            "role" => $user_role
        ]
    ];

    $jwt = JWT::encode($token_payload, $jwt_secret_key, 'HS256');

    http_response_code(201); // 201 Created
    echo json_encode([
        "message" => "User registered successfully.",
        "success" => true,
        "token" => $jwt,
        "user" => ["id" => $user_id, "name" => $data->name, "email" => $data->email, "role" => $user_role]
    ]);
} else {
    http_response_code(500);
    echo json_encode(["message" => "Failed to register user.", "success" => false]);
}

$stmt->close();
$conn->close();
?>