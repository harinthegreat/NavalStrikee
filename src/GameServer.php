<?php

namespace BattleshipGame;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

/**
 * GameServer Class
 * 
 * Implements a WebSocket-based multiplayer Battleship game server.
 * Handles client connections, game state management, ship placement validation,
 * attack processing, and win condition checking.
 * 
 * @package BattleshipGame
 * @implements MessageComponentInterface
 */
class GameServer implements MessageComponentInterface {
    /**
     * @var \SplObjectStorage Collection of all connected WebSocket clients
     */
    protected $clients;
    
    /**
     * @var array Associative array storing active games by game ID
     *            Format: ['gameId' => ['player1' => Connection, 'player2' => Connection, ...]]
     */
    protected $games;
    
    /**
     * @var ConnectionInterface|null Reference to a player waiting for a random match
     */
    protected $waitingPlayer;
    
    /**
     * @var array Associative array of battle code rooms
     *            Format: ['BATTLE_CODE' => Connection] - stores waiting player connection
     */
    protected $rooms;
    
    /**
     * @var int Grid size for the battleship board (10x10 standard)
     */
    const GRID_SIZE = 10;
    
    /**
     * @var array Expected ships configuration with their sizes
     *            Maps ship name to required cell count
     */
    const EXPECTED_SHIPS = [
        'carrier' => 5,      // Largest ship - 5 cells
        'battleship' => 4,   // Second largest - 4 cells
        'cruiser' => 3,      // Medium ship - 3 cells
        'submarine' => 3,    // Medium ship - 3 cells
        'destroyer' => 2    // Smallest ship - 2 cells
    ];
    
    /**
     * Constructor
     * 
     * Initializes the game server with empty collections for clients, games, and rooms.
     * Sets up the initial state for matchmaking.
     */
    public function __construct() {
        // Initialize storage for all WebSocket connections
        $this->clients = new \SplObjectStorage;
        
        // Initialize array to store active game sessions
        $this->games = [];
        
        // No player waiting initially
        $this->waitingPlayer = null;
        
        // Initialize array to store battle code rooms (for private matches)
        $this->rooms = [];
    }

    /**
     * onOpen - WebSocket Connection Handler
     * 
     * Called when a new WebSocket connection is established.
     * Initializes connection properties and adds client to the storage.
     * 
     * @param ConnectionInterface $conn The new WebSocket connection object
     * @return void
     */
    public function onOpen(ConnectionInterface $conn) {
        // Add the new connection to the clients collection
        $this->clients->attach($conn);
        
        // Initialize connection properties to track game state
        $conn->gameId = null;        // Will be set when game starts
        $conn->username = null;      // Will be set when player joins
        $conn->playerNumber = null;  // Will be set to 1 or 2 when game starts
        
        // Log the new connection for debugging
        echo "New connection! ({$conn->resourceId})\n";
    }

    /**
     * onMessage - WebSocket Message Handler
     * 
     * Processes incoming messages from clients and routes them to appropriate handlers.
     * Decodes JSON messages and dispatches based on message type.
     * 
     * @param ConnectionInterface $from The connection that sent the message
     * @param string $msg The raw JSON message string
     * @return void
     */
    public function onMessage(ConnectionInterface $from, $msg) {
        // Decode the JSON message into an associative array
        $data = json_decode($msg, true);
        
        // If JSON decoding failed, ignore the message
        if (!$data) {
            return;
        }

        // Route message to appropriate handler based on type
        switch ($data['type']) {
            case 'join':
                // Handle player joining/creating/joining a game
                $this->handleJoin($from, $data);
                break;
            case 'ships_placed':
                // Handle player confirming their ship placements
                $this->handleShipsPlaced($from, $data);
                break;
            case 'attack':
                // Handle player making an attack on opponent's board
                $this->handleAttack($from, $data);
                break;
            case 'restart':
                // Handle player requesting to restart/leave game
                $this->handleRestart($from);
                break;
        }
    }

