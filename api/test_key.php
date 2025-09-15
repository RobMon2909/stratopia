<?php
// api/test_key.php

echo "--- INICIO DE LA PRUEBA DIRECTA ---<br><br>";

// Incluimos el script que está fallando para ver si genera algún error aquí
require_once 'get_vapid_public_key.php';

echo "<br><br>--- FIN DE LA PRUEBA DIRECTA ---";

?>