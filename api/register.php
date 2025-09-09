<?php
require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;

$jwt_secret_key = "UNA_CLAVE_SECRETA_PARA_STRATOPIA";

$data = json_decode(file_get_contents("php://input"));

// ... (todas las validaciones iniciales siguen igual)

$hashed_password = password_hash($data->password, PASSWORD_BCRYPT);
$user_id = uniqid('user_');
$user_role = 'MEMBER'; // Rol por defecto para nuevos registros

$stmt = $conn->prepare("INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)");
$stmt->bind_param("sssss", $user_id, $data->name, $data->email, $hashed_password, $user_role);

if ($stmt->execute()) {
    $token = array(
        // ... (datos del token)
        "data" => array(
            "id" => $user_id,
            "email" => $data->email,
            "role" => $user_role // Añadimos el rol al token
        )
    );

    $jwt = JWT::encode($token, $jwt_secret_key, 'HS256');

    http_response_code(201);
    echo json_encode([
        "message" => "User registered successfully.",
        "success" => true,
        "token" => $jwt,
        // --- LA CORRECCIÓN ESTÁ AQUÍ ---
        // Ahora el objeto 'user' que devolvemos también incluye el rol.
        "user" => ["id" => $user_id, "name" => $data->name, "email" => $data->email, "role" => $user_role]
    ]);
} else {
    http_response_code(500);
    echo json_encode(["message" => "Failed to register user.", "success" => false]);
}

$stmt->close();
$conn->close();
?>