    /**
     * handleJoin - Join Game Handler
     * 
     * Processes player join requests with three modes:
     * - 'random': Match with any waiting player
     * - 'create': Create a private room with battle code
     * - 'join': Join an existing room by battle code
     * 
     * @param ConnectionInterface $conn The connection requesting to join
     * @param array $data Message data containing username, mode, and optional battleCode
     * @return void
     */
    private function handleJoin($conn, $data) {
        // Store username from the join request
        $conn->username = $data['username'];
        
        // Get join mode (default to 'random' if not specified)
        $mode = $data['mode'] ?? 'random'; // Options: 'random', 'create', or 'join'
        
        // Get battle code if provided (for create/join modes)
        $battleCode = $data['battleCode'] ?? null;
        
        if ($mode === 'random') {
            // Random matchmaking mode - pair with any waiting player
            if ($this->waitingPlayer === null) {
                // No one waiting, so this player becomes the waiting player
                $this->waitingPlayer = $conn;
                $conn->playerNumber = 1; // Will be player 1 when matched
                
                // Notify player they are waiting
                $conn->send(json_encode([
                    'type' => 'waiting',
                    'message' => 'Waiting for opponent...'
                ]));
                echo "Player {$conn->username} is waiting for random match\n";
            } else {
                // Another player is waiting, start a game between them
                $this->startGame($this->waitingPlayer, $conn);
                $this->waitingPlayer = null; // Clear waiting player
            }
        } elseif ($mode === 'create') {
            // Create mode - create a private room with battle code
            if (!$battleCode) {
                // Battle code is required for create mode
                $conn->send(json_encode([
                    'type' => 'error',
                    'message' => 'Battle code required'
                ]));
                return;
            }
            
            // Normalize battle code to uppercase for consistency
            $battleCode = strtoupper($battleCode);
            
            if (isset($this->rooms[$battleCode])) {
                // Room already exists with this code
                if ($this->rooms[$battleCode] !== $conn) {
                    // Different player is waiting, start game immediately
                    $this->startGame($this->rooms[$battleCode], $conn, $battleCode);
                    unset($this->rooms[$battleCode]); // Remove room from waiting list
                } else {
                    // Same player trying to create again, just confirm waiting status
                    $conn->send(json_encode([
                        'type' => 'waiting',
                        'message' => 'Waiting for opponent to join battle code...',
                        'battleCode' => $battleCode
                    ]));
                }
            } else {
                // Create new room with this battle code
                $this->rooms[$battleCode] = $conn; // Store waiting player
                $conn->playerNumber = 1; // Will be player 1 when opponent joins
                
                // Notify player they are waiting for opponent
                $conn->send(json_encode([
                    'type' => 'waiting',
                    'message' => 'Waiting for opponent to join battle code...',
                    'battleCode' => $battleCode
                ]));
                echo "Player {$conn->username} created room with code {$battleCode}\n";
            }
        } elseif ($mode === 'join') {
            // Join mode - join an existing room by battle code
            if (!$battleCode) {
                // Battle code is required for join mode
                $conn->send(json_encode([
                    'type' => 'error',
                    'message' => 'Battle code required'
                ]));
                return;
            }
            
            // Normalize battle code to uppercase for consistency
            $battleCode = strtoupper($battleCode);
            
            if (isset($this->rooms[$battleCode])) {
                // Room exists, join it and start game
                $this->startGame($this->rooms[$battleCode], $conn, $battleCode);
                unset($this->rooms[$battleCode]); // Remove room from waiting list
            } else {
                // Room doesn't exist - invalid battle code
                $conn->send(json_encode([
                    'type' => 'error',
                    'message' => 'Invalid battle code. No room found with this code.'
                ]));
            }
        }
    }
    
