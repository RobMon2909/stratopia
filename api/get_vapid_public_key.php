<?php
// api/get_vapid_public_key.php (VERSIÓN DE DEPURACIÓN)

// =================== PASO 1: FORZAR LA VISUALIZACIÓN DE ERRORES ===================
// Estas líneas obligan a PHP a mostrar cualquier error, incluso si está desactivado en el servidor.
error_reporting(E_ALL);
ini_set('display_errors', 1);
// ==============================================================================

// Ponemos un encabezado de texto plano por ahora para evitar problemas con JSON
header("Content-Type: text/plain; charset=UTF-8");

// Comprobación inicial para ver si el script se ejecuta
echo "DEBUG: El script ha comenzado a ejecutarse.\n";

try {
    // =================== PASO 2: VERIFICAR LA CLAVE ===================
    $vapid_public_key = 'BFcV3PRZKwLVxPQiNlagazzJkLncbteO2G7rJrh4TxVHgGqIUgJsnCYcEAeAJR5li0BDy7odGOfyiu2C06Pjnvc'; // Tu clave que ya habías puesto

    if (empty($vapid_public_key)) {
        // Si la clave está vacía, nos detenemos y lo decimos.
        die("ERROR FATAL: La variable \$vapid_public_key está vacía.");
    }

    echo "DEBUG: La clave pública VAPID ha sido encontrada.\n";
    // ==============================================================================

    // Si todo va bien hasta aquí, intentamos enviar el JSON
    
    // Limpiamos cualquier salida anterior antes de enviar las cabeceras JSON
    ob_clean();
    
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Origin: *");
    http_response_code(200);
    
    echo json_encode(['publicKey' => $vapid_public_key]);

} catch (Throwable $e) {
    // Si ocurre cualquier otro error inesperado, lo capturamos
    http_response_code(500);
    echo "ERROR CATCH: Ocurrió una excepción.\n";
    echo "Mensaje: " . $e->getMessage() . "\n";
    echo "Archivo: " . $e->getFile() . "\n";
    echo "Línea: " . $e->getLine() . "\n";
}

?>