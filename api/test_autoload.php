<?php
// api/test_autoload.php

echo "Iniciando prueba de autoloader...<br>";

// Forzar la visualización de todos los errores
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Definimos la ruta al archivo autoload.php
$autoloader_path = __DIR__ . '/../vendor/autoload.php';

echo "Ruta absoluta al autoloader: " . realpath($autoloader_path) . "<br>";

if (file_exists($autoloader_path)) {
    echo "ÉXITO: El archivo autoload.php fue encontrado.<br>";

    // Incluimos el autoloader
    require_once $autoloader_path;

    echo "ÉXITO: El archivo autoload.php fue incluido sin errores.<br>";

    // La prueba final: ¿Existe la clase JWT después de incluir el autoloader?
    if (class_exists('Firebase\JWT\JWT')) {
        echo "¡ÉXITO TOTAL! La clase 'Firebase\\JWT\\JWT' fue cargada correctamente.<br>";
    } else {
        echo "ERROR FATAL: Se incluyó autoload.php, pero la clase 'Firebase\\JWT\\JWT' AÚN NO SE ENCUENTRA.<br>";
        echo "Esto indica un problema con la caché de opcache de PHP o con la estructura de la carpeta vendor.<br>";
    }

} else {
    echo "ERROR FATAL: No se pudo encontrar el archivo autoload.php en la ruta esperada.<br>";
    echo "Verifica que la carpeta 'vendor' está en la raíz del proyecto (C:\\xampp\\htdocs\\stratopia\\), no dentro de la carpeta 'api'.<br>";
}

echo "<br>Prueba finalizada.";
?>