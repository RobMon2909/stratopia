<?php
// api/send_notification.php
// VERSIÓN CORREGIDA

require_once 'vendor/autoload.php';

use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

// La función ahora ACEPTA el objeto de conexión a la base de datos
function sendPushNotification($conn, $userIdToNotify, $title, $body, $url) {
    // AÑADE ESTA LÍNEA PARA DEPURAR
    error_log("DEBUG send_notification: Función ejecutada para userId: " . $userIdToNotify);
    
    // YA NO incluimos 'db.php' aquí, usamos la conexión existente

    $auth = [
        'VAPID' => [
            'subject' => 'mailto:tu-email@ejemplo.com', 
            'publicKey' => 'PEGA_AQUI_TU_CLAVE_PUBLICA',
            'privateKey' => 'PEGA_AQUI_TU_CLAVE_PRIVADA',
        ],
    ];

    $stmt = $conn->prepare("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE userId = ?");
    if ($stmt === false) {
        error_log("Error al preparar la consulta de suscripción: " . $conn->error);
        return;
    }
    
    $stmt->bind_param("s", $userIdToNotify);
    $stmt->execute();
    $result = $stmt->get_result();

    $subscriptions = [];
    while ($row = $result->fetch_assoc()) {
        $subscriptions[] = Subscription::create([
            'endpoint' => $row['endpoint'],
            'publicKey' => $row['p256dh'],
            'authToken' => $row['auth'],
        ]);
    }
    $stmt->close();
    
    if (empty($subscriptions)) {
        return; // El usuario no tiene notificaciones push activadas, salimos silenciosamente.
    }

    $webPush = new WebPush($auth);
    $payload = json_encode([
        'title' => $title,
        'body' => $body,
        'url' => $url,
    ]);

    foreach ($subscriptions as $subscription) {
        $webPush->queueNotification($subscription, $payload);
    }

    foreach ($webPush->flush() as $report) {
        if ($report->isSubscriptionExpired()) {
            $endpoint = $report->getRequest()->getUri()->__toString();
            $deleteStmt = $conn->prepare("DELETE FROM push_subscriptions WHERE endpoint = ?");
            if($deleteStmt){
                $deleteStmt->bind_param("s", $endpoint);
                $deleteStmt->execute();
                $deleteStmt->close();
            }
        }
    }
    
    // IMPORTANTE: YA NO cerramos la conexión $conn->close() aquí.
    // El script principal (updateTask.php) se encargará de cerrarla al final.
}
?>