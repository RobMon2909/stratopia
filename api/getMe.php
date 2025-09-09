<?php
require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;
use \Firebase\JWT\ExpiredException;
use \Firebase\JWT\SignatureInvalidException;

// Asegúrate de que esta clave sea IDÉNTICA a la de login.php
$jwt_secret_key = "UNA_CLAVE_SECRETA_PARA_STRATOPIA"; 

// Lógica mejorada para obtener el token que funciona con .htaccess
$authHeader = null;
if (isset($_SERVER['Authorization'])) {
    $authHeader = $_SERVER['Authorization'];
} else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { // Apache/PHP la pasa aquí después de la regla .htaccess
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
}

if (!$authHeader) {
    http_response_code(401);
    die(json_encode(["message" => "Acceso denegado. Encabezado de autorización no encontrado.", "code" => "NO_AUTH_HEADER"]));
}

$arr = explode(" ", $authHeader);
$jwt = $arr[1] ?? '';

if (!$jwt) {
    http_response_code(401);
    die(json_encode(["message" => "Acceso denegado. No se proporcionó token.", "code" => "NO_TOKEN"]));
}

try {
    // Intentamos decodificar el token con la sintaxis moderna (para la versión 6+ de la librería)
    $decoded = JWT::decode($jwt, new Key($jwt_secret_key, 'HS256'));
    $user_id = $decoded->data->id;

    // Buscamos al usuario en la base de datos
    $stmt = $conn->prepare("SELECT id, name, email, role FROM users WHERE id = ?");
    $stmt->bind_param("s", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        http_response_code(200);
        echo json_encode($user);
    } else {
        http_response_code(404);
        echo json_encode(["message" => "Usuario no encontrado en la base de datos.", "code" => "USER_NOT_FOUND"]);
    }
    $stmt->close();

} catch (ExpiredException $e) {
    http_response_code(401);
    echo json_encode(["message" => "Acceso denegado. El token ha expirado.", "code" => "TOKEN_EXPIRED", "error" => $e->getMessage()]);

} catch (SignatureInvalidException $e) {
    http_response_code(401);
    echo json_encode(["message" => "Acceso denegado. La firma del token es inválida (posiblemente la clave secreta no coincide).", "code" => "SIGNATURE_INVALID", "error" => $e->getMessage()]);

} catch (Exception $e) {
    // Para cualquier otro tipo de error al decodificar
    http_response_code(401);
    echo json_encode(["message" => "Acceso denegado. El token es inválido.", "code" => "TOKEN_INVALID", "error" => $e->getMessage()]);
}

$conn->close();
?>