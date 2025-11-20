<?php

namespace BattleshipGame;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class GameServer implements MessageComponentInterface {
    protected $clients;
    protected $games;
    protected $waitingPlayer;
    protected $rooms; // Battle code rooms
    
    const GRID_SIZE = 10;
    const EXPECTED_SHIPS = [
        'carrier' => 5,
        'battleship' => 4,
        'cruiser' => 3,
        'submarine' => 3,
        'destroyer' => 2
    ];
    
    public function __construct() {
        $this->clients = new \SplObjectStorage;
        $this->games = [];
        $this->waitingPlayer = null;
        $this->rooms = []; // battleCode => waiting player connection
    }

    public function onOpen(ConnectionInterface $conn) {
        $this->clients->attach($conn);
        $conn->gameId = null;
        $conn->username = null;
        $conn->playerNumber = null;
        echo "New connection! ({$conn->resourceId})\n";
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $data = json_decode($msg, true);
        
        if (!$data) {
            return;
        }

        switch ($data['type']) {
            case 'join':
                $this->handleJoin($from, $data);
                break;
            case 'ships_placed':
                $this->handleShipsPlaced($from, $data);
                break;
            case 'attack':
                $this->handleAttack($from, $data);
                break;
            case 'restart':
                $this->handleRestart($from);
                break;
        }
    }

    private function handleJoin($conn, $data) {
        $conn->username = $data['username'];
        $mode = $data['mode'] ?? 'random'; // 'random', 'create', or 'join'
        $battleCode = $data['battleCode'] ?? null;
        
        if ($mode === 'random') {
            // Random matchmaking - use existing logic
            if ($this->waitingPlayer === null) {
                $this->waitingPlayer = $conn;
                $conn->playerNumber = 1;
                $conn->send(json_encode([
                    'type' => 'waiting',
                    'message' => 'Waiting for opponent...'
                ]));
                echo "Player {$conn->username} is waiting for random match\n";
            } else {
                $this->startGame($this->waitingPlayer, $conn);
                $this->waitingPlayer = null;
            }
        } elseif ($mode === 'create') {
            // Create a room with battle code
            if (!$battleCode) {
                $conn->send(json_encode([
                    'type' => 'error',
                    'message' => 'Battle code required'
                ]));
                return;
            }
            
            $battleCode = strtoupper($battleCode);
            
            if (isset($this->rooms[$battleCode])) {
                // Room already exists with different player, join it
                if ($this->rooms[$battleCode] !== $conn) {
                    $this->startGame($this->rooms[$battleCode], $conn, $battleCode);
                    unset($this->rooms[$battleCode]);
                } else {
                    // Same player trying to create again, just wait
                    $conn->send(json_encode([
                        'type' => 'waiting',
                        'message' => 'Waiting for opponent to join battle code...',
                        'battleCode' => $battleCode
                    ]));
                }
            } else {
                // Create new room
                $this->rooms[$battleCode] = $conn;
                $conn->playerNumber = 1;
                $conn->send(json_encode([
                    'type' => 'waiting',
                    'message' => 'Waiting for opponent to join battle code...',
                    'battleCode' => $battleCode
                ]));
                echo "Player {$conn->username} created room with code {$battleCode}\n";
            }
        } elseif ($mode === 'join') {
            // Join an existing room by battle code
            if (!$battleCode) {
                $conn->send(json_encode([
                    'type' => 'error',
                    'message' => 'Battle code required'
                ]));
                return;
            }
            
            $battleCode = strtoupper($battleCode);
            
            if (isset($this->rooms[$battleCode])) {
                // Room exists, join it
                $this->startGame($this->rooms[$battleCode], $conn, $battleCode);
                unset($this->rooms[$battleCode]);
            } else {
                // Room doesn't exist
                $conn->send(json_encode([
                    'type' => 'error',
                    'message' => 'Invalid battle code. No room found with this code.'
                ]));
            }
        }
    }
    
    private function startGame($player1, $player2, $battleCode = null) {
        $gameId = uniqid('game_');
        $player1->gameId = $gameId;
        $player2->gameId = $gameId;
        $player1->playerNumber = 1;
        $player2->playerNumber = 2;
        
        $this->games[$gameId] = [
            'player1' => $player1,
            'player2' => $player2,
            'player1_ships' => null,
            'player2_ships' => null,
            'player1_ready' => false,
            'player2_ready' => false,
            'current_turn' => 1,
            'player1_attacks' => [],
            'player2_attacks' => [],
            'status' => 'placing_ships'
        ];
        
        $player1->send(json_encode([
            'type' => 'game_start',
            'playerNumber' => 1,
            'opponent' => $player2->username
        ]));
        
        $player2->send(json_encode([
            'type' => 'game_start',
            'playerNumber' => 2,
            'opponent' => $player1->username
        ]));
        
        $codeInfo = $battleCode ? " (code: {$battleCode})" : "";
        echo "Game {$gameId} started between {$player1->username} and {$player2->username}{$codeInfo}\n";
    }

