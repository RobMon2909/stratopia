<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require 'db.php';
require 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// Lógica de token
$authHeader = null; 
if (isset($_SERVER['Authorization'])) { $authHeader = $_SERVER['Authorization']; } 
else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { $authHeader = $_SERVER['HTTP_AUTHORIZATION']; } 

if (!$authHeader) { 
    http_response_code(401); 
    // Devolvemos un array vacío porque el frontend espera uno
    die(json_encode([]));
}
$arr = explode(" ", $authHeader);
$jwt = $arr[1] ?? '';

if ($jwt) {
    try {
        $decoded = JWT::decode($jwt, new Key("UNA_CLAVE_SECRETA_PARA_STRATOPIA", 'HS256'));
        $user_id = $decoded->data->id;

        // --- LÓGICA CLAVE ---
        // Busca en la tabla 'workspaces' UNIÉNDOLA con 'workspace_members'
        // para encontrar solo los workspaces a los que el usuario actual pertenece.
        $stmt = $conn->prepare("
            SELECT w.id, w.name, w.createdAt 
            FROM workspaces w
            INNER JOIN workspace_members wm ON w.id = wm.workspaceId
            WHERE wm.userId = ? 
            ORDER BY w.createdAt DESC
        ");
        $stmt->bind_param("s", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();

        $workspaces = $result->fetch_all(MYSQLI_ASSOC);
        http_response_code(200);
        echo json_encode($workspaces);

    } catch (Exception $e) {
        http_response_code(401);
        echo json_encode([]); // Devolver array vacío en caso de error
    }
} else {
    http_response_code(401);
    echo json_encode([]); // Devolver array vacío si no hay token
}

$conn->close();
?>