<?php
// --- LÍNEAS DE DEPURACIÓN ---
// Estas líneas fuerzan a PHP a mostrar TODOS los errores.
error_reporting(E_ALL);
ini_set('display_errors', 1);
// --------------------------------

require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// Lógica de token
$authHeader = null;
if (isset($_SERVER['Authorization'])) { $authHeader = $_SERVER['Authorization']; } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { $authHeader = $_SERVER['HTTP_AUTHORIZATION']; }
if (!$authHeader) { http_response_code(401); die(json_encode(["message"=>"Encabezado de autorización no encontrado."]));}
$arr = explode(" ", $authHeader);
$jwt = $arr[1] ?? '';

try {
    $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
    $user_id = $decoded->data->id;

    // Verificamos el rol del usuario que hace la petición en la DB
    $stmt_role = $conn->prepare("SELECT role FROM users WHERE id = ?");
    $stmt_role->bind_param("s", $user_id);
    $stmt_role->execute();
    $result_role = $stmt_role->get_result()->fetch_assoc();

    if (!$result_role || $result_role['role'] !== 'ADMIN') {
        http_response_code(403);
        die(json_encode(["message" => "Acceso denegado. Solo para administradores."]));
    }
    $stmt_role->close();

    // Obtenemos todos los usuarios y verificamos si la consulta fue exitosa
    $result = $conn->query("SELECT id, name, email, role, createdAt FROM users ORDER BY createdAt DESC");
    if ($result === false) {
        http_response_code(500);
        die(json_encode(["message" => "Error al ejecutar la consulta de usuarios.", "error" => $conn->error]));
    }

    $users = $result->fetch_all(MYSQLI_ASSOC);
    http_response_code(200);
    echo json_encode($users);

} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(["message" => "Token inválido.", "error" => $e->getMessage()]);
}

$conn->close();
?>