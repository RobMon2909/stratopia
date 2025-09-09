<?php
// Este es un script de un solo uso para resetear la contraseña de forma segura.
require 'db.php';

// --- ¡CONFIGURA ESTAS DOS LÍNEAS! ---
$admin_email = "administrativo@stratopia.mx"; // El email de la cuenta que quieres resetear.
$new_password = "password123"; // Escribe aquí la nueva contraseña que quieras usar.

// -----------------------------------------

// Hashear la nueva contraseña
$new_hashed_password = password_hash($new_password, PASSWORD_BCRYPT);

if ($new_hashed_password === false) {
    die("Error: La función password_hash falló. Revisa tu versión de PHP.");
}

// Preparar la sentencia para actualizar la base de datos
$stmt = $conn->prepare("UPDATE users SET password = ? WHERE email = ?");
$stmt->bind_param("ss", $new_hashed_password, $admin_email);

// Ejecutar y verificar
if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        echo "<h1>¡Éxito!</h1>";
        echo "<p>La contraseña para el usuario <strong>" . htmlspecialchars($admin_email) . "</strong> ha sido actualizada a: <strong>" . htmlspecialchars($new_password) . "</strong></p>";
        echo "<p>Ya puedes cerrar esta ventana e intentar iniciar sesión en la aplicación.</p>";
    } else {
        echo "<h1>Error</h1>";
        echo "<p>No se encontró ningún usuario con el email: <strong>" . htmlspecialchars($admin_email) . "</strong></p>";
    }
} else {
    echo "<h1>Error en la Base de Datos</h1>";
    echo "<p>No se pudo ejecutar la actualización. Error: " . htmlspecialchars($stmt->error) . "</p>";
}

$stmt->close();
$conn->close();
?>