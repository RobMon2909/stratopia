<?php
// Permitimos que este script se ejecute por un tiempo más largo si es necesario
set_time_limit(300); // 5 minutos

require 'db.php';
require dirname(__DIR__) . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

echo "<h1>Iniciando proceso de envío de resúmenes diarios...</h1>";

// --- 1. Obtener el ID del último estado ("Finalizado") ---
$statusFieldId = null;
$doneOptionId = null;

// Buscamos el campo 'Estado'
$stmt_field = $conn->prepare("SELECT id FROM custom_fields WHERE name = 'Estado' LIMIT 1");
$stmt_field->execute();
$result_field = $stmt_field->get_result();
if ($field_row = $result_field->fetch_assoc()) {
    $statusFieldId = $field_row['id'];
}
$stmt_field->close();

// Si encontramos el campo 'Estado', buscamos su última opción por sortOrder
if ($statusFieldId) {
    $stmt_option = $conn->prepare("SELECT id FROM custom_field_options WHERE fieldId = ? ORDER BY sortOrder DESC LIMIT 1");
    $stmt_option->bind_param("s", $statusFieldId);
    $stmt_option->execute();
    $result_option = $stmt_option->get_result();
    if ($option_row = $result_option->fetch_assoc()) {
        $doneOptionId = $option_row['id'];
    }
    $stmt_option->close();
}

if (!$doneOptionId) {
    die("Error: No se pudo determinar el estado 'Finalizado'. Asegúrate de que el campo 'Estado' y sus opciones existan.");
}
echo "<p>Estado 'Finalizado' identificado con ID: " . htmlspecialchars($doneOptionId) . "</p><hr>";


// --- 2. Obtener todos los usuarios ---
$users_result = $conn->query("SELECT id, name, email FROM users");
$users = $users_result->fetch_all(MYSQLI_ASSOC);

foreach ($users as $user) {
    echo "<h2>Procesando usuario: " . htmlspecialchars($user['name']) . " (" . htmlspecialchars($user['email']) . ")</h2>";
    
    // --- 3. Obtener las tareas pendientes asignadas a este usuario ---
    $stmt_tasks = $conn->prepare("
        SELECT t.title, t.dueDate
        FROM tasks t
        JOIN task_assignees ta ON t.id = ta.taskId
        LEFT JOIN task_custom_field_values cfv ON t.id = cfv.taskId AND cfv.fieldId = ?
        WHERE ta.userId = ? AND (cfv.optionId IS NULL OR cfv.optionId != ?)
        ORDER BY t.dueDate ASC
    ");
    $stmt_tasks->bind_param("sss", $statusFieldId, $user['id'], $doneOptionId);
    $stmt_tasks->execute();
    $pending_tasks = $stmt_tasks->get_result()->fetch_all(MYSQLI_ASSOC);
    
    if (empty($pending_tasks)) {
        echo "<p>El usuario no tiene tareas pendientes. No se envía correo.</p>";
        continue;
    }

    echo "<p>Encontradas " . count($pending_tasks) . " tareas pendientes. Construyendo correo...</p>";

    // --- 4. Formatear el correo en HTML ---
    $email_body = "<h1>Hola, " . htmlspecialchars($user['name']) . "!</h1>";
    $email_body .= "<p>Este es tu resumen de tareas pendientes para hoy:</p>";
    $email_body .= "<table border='1' cellpadding='10' cellspacing='0' style='border-collapse: collapse; width: 100%;'>";
    $email_body .= "<thead style='background-color: #f2f2f2;'><tr><th>Tarea</th><th>Fecha Límite</th></tr></thead>";
    $email_body .= "<tbody>";
    foreach ($pending_tasks as $task) {
        $dueDateFormatted = $task['dueDate'] ? date('d/m/Y', strtotime($task['dueDate'])) : 'Sin fecha';
        $email_body .= "<tr><td>" . htmlspecialchars($task['title']) . "</td><td>" . $dueDateFormatted . "</td></tr>";
    }
    $email_body .= "</tbody></table>";
    $email_body .= "<p>¡Que tengas un día productivo!</p><p>El equipo de Stratopia</p>";

    // --- 5. Enviar el correo con PHPMailer ---
    $mail = new PHPMailer(true);
    try {
        // Configuración del servidor SMTP (encuentra estos datos en tu cPanel de Neubox)
        $mail->isSMTP();
        $mail->Host       = 'smtp.tudominio.com'; // Ej: mail.neubox.net o el que te den
        $mail->SMTPAuth   = true;
        $mail->Username   = 'notificaciones@tudominio.com'; // Un correo que hayas creado en cPanel
        $mail->Password   = 'tu_contraseña_de_correo';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS; // O ENCRYPTION_STARTTLS
        $mail->Port       = 465; // O 587 si usas TLS

        // Remitente y Destinatario
        $mail->setFrom('notificaciones@tudominio.com', 'Notificaciones Stratopia');
        $mail->addAddress($user['email'], $user['name']);

        // Contenido
        $mail->isHTML(true);
        $mail->Subject = 'Tu Resumen de Tareas Pendientes';
        $mail->Body    = $email_body;
        $mail->CharSet = 'UTF-8';

        $mail->send();
        echo "<p style='color: green;'>¡Correo enviado exitosamente!</p>";
    } catch (Exception $e) {
        echo "<p style='color: red;'>El correo no pudo ser enviado. Error: " . htmlspecialchars($mail->ErrorInfo) . "</p>";
    }
     echo "<hr>";
}
echo "<h1>Proceso finalizado.</h1>";

$conn->close();
?>