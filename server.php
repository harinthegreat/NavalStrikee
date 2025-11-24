<?php
/**
 * server.php - WebSocket Game Server Launcher
 * 
 * This file initializes and starts the WebSocket server for the Battleship game.
 * It sets up the Ratchet WebSocket server stack and binds it to a port.
 * 
 * Server Stack:
 * - IoServer: Handles low-level I/O operations
 * - HttpServer: Handles HTTP protocol
 * - WsServer: Handles WebSocket protocol upgrade
 * - GameServer: Our custom game logic handler
 * 
 * Usage:
 *   php server.php
 * 
 * The server will listen on port 8080 by default, or the PORT environment variable.
 */

// Load Composer autoloader to include all dependencies
// This allows us to use classes from vendor packages (like Ratchet)
require dirname(__FILE__) . '/vendor/autoload.php';

// Import required classes from Ratchet library
use Ratchet\Server\IoServer;        // I/O server for handling connections
use Ratchet\Http\HttpServer;         // HTTP server layer
use Ratchet\WebSocket\WsServer;      // WebSocket server layer
use BattleshipGame\GameServer;       // Our custom game server class

// Get port from environment variable, default to 8080 if not set
// This allows deployment platforms (like Heroku, Render) to set custom ports
$port = getenv('PORT') ?: 8080;

// Create the server stack with nested layers:
// 1. IoServer (outermost) - handles raw I/O
// 2. HttpServer - handles HTTP protocol
// 3. WsServer - handles WebSocket protocol upgrades
// 4. GameServer (innermost) - our game logic
$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new GameServer()
        )
    ),
    $port  // Port to listen on
);

// Log server startup message
echo "WebSocket server started on port $port\n";

// Start the server (this blocks and runs indefinitely)
$server->run();