    /**
     * startGame - Initialize New Game Session
     * 
     * Creates a new game between two players, assigns player numbers,
     * initializes game state, and notifies both players.
     * 
     * @param ConnectionInterface $player1 First player connection (becomes player 1)
     * @param ConnectionInterface $player2 Second player connection (becomes player 2)
     * @param string|null $battleCode Optional battle code if this is a private match
     * @return void
     */
    private function startGame($player1, $player2, $battleCode = null) {
        // Generate unique game ID for this session
        $gameId = uniqid('game_');
        
        // Assign game ID and player numbers to both connections
        $player1->gameId = $gameId;
        $player2->gameId = $gameId;
        $player1->playerNumber = 1;
        $player2->playerNumber = 2;
        
        // Initialize game state structure
        $this->games[$gameId] = [
            'player1' => $player1,              // Reference to player 1 connection
            'player2' => $player2,              // Reference to player 2 connection
            'player1_ships' => null,            // Will store player 1's ship placements
            'player2_ships' => null,            // Will store player 2's ship placements
            'player1_ready' => false,           // Player 1 ship placement status
            'player2_ready' => false,           // Player 2 ship placement status
            'current_turn' => 1,                // Player 1 starts first
            'player1_attacks' => [],            // History of player 1's attacks
            'player2_attacks' => [],            // History of player 2's attacks
            'status' => 'placing_ships'         // Current game phase
        ];
        
        // Notify player 1 that game has started
        $player1->send(json_encode([
            'type' => 'game_start',
            'playerNumber' => 1,
            'opponent' => $player2->username
        ]));
        
        // Notify player 2 that game has started
        $player2->send(json_encode([
            'type' => 'game_start',
            'playerNumber' => 2,
            'opponent' => $player1->username
        ]));
        
        // Log game start (include battle code if present)
        $codeInfo = $battleCode ? " (code: {$battleCode})" : "";
        echo "Game {$gameId} started between {$player1->username} and {$player2->username}{$codeInfo}\n";
    }

    /**
     * handleShipsPlaced - Ship Placement Confirmation Handler
     * 
     * Validates and stores ship placements from a player.
     * When both players are ready, transitions game to playing phase.
     * 
     * @param ConnectionInterface $conn The connection that placed ships
     * @param array $data Message data containing 'ships' array
     * @return void
     */
    private function handleShipsPlaced($conn, $data) {
        // Get the game ID for this connection
        $gameId = $conn->gameId;
        
        // Validate game exists
        if (!$gameId || !isset($this->games[$gameId])) {
            return;
        }
        
        // Validate ship placement data
        $validationError = $this->validateShipPlacement($data['ships']);
        if ($validationError) {
            // Send error message if validation failed
            $conn->send(json_encode([
                'type' => 'error',
                'message' => $validationError
            ]));
            return;
        }
        
        // Get reference to game state
        $game = &$this->games[$gameId];
        
        // Build key for this player's data (e.g., 'player1_ships', 'player2_ships')
        $playerKey = 'player' . $conn->playerNumber;
        
        // Store ship placements for this player
        $game[$playerKey . '_ships'] = $data['ships'];
        
        // Mark this player as ready
        $game[$playerKey . '_ready'] = true;
        
        if ($game['player1_ready'] && $game['player2_ready']) {
            // Both players are ready - start the battle phase
            $game['status'] = 'playing';
            
            // Notify player 1 - they go first
            $game['player1']->send(json_encode([
                'type' => 'both_ready',
                'yourTurn' => true
            ]));
            
            // Notify player 2 - they wait for player 1's turn
            $game['player2']->send(json_encode([
                'type' => 'both_ready',
                'yourTurn' => false
            ]));
            
            echo "Game {$gameId} - Both players ready, game starting\n";
        } else {
            // Other player not ready yet - confirm this player's placement
            $conn->send(json_encode([
                'type' => 'ships_confirmed',
                'message' => 'Waiting for opponent to place ships...'
            ]));
        }
    }

