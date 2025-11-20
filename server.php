<?php

require dirname(__FILE__) . '/vendor/autoload.php';

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use BattleshipGame\GameServer;

$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new GameServer()
        )
    ),
    8080
);

echo "WebSocket server started on port 8080\n";
$server->run();
