<?php
// Carga todas las librerías de Composer
require dirname(__DIR__) . '/vendor/autoload.php';

use Minishlink\WebPush\VAPID;

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Generador de Claves VAPID</title>
    <style>
        body { font-family: sans-serif; line-height: 1.6; padding: 20px; color: #333; }
        h1, h2, h3 { color: #1a202c; }
        pre { background-color:#f0f0f0; padding:15px; border: 1px solid #ccc; border-radius:5px; word-wrap:break-word; white-space: pre-wrap; }
    </style>
</head>
<body>
    <h1>Generando Nuevas Claves VAPID...</h1>
<?php
try {
    $keys = VAPID::createVapidKeys();

    echo "<h2>¡Claves generadas con éxito!</h2>";
    echo "<p>Guarda estas claves en un lugar seguro. Las necesitarás para configurar las notificaciones push.</p>";
    
    echo "<h3>Clave Pública (Public Key):</h3>";
    echo "<pre>" . htmlspecialchars($keys['publicKey']) . "</pre>";

    echo "<h3>Clave Privada (Private Key):</h3>";
    echo "<pre>" . htmlspecialchars($keys['privateKey']) . "</pre>";

} catch (Throwable $e) {
    echo "<h2 style='color:red;'>Error al generar las claves:</h2>";
    echo "<pre>" . htmlspecialchars($e->getMessage()) . "</pre>";
}
?>
</body>
</html>