    /**
     * validateShipPlacement - Ship Placement Validator
     * 
     * Validates that ship placements meet all game rules:
     * - Correct number of ships
     * - All required ships present
     * - Ships are correct size
     * - Ships are in valid positions (within grid)
     * - Ships are placed in straight lines (horizontal or vertical)
     * - Ships have contiguous positions (no gaps)
     * - Ships do not overlap
     * 
     * @param array $ships Array of ship objects with 'name' and 'positions' keys
     * @return string|null Error message if validation fails, null if valid
     */
    private function validateShipPlacement($ships) {
        // Check that we have the correct number of ships
        if (!is_array($ships) || count($ships) !== count(self::EXPECTED_SHIPS)) {
            return 'Invalid number of ships';
        }
        
        // Build associative array indexed by ship name for easier lookup
        $shipsByName = [];
        foreach ($ships as $ship) {
            // Validate ship has required properties
            if (!isset($ship['name']) || !isset($ship['positions'])) {
                return 'Invalid ship data';
            }
            $shipsByName[$ship['name']] = $ship;
        }
        
        // Validate each expected ship
        foreach (self::EXPECTED_SHIPS as $shipName => $expectedSize) {
            // Check ship exists
            if (!isset($shipsByName[$shipName])) {
                return "Missing ship: {$shipName}";
            }
            
            $ship = $shipsByName[$shipName];
            $positions = $ship['positions'];
            
            // Check ship has correct number of positions
            if (!is_array($positions) || count($positions) !== $expectedSize) {
                return "Ship {$shipName} has incorrect size";
            }
            
            // Validate each position in the ship
            foreach ($positions as $pos) {
                // Check position has required coordinates
                if (!isset($pos['row']) || !isset($pos['col'])) {
                    return "Invalid position data for {$shipName}";
                }
                
                $row = $pos['row'];
                $col = $pos['col'];
                
                // Check coordinates are integers
                if (!is_int($row) || !is_int($col)) {
                    return "Ship {$shipName} has non-integer coordinates";
                }
                
                // Check coordinates are within grid bounds
                if ($row < 0 || $row >= self::GRID_SIZE || $col < 0 || $col >= self::GRID_SIZE) {
                    return "Ship {$shipName} has positions out of bounds";
                }
            }
            
            // Extract all row and column values
            $rows = array_map(fn($p) => $p['row'], $positions);
            $cols = array_map(fn($p) => $p['col'], $positions);
            
            // Get unique values to determine orientation
            $uniqueRows = array_unique($rows);
            $uniqueCols = array_unique($cols);
            
            // Determine if ship is horizontal (all same row) or vertical (all same column)
            $isHorizontal = count($uniqueRows) === 1;
            $isVertical = count($uniqueCols) === 1;
            
            // Ship must be either horizontal or vertical (straight line)
            if (!$isHorizontal && !$isVertical) {
                return "Ship {$shipName} must be placed in a straight line";
            }
            
            // Check that positions are contiguous (no gaps)
            if ($isHorizontal) {
                // For horizontal ships, sort columns and check they're consecutive
                sort($cols);
                for ($i = 0; $i < count($cols) - 1; $i++) {
                    // Each column should be exactly 1 more than the previous
                    if ($cols[$i + 1] !== $cols[$i] + 1) {
                        return "Ship {$shipName} must have contiguous positions";
                    }
                }
            } else {
                // For vertical ships, sort rows and check they're consecutive
                sort($rows);
                for ($i = 0; $i < count($rows) - 1; $i++) {
                    // Each row should be exactly 1 more than the previous
                    if ($rows[$i + 1] !== $rows[$i] + 1) {
                        return "Ship {$shipName} must have contiguous positions";
                    }
                }
            }
        }
        
        // Check for overlapping ships (ships cannot share positions)
        $allPositions = [];
        foreach ($ships as $ship) {
            foreach ($ship['positions'] as $pos) {
                // Create unique key for this position
                $key = $pos['row'] . ',' . $pos['col'];
                
                // If position already exists, ships overlap
                if (isset($allPositions[$key])) {
                    return 'Ships cannot overlap';
                }
                
                // Mark this position as used
                $allPositions[$key] = true;
            }
        }
        
        // All validations passed
        return null;
    }

