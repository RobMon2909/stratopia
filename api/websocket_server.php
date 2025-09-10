<?php
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use React\EventLoop\Factory as LoopFactory;
use React\Socket\Server as SocketServer;
use React\Http\Server as HttpServerReact;
use Psr\Http\Message\ServerRequestInterface;
use React\Http\Message\Response;

require dirname(__DIR__) . '/vendor/autoload.php';

// Esta clase manejará el broadcast a todos los clientes WebSocket
class Broadcaster {
    public static $clients;

    public static function init() {
        self::$clients = new \SplObjectStorage;
    }

    public static function addClient(ConnectionInterface $conn) {
        self::$clients->attach($conn);
    }

    public static function removeClient(ConnectionInterface $conn) {
        self::$clients->detach($conn);
    }

    public static function broadcast($msg) {
        foreach (self::$clients as $client) {
            $client->send($msg);
        }
    }
}
Broadcaster::init();


// Clase para manejar las conexiones WebSocket (igual que antes)
class Chat implements MessageComponentInterface {
    public function onOpen(ConnectionInterface $conn) {
        Broadcaster::addClient($conn);
        echo "New WebSocket connection! ({$conn->resourceId})\n";
    }
    public function onMessage(ConnectionInterface $from, $msg) { /* No hacemos nada con los mensajes de los clientes */ }
    public function onClose(ConnectionInterface $conn) {
        Broadcaster::removeClient($conn);
        echo "Connection {$conn->resourceId} has disconnected\n";
    }
    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "An error has occurred: {$e->getMessage()}\n";
        $conn->close();
    }
}

// --- NUEVA PARTE: SERVIDOR HTTP INTERNO ---
// Este es el servidor que escuchará las notificaciones de updateTask.php
$loop = LoopFactory::create();
$internalHttpServer = new HttpServerReact($loop, function (ServerRequestInterface $request) {
    // Solo aceptamos peticiones a la ruta /broadcast
    if ($request->getMethod() === 'POST' && $request->getUri()->getPath() === '/broadcast') {
        $body = (string) $request->getBody();
        echo "Received internal message to broadcast: {$body}\n";
        
        // Reenviamos el mensaje a todos los clientes WebSocket conectados
        Broadcaster::broadcast($body);
        
        return new Response(200, ['Content-Type' => 'application/json'], json_encode(['status' => 'ok']));
    }
    return new Response(404, ['Content-Type' => 'application/json'], json_encode(['status' => 'not found']));
});

// Le decimos al servidor HTTP que escuche en el puerto 8082
$internalSocket = new SocketServer('127.0.0.1:8082', $loop);
$internalHttpServer->listen($internalSocket);
echo "Internal HTTP notification server started on port 8082\n";


// --- SERVIDOR WEBSOCKET PRINCIPAL (para los clientes/navegadores) ---
$webSocketServer = new IoServer(
    new HttpServer(new WsServer(new Chat())),
    new SocketServer('0.0.0.0:8081', $loop), // Asegúrate de que este puerto sea 8081
    $loop
);
echo "WebSocket Server started on port 8081\n";

$loop->run();
?>