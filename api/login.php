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

// --- LA CORRECCIÓN ESTÁ AQUÍ ---
// Ahora también seleccionamos el 'role' del usuario desde el principio.
$stmt = $conn->prepare("SELECT id, name, email, password, role FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 1) {
    $user = $result->fetch_assoc();

    if (password_verify($password, $user['password'])) {
        $issuer_claim = "http://localhost";
        $audience_claim = "http://localhost";
        $issuedat_claim = time();
        $notbefore_claim = $issuedat_claim;
        $expire_claim = $issuedat_claim + (3600 * 24 * 30); // 30 días

        $token = array(
            "iss" => $issuer_claim,
            "aud" => $audience_claim,
            "iat" => $issuedat_claim,
            "nbf" => $notbefore_claim,
            "exp" => $expire_claim,
            "data" => array(
                "id" => $user['id'],
                "email" => $user['email'],
                "role" => $user['role'] // Esta línea ahora funcionará sin errores.
            )
        );

        $jwt = JWT::encode($token, $jwt_secret_key, 'HS256');

        http_response_code(200);
        echo json_encode([
            "message" => "Login successful.",
            "success" => true,
            "token" => $jwt,
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