    /**
     * handleAttack - Attack Handler
     * 
     * Processes a player's attack on their opponent's board.
     * Validates the attack, checks for hits, updates game state,
     * checks for sunk ships and win conditions.
     * 
     * @param ConnectionInterface $conn The connection making the attack
     * @param array $data Message data containing 'row' and 'col' coordinates
     * @return void
     */
    private function handleAttack($conn, $data) {
        // Get the game ID for this connection
        $gameId = $conn->gameId;
        
        // Validate game exists
        if (!$gameId || !isset($this->games[$gameId])) {
            return;
        }
        
        // Get reference to game state
        $game = &$this->games[$gameId];
        
        // Check if it's this player's turn
        if ($game['current_turn'] !== $conn->playerNumber) {
            $conn->send(json_encode([
                'type' => 'error',
                'message' => 'Not your turn!'
            ]));
            return;
        }
        
        // Extract attack coordinates
        $row = $data['row'];
        $col = $data['col'];
        
        // Validate coordinates are integers
        if (!is_int($row) || !is_int($col)) {
            $conn->send(json_encode([
                'type' => 'error',
                'message' => 'Invalid coordinates'
            ]));
            return;
        }
        
        // Validate coordinates are within grid bounds
        if ($row < 0 || $row >= self::GRID_SIZE || $col < 0 || $col >= self::GRID_SIZE) {
            $conn->send(json_encode([
                'type' => 'error',
                'message' => 'Attack out of bounds'
            ]));
            return;
        }
        
        // Build key for this player's attack history
        $attackKey = 'player' . $conn->playerNumber . '_attacks';
        
        // Check if this position was already attacked
        foreach ($game[$attackKey] as $prevAttack) {
            if ($prevAttack['row'] === $row && $prevAttack['col'] === $col) {
                $conn->send(json_encode([
                    'type' => 'error',
                    'message' => 'You already attacked this position!'
                ]));
                return;
            }
        }
        
        // Determine opponent's number (1 if this is player 2, 2 if this is player 1)
        $opponentNumber = $conn->playerNumber === 1 ? 2 : 1;
        
        // Get opponent connection and ship placements
        $opponent = $game['player' . $opponentNumber];
        $opponentShips = $game['player' . $opponentNumber . '_ships'];
        
        // Check if attack hit a ship
        $hit = $this->checkHit($opponentShips, $row, $col);
        
        // Record this attack in history
        $game[$attackKey][] = ['row' => $row, 'col' => $col, 'hit' => $hit];
        
        // Notify attacker of result
        $conn->send(json_encode([
            'type' => 'attack_result',
            'row' => $row,
            'col' => $col,
            'hit' => $hit,
            'yourTurn' => false // Turn ends after attack
        ]));
        
        // Notify opponent of the attack
        $opponent->send(json_encode([
            'type' => 'opponent_attack',
            'row' => $row,
            'col' => $col,
            'hit' => $hit,
            'yourTurn' => true // Opponent's turn now
        ]));
        
        // If hit, check for sunk ship and win condition
        if ($hit) {
            // Check if this hit sunk a ship
            $sunkShip = $this->checkShipSunk($opponentShips, $game[$attackKey]);
            if ($sunkShip) {
                // Notify attacker they sunk a ship
                $conn->send(json_encode([
                    'type' => 'ship_sunk',
                    'ship' => $sunkShip
                ]));
                
                // Notify opponent their ship was sunk
                $opponent->send(json_encode([
                    'type' => 'your_ship_sunk',
                    'ship' => $sunkShip
                ]));
            }
            
            // Check if all ships are sunk (win condition)
            if ($this->checkWin($opponentShips, $game[$attackKey])) {
                // Notify attacker they won
                $conn->send(json_encode([
                    'type' => 'game_over',
                    'winner' => true
                ]));
                
                // Notify opponent they lost
                $opponent->send(json_encode([
                    'type' => 'game_over',
                    'winner' => false
                ]));
                
                // Mark game as finished
                $game['status'] = 'finished';
                echo "Game {$gameId} finished - {$conn->username} wins!\n";
                return;
            }
        }
        
        // Switch turn to opponent
        $game['current_turn'] = $opponentNumber;
    }

    /**
     * checkHit - Hit Detection
     * 
     * Checks if an attack at given coordinates hits any ship.
     * 
     * @param array $ships Array of ship objects with 'positions' arrays
     * @param int $row Row coordinate to check
     * @param int $col Column coordinate to check
     * @return bool True if hit, false if miss
     */
    private function checkHit($ships, $row, $col) {
        // Check each ship's positions
        foreach ($ships as $ship) {
            foreach ($ship['positions'] as $pos) {
                // If coordinates match a ship position, it's a hit
                if ($pos['row'] === $row && $pos['col'] === $col) {
                    return true;
                }
            }
        }
        
        // No ship found at these coordinates - miss
        return false;
    }

