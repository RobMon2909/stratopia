<?php
require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;

$jwt_secret_key = "UNA_CLAVE_SECRETA_PARA_STRATOPIA";
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->email) || !isset($data->password)) {
    http_response_code(400);
    die(json_encode(["message" => "Incomplete data.", "success" => false]));
}

$email = $data->email;
$password = $data->password;

$stmt = $conn->prepare("SELECT id, name, email, password, role FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 1) {
    $user = $result->fetch_assoc();
    if (password_verify($password, $user['password'])) {
        $token_payload = [
            "iss" => "http://localhost", "aud" => "http://localhost",
            "iat" => time(), "nbf" => time(),
            "exp" => time() + (3600 * 24 * 30), // 30 días
            "data" => [
                "id" => $user['id'],
                "name" => $user['name'], // <-- AÑADIMOS EL NOMBRE AQUÍ
                "email" => $user['email'],
                "role" => $user['role']
            ]
        ];
        $jwt = JWT::encode($token_payload, $jwt_secret_key, 'HS256');

        http_response_code(200);
        echo json_encode([
            "message" => "Login successful.", "success" => true, "token" => $jwt,
            "user" => ["id" => $user['id'], "name" => $user['name'], "email" => $user['email'], "role" => $user['role']]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(["message" => "Invalid credentials.", "success" => false]);
    }
} else {
    http_response_code(401);
    echo json_encode(["message" => "Invalid credentials.", "success" => false]);
}
$stmt->close();
$conn->close();
?>