    private function handleShipsPlaced($conn, $data) {
        $gameId = $conn->gameId;
        if (!$gameId || !isset($this->games[$gameId])) {
            return;
        }
        
        $validationError = $this->validateShipPlacement($data['ships']);
        if ($validationError) {
            $conn->send(json_encode([
                'type' => 'error',
                'message' => $validationError
            ]));
            return;
        }
        
        $game = &$this->games[$gameId];
        $playerKey = 'player' . $conn->playerNumber;
        
        $game[$playerKey . '_ships'] = $data['ships'];
        $game[$playerKey . '_ready'] = true;
        
        if ($game['player1_ready'] && $game['player2_ready']) {
            $game['status'] = 'playing';
            
            $game['player1']->send(json_encode([
                'type' => 'both_ready',
                'yourTurn' => true
            ]));
            
            $game['player2']->send(json_encode([
                'type' => 'both_ready',
                'yourTurn' => false
            ]));
            
            echo "Game {$gameId} - Both players ready, game starting\n";
        } else {
            $conn->send(json_encode([
                'type' => 'ships_confirmed',
                'message' => 'Waiting for opponent to place ships...'
            ]));
        }
    }

    private function validateShipPlacement($ships) {
        if (!is_array($ships) || count($ships) !== count(self::EXPECTED_SHIPS)) {
            return 'Invalid number of ships';
        }
        
        $shipsByName = [];
        foreach ($ships as $ship) {
            if (!isset($ship['name']) || !isset($ship['positions'])) {
                return 'Invalid ship data';
            }
            $shipsByName[$ship['name']] = $ship;
        }
        
        foreach (self::EXPECTED_SHIPS as $shipName => $expectedSize) {
            if (!isset($shipsByName[$shipName])) {
                return "Missing ship: {$shipName}";
            }
            
            $ship = $shipsByName[$shipName];
            $positions = $ship['positions'];
            
            if (!is_array($positions) || count($positions) !== $expectedSize) {
                return "Ship {$shipName} has incorrect size";
            }
            
            foreach ($positions as $pos) {
                if (!isset($pos['row']) || !isset($pos['col'])) {
                    return "Invalid position data for {$shipName}";
                }
                
                $row = $pos['row'];
                $col = $pos['col'];
                
                if (!is_int($row) || !is_int($col)) {
                    return "Ship {$shipName} has non-integer coordinates";
                }
                
                if ($row < 0 || $row >= self::GRID_SIZE || $col < 0 || $col >= self::GRID_SIZE) {
                    return "Ship {$shipName} has positions out of bounds";
                }
            }
            
            $rows = array_map(fn($p) => $p['row'], $positions);
            $cols = array_map(fn($p) => $p['col'], $positions);
            $uniqueRows = array_unique($rows);
            $uniqueCols = array_unique($cols);
            
            $isHorizontal = count($uniqueRows) === 1;
            $isVertical = count($uniqueCols) === 1;
            
            if (!$isHorizontal && !$isVertical) {
                return "Ship {$shipName} must be placed in a straight line";
            }
            
            if ($isHorizontal) {
                sort($cols);
                for ($i = 0; $i < count($cols) - 1; $i++) {
                    if ($cols[$i + 1] !== $cols[$i] + 1) {
                        return "Ship {$shipName} must have contiguous positions";
                    }
                }
            } else {
                sort($rows);
                for ($i = 0; $i < count($rows) - 1; $i++) {
                    if ($rows[$i + 1] !== $rows[$i] + 1) {
                        return "Ship {$shipName} must have contiguous positions";
                    }
                }
            }
        }
        
        $allPositions = [];
        foreach ($ships as $ship) {
            foreach ($ship['positions'] as $pos) {
                $key = $pos['row'] . ',' . $pos['col'];
                if (isset($allPositions[$key])) {
                    return 'Ships cannot overlap';
                }
                $allPositions[$key] = true;
            }
        }
        
        return null;
    }