    /**
     * checkShipSunk - Ship Sunk Detection
     * 
     * Determines if any ship has been completely destroyed by checking
     * if all of its positions have been hit.
     * 
     * @param array $ships Array of ship objects with 'positions' arrays
     * @param array $attacks Array of attack records with 'row', 'col', and 'hit' keys
     * @return string|null Name of sunk ship if found, null otherwise
     */
    private function checkShipSunk($ships, $attacks) {
        // Check each ship
        foreach ($ships as $ship) {
            $shipHits = 0; // Count of hits on this ship
            
            // Count how many positions of this ship have been hit
            foreach ($ship['positions'] as $pos) {
                foreach ($attacks as $attack) {
                    // Check if this attack hit this ship position
                    if ($attack['hit'] && $attack['row'] === $pos['row'] && $attack['col'] === $pos['col']) {
                        $shipHits++;
                    }
                }
            }
            
            // If all positions are hit, ship is sunk
            if ($shipHits === count($ship['positions'])) {
                return $ship['name'];
            }
        }
        
        // No ship completely sunk
        return null;
    }

    /**
     * checkWin - Win Condition Checker
     * 
     * Determines if all ships have been destroyed by comparing
     * total ship cells to total successful hits.
     * 
     * @param array $ships Array of ship objects with 'positions' arrays
     * @param array $attacks Array of attack records with 'hit' boolean
     * @return bool True if all ships are destroyed (win condition), false otherwise
     */
    private function checkWin($ships, $attacks) {
        // Calculate total number of ship cells
        $totalShipCells = 0;
        foreach ($ships as $ship) {
            $totalShipCells += count($ship['positions']);
        }
        
        // Count successful hits
        $hitCount = 0;
        foreach ($attacks as $attack) {
            if ($attack['hit']) {
                $hitCount++;
            }
        }
        
        // Win if all ship cells have been hit
        return $hitCount === $totalShipCells;
    }

    /**
     * handleRestart - Restart Handler
     * 
     * Handles player request to restart/leave the current game.
     * Cleans up game state and resets connection properties.
     * 
     * @param ConnectionInterface $conn The connection requesting restart
     * @return void
     */
    private function handleRestart($conn) {
        // Get the game ID for this connection
        $gameId = $conn->gameId;
        
        // Validate game exists
        if (!$gameId || !isset($this->games[$gameId])) {
            return;
        }
        
        // Remove game from active games
        unset($this->games[$gameId]);
        
        // Reset connection properties
        $conn->gameId = null;
        $conn->playerNumber = null;
        
        // Note: We don't auto-join a new game here
        // The frontend will handle showing the command deck for the user to choose
    }

    /**
     * onClose - WebSocket Disconnection Handler
     * 
     * Called when a WebSocket connection is closed.
     * Cleans up game state, removes from waiting lists, and notifies opponents.
     * 
     * @param ConnectionInterface $conn The connection that closed
     * @return void
     */
    public function onClose(ConnectionInterface $conn) {
        // Remove connection from clients collection
        $this->clients->detach($conn);
        
        // If this was the waiting player, clear waiting status
        if ($this->waitingPlayer === $conn) {
            $this->waitingPlayer = null;
        }
        
        // Remove from battle code rooms if waiting in a room
        foreach ($this->rooms as $code => $roomPlayer) {
            if ($roomPlayer === $conn) {
                unset($this->rooms[$code]);
                echo "Room {$code} closed - player disconnected\n";
                break;
            }
        }
        
        // If player was in an active game, handle opponent notification
        if ($conn->gameId && isset($this->games[$conn->gameId])) {
            $game = $this->games[$conn->gameId];
            
            // Determine which player disconnected
            $opponent = $game['player1'] === $conn ? $game['player2'] : $game['player1'];
            
            // If opponent is still connected, notify them
            if ($this->clients->contains($opponent)) {
                $opponent->send(json_encode([
                    'type' => 'opponent_disconnected',
                    'message' => 'Opponent disconnected'
                ]));
                // Reset opponent's game state
                $opponent->gameId = null;
            }
            
            // Remove game from active games
            unset($this->games[$conn->gameId]);
        }
        
        // Log disconnection
        echo "Connection {$conn->resourceId} has disconnected\n";
    }

    /**
     * onError - WebSocket Error Handler
     * 
     * Called when an error occurs on a WebSocket connection.
     * Logs the error and closes the connection.
     * 
     * @param ConnectionInterface $conn The connection with the error
     * @param \Exception $e The exception that occurred
     * @return void
     */
    public function onError(ConnectionInterface $conn, \Exception $e) {
        // Log the error message
        echo "An error has occurred: {$e->getMessage()}\n";
        
        // Close the connection
        $conn->close();
    }
}