    private function handleAttack($conn, $data) {
        $gameId = $conn->gameId;
        if (!$gameId || !isset($this->games[$gameId])) {
            return;
        }
        
        $game = &$this->games[$gameId];
        
        if ($game['current_turn'] !== $conn->playerNumber) {
            $conn->send(json_encode([
                'type' => 'error',
                'message' => 'Not your turn!'
            ]));
            return;
        }
        
        $row = $data['row'];
        $col = $data['col'];
        
        if (!is_int($row) || !is_int($col)) {
            $conn->send(json_encode([
                'type' => 'error',
                'message' => 'Invalid coordinates'
            ]));
            return;
        }
        
        if ($row < 0 || $row >= self::GRID_SIZE || $col < 0 || $col >= self::GRID_SIZE) {
            $conn->send(json_encode([
                'type' => 'error',
                'message' => 'Attack out of bounds'
            ]));
            return;
        }
        
        $attackKey = 'player' . $conn->playerNumber . '_attacks';
        
        foreach ($game[$attackKey] as $prevAttack) {
            if ($prevAttack['row'] === $row && $prevAttack['col'] === $col) {
                $conn->send(json_encode([
                    'type' => 'error',
                    'message' => 'You already attacked this position!'
                ]));
                return;
            }
        }
        
        $opponentNumber = $conn->playerNumber === 1 ? 2 : 1;
        $opponent = $game['player' . $opponentNumber];
        $opponentShips = $game['player' . $opponentNumber . '_ships'];
        
        $hit = $this->checkHit($opponentShips, $row, $col);
        
        $game[$attackKey][] = ['row' => $row, 'col' => $col, 'hit' => $hit];
        
        $conn->send(json_encode([
            'type' => 'attack_result',
            'row' => $row,
            'col' => $col,
            'hit' => $hit,
            'yourTurn' => false
        ]));
        
        $opponent->send(json_encode([
            'type' => 'opponent_attack',
            'row' => $row,
            'col' => $col,
            'hit' => $hit,
            'yourTurn' => true
        ]));
        
        if ($hit) {
            $sunkShip = $this->checkShipSunk($opponentShips, $game[$attackKey]);
            if ($sunkShip) {
                $conn->send(json_encode([
                    'type' => 'ship_sunk',
                    'ship' => $sunkShip
                ]));
                $opponent->send(json_encode([
                    'type' => 'your_ship_sunk',
                    'ship' => $sunkShip
                ]));
            }
            
            if ($this->checkWin($opponentShips, $game[$attackKey])) {
                $conn->send(json_encode([
                    'type' => 'game_over',
                    'winner' => true
                ]));
                $opponent->send(json_encode([
                    'type' => 'game_over',
                    'winner' => false
                ]));
                $game['status'] = 'finished';
                echo "Game {$gameId} finished - {$conn->username} wins!\n";
                return;
            }
        }
        
        $game['current_turn'] = $opponentNumber;
    }

    private function checkHit($ships, $row, $col) {
        foreach ($ships as $ship) {
            foreach ($ship['positions'] as $pos) {
                if ($pos['row'] === $row && $pos['col'] === $col) {
                    return true;
                }
            }
        }
        return false;
    }

    private function checkShipSunk($ships, $attacks) {
        foreach ($ships as $ship) {
            $shipHits = 0;
            foreach ($ship['positions'] as $pos) {
                foreach ($attacks as $attack) {
                    if ($attack['hit'] && $attack['row'] === $pos['row'] && $attack['col'] === $pos['col']) {
                        $shipHits++;
                    }
                }
            }
            if ($shipHits === count($ship['positions'])) {
                return $ship['name'];
            }
        }
        return null;
    }

    private function checkWin($ships, $attacks) {
        $totalShipCells = 0;
        foreach ($ships as $ship) {
            $totalShipCells += count($ship['positions']);
        }
        
        $hitCount = 0;
        foreach ($attacks as $attack) {
            if ($attack['hit']) {
                $hitCount++;
            }
        }
        
        return $hitCount === $totalShipCells;
    }

    private function handleRestart($conn) {
        $gameId = $conn->gameId;
        if (!$gameId || !isset($this->games[$gameId])) {
            return;
        }
        
        unset($this->games[$gameId]);
        $conn->gameId = null;
        $conn->playerNumber = null;
        
        // Don't auto-join, let user choose from command deck
        // The frontend will handle showing the command deck
    }

    public function onClose(ConnectionInterface $conn) {
        $this->clients->detach($conn);
        
        if ($this->waitingPlayer === $conn) {
            $this->waitingPlayer = null;
        }
        
        // Remove from rooms if waiting in a battle code room
        foreach ($this->rooms as $code => $roomPlayer) {
            if ($roomPlayer === $conn) {
                unset($this->rooms[$code]);
                echo "Room {$code} closed - player disconnected\n";
                break;
            }
        }
        
        if ($conn->gameId && isset($this->games[$conn->gameId])) {
            $game = $this->games[$conn->gameId];
            $opponent = $game['player1'] === $conn ? $game['player2'] : $game['player1'];
            
            if ($this->clients->contains($opponent)) {
                $opponent->send(json_encode([
                    'type' => 'opponent_disconnected',
                    'message' => 'Opponent disconnected'
                ]));
                $opponent->gameId = null;
            }
            
            unset($this->games[$conn->gameId]);
        }
        
        echo "Connection {$conn->resourceId} has disconnected\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "An error has occurred: {$e->getMessage()}\n";
        $conn->close();
    }
}
