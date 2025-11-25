/**
 * Battleship Game Constants
 * 
 * GRID_SIZE: Standard 10x10 battleship board size
 * SHIPS: Array of ship configurations with name and size
 */
const GRID_SIZE = 10; // Standard battleship grid is 10x10 cells
const SHIPS = [
    { name: 'carrier', size: 5 },      // Largest ship - 5 cells
    { name: 'battleship', size: 4 },   // Second largest - 4 cells
    { name: 'cruiser', size: 3 },       // Medium ship - 3 cells
    { name: 'submarine', size: 3 },     // Medium ship - 3 cells
    { name: 'destroyer', size: 2 }      // Smallest ship - 2 cells
];

/**
 * BattleshipGame Class
 * 
 * Main game controller class that manages the entire battleship game flow:
 * - WebSocket connection management
 * - Game state tracking
 * - UI rendering and interaction
 * - Ship placement and validation
 * - Attack handling
 * - Game phase transitions
 * 
 * @class BattleshipGame
 */
class BattleshipGame {
    /**
     * Constructor
     * 
     * Initializes the game instance, sets up boards, event listeners,
     * and displays the initial username screen.
     */
    constructor() {
        // WebSocket connection (null until connected)
        this.ws = null;
        
        // Player username (loaded from localStorage if available)
        this.username = localStorage.getItem('battleship_username') || '';
        
        // Player number assigned by server (1 or 2)
        this.playerNumber = null;
        
        // Opponent's username
        this.opponentName = '';
        
        // Currently selected ship for placement (null when none selected)
        this.currentShip = null;
        
        // Ship orientation for placement ('horizontal' or 'vertical')
        this.shipOrientation = 'horizontal';
        
        // Array of placed ships with their positions
        this.placedShips = [];
        
        // 2D array representing player's board state
        // Each cell: { ship: string|null, hit: boolean, miss: boolean }
        this.playerBoard = [];
        
        // 2D array representing opponent's board state (only hit/miss visible)
        // Each cell: { hit: boolean, miss: boolean }
        this.opponentBoard = [];
        
        // Boolean indicating if it's the current player's turn
        this.myTurn = false;
        
        // Battle code for private matches (6-character alphanumeric)
        this.battleCode = null;
        
        // Join mode: 'random', 'create', or 'join'
        this.joinMode = null;
        
        // Track sunk ships (our ships and opponent's ships)
        this.mySunkShips = [];      // Ships we've lost
        this.opponentSunkShips = []; // Ships we've sunk
        
        // Initialize game boards with empty cells
        this.initializeBoards();
        
        // Set up all event listeners for UI interactions
        this.setupEventListeners();
        
        // Show the username entry screen
        this.showScreen('username-screen');
        
        // If username exists in localStorage, pre-fill the input
        if (this.username) {
            document.getElementById('username-input').value = this.username;
        }
    }

    /**
     * initializeBoards - Initialize Game Boards
     * 
     * Creates empty 10x10 grids for both player and opponent boards.
     * Each cell is initialized with default state values.
     * 
     * @returns {void}
     */
    initializeBoards() {
        // Initialize each row of the grid
        for (let i = 0; i < GRID_SIZE; i++) {
            // Create new row arrays
            this.playerBoard[i] = [];
            this.opponentBoard[i] = [];
            
            // Initialize each cell in the row
            for (let j = 0; j < GRID_SIZE; j++) {
                // Player board: tracks ship placement and attack results
                this.playerBoard[i][j] = { 
                    ship: null,    // Ship name if ship occupies this cell, null otherwise
                    hit: false,     // True if this cell has been hit by opponent
                    miss: false    // True if opponent missed this cell
                };
                
                // Opponent board: only tracks attack results (ships hidden)
                this.opponentBoard[i][j] = { 
                    hit: false,     // True if we hit a ship here
                    miss: false     // True if we missed here
                };
            }
        }
    }

    /**
     * setupEventListeners - Set Up UI Event Listeners
     * 
     * Attaches event listeners to all interactive UI elements:
     * - Username screen buttons
     * - Command deck buttons
     * - Game board interactions
     * - Ship placement controls
     * 
     * @returns {void}
     */
    setupEventListeners() {
        // Username screen: Join button
        document.getElementById('join-btn').addEventListener('click', () => this.joinGame());
        
        // Username screen: Enter key on input
        document.getElementById('username-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinGame();
        });
        
        // Command Deck: Logout button
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        
        // Command Deck: Random match button
        document.getElementById('random-match-btn').addEventListener('click', () => this.startRandomMatch());
        
        // Command Deck: Launch operation (create room) button
        document.getElementById('launch-armada-btn').addEventListener('click', () => this.launchOperation());
        
        // Command Deck: Join battle (join room) button
        document.getElementById('board-ship-btn').addEventListener('click', () => this.joinBattle());
        
        // Command Deck: Copy battle code button
        document.getElementById('copy-code-btn').addEventListener('click', () => this.copyBattleCode());
        
        // Command Deck: Share battle code button
        document.getElementById('share-code-btn').addEventListener('click', () => this.shareBattleCode());
        
        // Command Deck: Enter key on join code input
        document.getElementById('join-code-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinBattle();
        });
        
        // Ship placement: Rotate ship orientation button
        document.getElementById('rotate-btn').addEventListener('click', () => this.toggleOrientation());
        
        // Ship placement: Random placement button
        document.getElementById('random-btn').addEventListener('click', () => this.randomPlacement());
        
        // Ship placement: Confirm ships button
        document.getElementById('confirm-ships-btn').addEventListener('click', () => this.confirmShips());
        
        // Game over: Play again button
        document.getElementById('play-again-btn').addEventListener('click', () => this.playAgain());
        
        // Ship selection: Click on ship items to select
        document.querySelectorAll('.ship-item').forEach(item => {
            item.addEventListener('click', () => this.selectShip(item));
        });
    }

    /**
     * joinGame - Join Game Handler
     * 
     * Validates username input and saves it to localStorage.
     * Shows the command deck screen for matchmaking options.
     * 
     * @returns {void}
     */
    joinGame() {
        // Get username from input and trim whitespace
        const username = document.getElementById('username-input').value.trim();
        
        // Validate username is not empty
        if (!username) {
            alert('Please enter a username');
            return;
        }
        
        // Store username in instance and localStorage
        this.username = username;
        localStorage.setItem('battleship_username', username);
        
        // Show command deck instead of directly connecting
        // This allows user to choose matchmaking method
        this.showCommandDeck();
    }

    /**
     * showCommandDeck - Display Command Deck Screen
     * 
     * Shows the command deck interface where players can choose
     * how to join a game (random match, create room, or join room).
     * Generates a new battle code for room creation.
     * 
     * @returns {void}
     */
    showCommandDeck() {
        // Show the command deck screen
        this.showScreen('command-deck-screen');
        
        // Display player's username as captain name
        document.getElementById('captain-name').textContent = this.username;
        
        // Generate a new battle code for room creation
        this.generateBattleCode();
        
        // Clear the join code input field
        document.getElementById('join-code-input').value = '';
    }

    /**
     * generateBattleCode - Generate Battle Code
     * 
     * Generates a random 6-character alphanumeric battle code
     * for private room creation. Updates the UI with the code.
     * 
     * @returns {void}
     */
    generateBattleCode() {
        // Characters available for battle code (uppercase letters and numbers)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        
        // Generate 6 random characters
        for (let i = 0; i < 6; i++) {
            // Pick random character from available set
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        // Store battle code and update UI
        this.battleCode = code;
        document.getElementById('launch-code').value = code;
    }

    /**
     * logout - Logout Handler
     * 
     * Clears username from localStorage and instance.
     * Closes WebSocket connection if open.
     * Returns to username entry screen.
     * 
     * @returns {void}
     */
    logout() {
        // Clear username
        this.username = '';
        localStorage.removeItem('battleship_username');
        
        // Show username screen
        this.showScreen('username-screen');
        
        // Close WebSocket connection if it exists
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * startRandomMatch - Start Random Matchmaking
     * 
     * Sets up for random matchmaking and connects to WebSocket server.
     * 
     * @returns {void}
     */
    startRandomMatch() {
        // Set join mode to random matchmaking
        this.joinMode = 'random';
        
        // Clear battle code (not needed for random matches)
        this.battleCode = null;
        
        // Connect to WebSocket server
        this.connectWebSocket();
    }

    /**
     * launchOperation - Launch Operation (Create Room)
     * 
     * Creates a private room with a battle code.
     * Generates battle code if not already set, then connects.
     * 
     * @returns {void}
     */
    launchOperation() {
        // Generate battle code if not already set
        if (!this.battleCode) {
            this.generateBattleCode();
        }
        
        // Set join mode to create room
        this.joinMode = 'create';
        
        // Connect to WebSocket server
        this.connectWebSocket();
    }

    /**
     * joinBattle - Join Battle (Join Room)
     * 
     * Validates and uses the entered battle code to join an existing room.
     * 
     * @returns {void}
     */
    joinBattle() {
        // Get battle code from input, trim and convert to uppercase
        const code = document.getElementById('join-code-input').value.trim().toUpperCase();
        
        // Validate battle code is 6 characters
        if (!code || code.length !== 6) {
            alert('Please enter a valid 6-character battle code');
            return;
        }
        
        // Store battle code and set join mode
        this.battleCode = code;
        this.joinMode = 'join';
        
        // Connect to WebSocket server
        this.connectWebSocket();
    }

    /**
     * copyBattleCode - Copy Battle Code to Clipboard
     * 
     * Copies the current battle code to the system clipboard.
     * Uses modern Clipboard API with fallback for older browsers.
     * 
     * @returns {void}
     */
    copyBattleCode() {
        // Get the code input element
        const codeInput = document.getElementById('launch-code');
        
        // Select the text in the input
        codeInput.select();
        codeInput.setSelectionRange(0, 99999); // For mobile devices
        
        // Try modern clipboard API
        navigator.clipboard.writeText(this.battleCode).then(() => {
            alert('Battle code copied to clipboard!');
        }).catch(() => {
            // Fallback for older browsers - use execCommand
            document.execCommand('copy');
            alert('Battle code copied!');
        });
    }

    /**
     * shareBattleCode - Share Battle Code
     * 
     * Uses Web Share API if available, otherwise falls back to copy.
     * 
     * @returns {void}
     */
    shareBattleCode() {
        // Check if Web Share API is available
        if (navigator.share) {
            // Use native share dialog
            navigator.share({
                title: 'Battleship Battle Code',
                text: `Join my Battleship game! Code: ${this.battleCode}`,
            }).catch(() => {
                // If share fails, fall back to copy
                this.copyBattleCode();
            });
        } else {
            // Fallback to copy method
            this.copyBattleCode();
        }
    }

    /**
     * connectWebSocket - Establish WebSocket Connection
     * 
     * Creates WebSocket connection to game server and sets up message handlers.
     * Sends join message with username and matchmaking mode.
     * 
     * @returns {void}
     */
    connectWebSocket() {
        // Show waiting screen while connecting
        this.showScreen('waiting-screen');
        
        // Determine WebSocket protocol (wss for https, ws for http)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        
        // WebSocket server URL (hardcoded for deployment)
        const wsUrl = `wss://navalstrikee-2.onrender.com`;
        
        // Create WebSocket connection
        this.ws = new WebSocket(wsUrl);
        
        // Handle connection opened
        this.ws.onopen = () => {
            console.log('Connected to server');
            
            // Build join message
            const message = {
                type: 'join',
                username: this.username
            };
            
            // Add mode and battle code based on join mode
            if (this.joinMode === 'random') {
                message.mode = 'random';
            } else if (this.joinMode === 'create') {
                message.mode = 'create';
                message.battleCode = this.battleCode;
            } else if (this.joinMode === 'join') {
                message.mode = 'join';
                message.battleCode = this.battleCode;
            }
            
            // Send join message to server
            this.ws.send(JSON.stringify(message));
        };
        
        // Handle incoming messages
        this.ws.onmessage = (event) => {
            // Parse JSON message
            const data = JSON.parse(event.data);
            
            // Route to message handler
            this.handleMessage(data);
        };
        
        // Handle connection errors
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            alert('Failed to connect to server. Make sure the server is running.');
            
            // Return to command deck on error
            this.showScreen('command-deck-screen');
        };
        
        // Handle connection closed
        this.ws.onclose = () => {
            console.log('Disconnected from server');
        };
    }

    /**
     * handleMessage - WebSocket Message Handler
     * 
     * Routes incoming server messages to appropriate handlers based on message type.
     * Updates game state and UI accordingly.
     * 
     * @param {Object} data Parsed JSON message from server
     * @returns {void}
     */
    handleMessage(data) {
        console.log('Received:', data);
        
        // Route message based on type
        switch (data.type) {
            case 'waiting':
                // Update waiting message text
                document.getElementById('waiting-message').textContent = data.message;
                break;
                
            case 'game_start':
                // Store player number and opponent name
                this.playerNumber = data.playerNumber;
                this.opponentName = data.opponent;
                
                // Start the game (show placement screen)
                this.startGame();
                break;
                
            case 'ships_confirmed':
                // Update player status to ready
                document.getElementById('player-status').textContent = 'Ready';
                break;
                
            case 'both_ready':
                // Both players ready - start battle phase
                this.myTurn = data.yourTurn;
                this.startBattle();
                break;
                
            case 'attack_result':
                // Handle result of our attack
                this.handleAttackResult(data);
                break;
                
            case 'opponent_attack':
                // Handle opponent's attack on our board
                this.handleOpponentAttack(data);
                break;
                
            case 'ship_sunk':
                // Track that we sunk opponent's ship
                if (!this.opponentSunkShips.includes(data.ship)) {
                    this.opponentSunkShips.push(data.ship);
                    this.addBattleLog(`You sunk the opponent's ${data.ship}!`, 'log-sunk');
                }
                break;
                
            case 'your_ship_sunk':
                // Track that our ship was sunk
                if (!this.mySunkShips.includes(data.ship)) {
                    this.mySunkShips.push(data.ship);
                    this.updateCrewStatus();
                    this.addBattleLog(`Your ${data.ship} was sunk!`, 'log-sunk');
                }
                break;
                
            case 'game_over':
                // Handle game end
                this.handleGameOver(data.winner);
                break;
                
            case 'opponent_disconnected':
                // Handle opponent disconnection
                alert(data.message);
                this.showCommandDeck();
                break;
                
            case 'error':
                // Handle server error messages
                alert(data.message);
                
                // If we're in waiting state, return to command deck
                if (document.getElementById('waiting-screen').classList.contains('active')) {
                    this.showScreen('command-deck-screen');
                }
                break;
        }
    }

    /**
     * startGame - Start Game Phase
     * 
     * Transitions to game screen and displays player/opponent names.
     * Renders the ship placement board.
     * 
     * @returns {void}
     */
    startGame() {
        // Show game screen
        this.showScreen('game-screen');
        
        // Display player names
        document.getElementById('player-name').textContent = this.username;
        document.getElementById('opponent-name').textContent = this.opponentName;
        
        // Render the ship placement board
        this.renderPlacementBoard();
    }

    /**
     * renderPlacementBoard - Render Ship Placement Board
     * 
     * Creates and displays the 10x10 grid for ship placement.
     * Adds hover and click handlers for ship placement.
     * 
     * @returns {void}
     */
    renderPlacementBoard() {
        // Get the board container element
        const board = document.getElementById('placement-board');
        
        // Clear existing board content
        board.innerHTML = '';
        
        // Create grid cells
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                // Create cell element
                const cell = document.createElement('div');
                cell.className = 'cell';
                
                // Store row/col in data attributes for event handling
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                // Add ship class if ship is placed here
                if (this.playerBoard[row][col].ship) {
                    cell.classList.add('ship');
                }
                
                // Add hover handlers for ship preview
                cell.addEventListener('mouseenter', () => this.previewShip(row, col, true));
                cell.addEventListener('mouseleave', () => this.previewShip(row, col, false));
                
                // Add click handler for ship placement
                cell.addEventListener('click', () => this.placeShip(row, col));
                
                // Append cell to board
                board.appendChild(cell);
            }
        }
    }

    /**
     * selectShip - Select Ship for Placement
     * 
     * Marks a ship as selected for placement. Only allows selection
     * of ships that haven't been placed yet.
     * 
     * @param {HTMLElement} item The ship item element that was clicked
     * @returns {void}
     */
    selectShip(item) {
        // Don't allow selecting already placed ships
        if (item.classList.contains('placed')) return;
        
        // Remove selection from all ships
        document.querySelectorAll('.ship-item').forEach(el => el.classList.remove('selected'));
        
        // Mark this ship as selected
        item.classList.add('selected');
        
        // Store selected ship info
        this.currentShip = {
            name: item.dataset.ship,                    // Ship name from data attribute
            size: parseInt(item.dataset.size)           // Ship size from data attribute
        };
    }

    /**
     * toggleOrientation - Toggle Ship Orientation
     * 
     * Switches between horizontal and vertical ship placement.
     * Updates button text to reflect current orientation.
     * 
     * @returns {void}
     */
    toggleOrientation() {
        // Toggle between horizontal and vertical
        this.shipOrientation = this.shipOrientation === 'horizontal' ? 'vertical' : 'horizontal';
        
        // Update button text to show current orientation
        document.getElementById('rotate-btn').textContent = 
            `Rotate Ship (${this.shipOrientation})`;
    }

    /**
     * previewShip - Preview Ship Placement
     * 
     * Shows visual preview of where ship would be placed.
     * Highlights cells in green (valid) or red (invalid).
     * 
     * @param {number} row Starting row coordinate
     * @param {number} col Starting column coordinate
     * @param {boolean} show Whether to show (true) or hide (false) preview
     * @returns {void}
     */
    previewShip(row, col, show) {
        // If no ship selected or hiding preview, clear all preview highlights
        if (!this.currentShip || !show) {
            document.querySelectorAll('.cell.hover-valid, .cell.hover-invalid').forEach(cell => {
                cell.classList.remove('hover-valid', 'hover-invalid');
            });
            return;
        }
        
        // Check if ship can be placed at this location
        const valid = this.canPlaceShip(row, col, this.currentShip.size, this.shipOrientation);
        
        // Get all cells the ship would occupy
        const cells = this.getShipCells(row, col, this.currentShip.size, this.shipOrientation);
        
        // Highlight each cell with appropriate class
        cells.forEach(([r, c]) => {
            const cell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            if (cell) {
                // Add valid (green) or invalid (red) highlight class
                cell.classList.add(valid ? 'hover-valid' : 'hover-invalid');
            }
        });
    }

    /**
     * canPlaceShip - Check if Ship Can Be Placed
     * 
     * Validates that a ship can be placed at the given location:
     * - All cells must be within grid bounds
     * - All cells must be empty (no existing ship)
     * 
     * @param {number} row Starting row coordinate
     * @param {number} col Starting column coordinate
     * @param {number} size Number of cells the ship occupies
     * @param {string} orientation 'horizontal' or 'vertical'
     * @returns {boolean} True if ship can be placed, false otherwise
     */
    canPlaceShip(row, col, size, orientation) {
        // Get all cells the ship would occupy
        const cells = this.getShipCells(row, col, size, orientation);
        
        // Check each cell
        for (const [r, c] of cells) {
            // Check if cell is out of bounds
            if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
                return false;
            }
            
            // Check if cell already has a ship
            if (this.playerBoard[r][c].ship) {
                return false;
            }
        }
        
        // All checks passed - ship can be placed
        return true;
    }

    /**
     * getShipCells - Get Ship Cell Coordinates
     * 
     * Calculates all grid coordinates that a ship would occupy
     * based on starting position, size, and orientation.
     * 
     * @param {number} row Starting row coordinate
     * @param {number} col Starting column coordinate
     * @param {number} size Number of cells the ship occupies
     * @param {string} orientation 'horizontal' or 'vertical'
     * @returns {Array<Array<number>>} Array of [row, col] coordinate pairs
     */
    getShipCells(row, col, size, orientation) {
        const cells = [];
        
        // Generate coordinates for each cell of the ship
        for (let i = 0; i < size; i++) {
            if (orientation === 'horizontal') {
                // Horizontal: increment column
                cells.push([row, col + i]);
            } else {
                // Vertical: increment row
                cells.push([row + i, col]);
            }
        }
        
        return cells;
    }

    /**
     * placeShip - Place Ship on Board
     * 
     * Places the currently selected ship at the clicked location.
     * Updates board state and marks ship as placed.
     * 
     * @param {number} row Row coordinate where ship was clicked
     * @param {number} col Column coordinate where ship was clicked
     * @returns {void}
     */
    placeShip(row, col) {
        // Validate ship is selected
        if (!this.currentShip) {
            alert('Please select a ship first');
            return;
        }
        
        // Validate placement is valid
        if (!this.canPlaceShip(row, col, this.currentShip.size, this.shipOrientation)) {
            alert('Cannot place ship here');
            return;
        }
        
        // Get all cells the ship will occupy
        const cells = this.getShipCells(row, col, this.currentShip.size, this.shipOrientation);
        const positions = [];
        
        // Mark each cell with the ship name
        cells.forEach(([r, c]) => {
            this.playerBoard[r][c].ship = this.currentShip.name;
            positions.push({ row: r, col: c });
        });
        
        // Add ship to placed ships array
        this.placedShips.push({
            name: this.currentShip.name,
            positions: positions
        });
        
        // Mark ship item as placed in UI
        document.querySelector(`.ship-item[data-ship="${this.currentShip.name}"]`).classList.add('placed');
        
        // Clear current ship selection
        this.currentShip = null;
        document.querySelectorAll('.ship-item').forEach(el => el.classList.remove('selected'));
        
        // Re-render board to show placed ship
        this.renderPlacementBoard();
        
        // If all ships placed, enable confirm button
        if (this.placedShips.length === SHIPS.length) {
            document.getElementById('confirm-ships-btn').disabled = false;
        }
    }

    /**
     * randomPlacement - Random Ship Placement
     * 
     * Automatically places all ships randomly on the board.
     * Uses random positions and orientations until valid placement found.
     * 
     * @returns {void}
     */
    randomPlacement() {
        // Reset placed ships and board
        this.placedShips = [];
        this.initializeBoards();
        
        // Clear placed status from all ship items
        document.querySelectorAll('.ship-item').forEach(el => el.classList.remove('placed'));
        
        // Disable confirm button until all ships placed
        document.getElementById('confirm-ships-btn').disabled = true;
        
        // Place each ship randomly
        SHIPS.forEach(ship => {
            let placed = false;
            
            // Keep trying until valid placement found
            while (!placed) {
                // Generate random starting position
                const row = Math.floor(Math.random() * GRID_SIZE);
                const col = Math.floor(Math.random() * GRID_SIZE);
                
                // Random orientation (50/50 horizontal/vertical)
                const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
                
                // Try to place ship at this location
                if (this.canPlaceShip(row, col, ship.size, orientation)) {
                    // Get cells ship will occupy
                    const cells = this.getShipCells(row, col, ship.size, orientation);
                    const positions = [];
                    
                    // Mark cells with ship name
                    cells.forEach(([r, c]) => {
                        this.playerBoard[r][c].ship = ship.name;
                        positions.push({ row: r, col: c });
                    });
                    
                    // Add to placed ships
                    this.placedShips.push({
                        name: ship.name,
                        positions: positions
                    });
                    
                    // Mark as placed
                    placed = true;
                }
            }
        });
        
        // Mark all ships as placed in UI
        document.querySelectorAll('.ship-item').forEach(el => el.classList.add('placed'));
        
        // Enable confirm button
        document.getElementById('confirm-ships-btn').disabled = false;
        
        // Re-render board to show all placed ships
        this.renderPlacementBoard();
    }

    /**
     * confirmShips - Confirm Ship Placements
     * 
     * Sends ship placements to server for validation and game start.
     * Disables confirm button to prevent duplicate submissions.
     * 
     * @returns {void}
     */
    confirmShips() {
        // Send ship placements to server
        this.ws.send(JSON.stringify({
            type: 'ships_placed',
            ships: this.placedShips
        }));
        
        // Update UI to show ready status
        document.getElementById('player-status').textContent = 'Ready';
        
        // Disable confirm button
        document.getElementById('confirm-ships-btn').disabled = true;
    }

    /**
     * startBattle - Start Battle Phase
     * 
     * Transitions from ship placement phase to battle phase.
     * Hides placement UI and shows battle boards.
     * 
     * @returns {void}
     */
    startBattle() {
        // Hide placement phase UI
        document.getElementById('placement-phase').style.display = 'none';
        
        // Show battle phase UI
        document.getElementById('battle-phase').style.display = 'block';
        
        // Update status indicators
        document.getElementById('player-status').textContent = 'In Battle';
        document.getElementById('opponent-status').textContent = 'In Battle';
        
        // Reset sunk ships tracking
        this.mySunkShips = [];
        this.opponentSunkShips = [];
        
        // Initialize crew status (all ships engaged)
        this.updateCrewStatus();
        
        // Clear and initialize battle log
        const battleLog = document.getElementById('battle-log');
        battleLog.innerHTML = '';
        this.addBattleLog('Fleet mobilized. Battle commenced!', 'log-info');
        
        // Render both boards
        this.renderPlayerBoard();
        this.renderOpponentBoard();
        
        // Update turn indicator
        this.updateTurnMessage();
    }

    /**
     * renderPlayerBoard - Render Player's Board
     * 
     * Displays the player's own board showing:
     * - Ship positions (visible to player)
     * - Hit markers (red)
     * - Miss markers (white)
     * 
     * @returns {void}
     */
    renderPlayerBoard() {
        // Get player board container
        const board = document.getElementById('player-board');
        
        // Clear existing content
        board.innerHTML = '';
        
        // Create grid cells
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                // Create cell element
                const cell = document.createElement('div');
                cell.className = 'cell';
                
                // Add ship class if ship is here
                if (this.playerBoard[row][col].ship) {
                    cell.classList.add('ship');
                }
                
                // Add hit class if this cell was hit
                if (this.playerBoard[row][col].hit) {
                    cell.classList.add('hit');
                } 
                // Add miss class if opponent missed here
                else if (this.playerBoard[row][col].miss) {
                    cell.classList.add('miss');
                }
                
                // Append cell to board
                board.appendChild(cell);
            }
        }
    }

    /**
     * renderOpponentBoard - Render Opponent's Board
     * 
     * Displays the opponent's board showing:
     * - Hit markers (red) where we hit ships
     * - Miss markers (white) where we missed
     * - Clickable cells (when it's our turn)
     * 
     * @returns {void}
     */
    renderOpponentBoard() {
        // Get opponent board container
        const board = document.getElementById('opponent-board');
        
        // Clear existing content
        board.innerHTML = '';
        
        // Create grid cells
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                // Create cell element
                const cell = document.createElement('div');
                cell.className = 'cell';
                
                // Store coordinates for click handling
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                // Get cell state data
                const cellData = this.opponentBoard[row][col];
                
                // Add hit class if we hit here
                if (cellData.hit) {
                    cell.classList.add('hit');
                } 
                // Add miss class if we missed here
                else if (cellData.miss) {
                    cell.classList.add('miss');
                } 
                // If it's our turn, make cell clickable for attacks
                else if (this.myTurn) {
                    cell.classList.add('attackable');
                    cell.addEventListener('click', () => this.attack(row, col));
                }
                
                // Append cell to board
                board.appendChild(cell);
            }
        }
    }

    /**
     * attack - Execute Attack
     * 
     * Sends attack coordinates to server when player clicks opponent's board.
     * Validates it's player's turn and cell hasn't been attacked.
     * 
     * @param {number} row Row coordinate to attack
     * @param {number} col Column coordinate to attack
     * @returns {void}
     */
    attack(row, col) {
        // Validate it's player's turn
        if (!this.myTurn) {
            alert("It's not your turn!");
            return;
        }
        
        // Validate cell hasn't been attacked
        if (this.opponentBoard[row][col].hit || this.opponentBoard[row][col].miss) {
            alert('You already attacked this cell!');
            return;
        }
        
        // Send attack to server
        this.ws.send(JSON.stringify({
            type: 'attack',
            row: row,
            col: col
        }));
    }

    /**
     * handleAttackResult - Handle Attack Result
     * 
     * Updates opponent board with hit/miss result from our attack.
     * Updates turn status and re-renders board.
     * 
     * @param {Object} data Attack result data from server
     * @param {number} data.row Row coordinate attacked
     * @param {number} data.col Column coordinate attacked
     * @param {boolean} data.hit Whether attack was a hit
     * @param {boolean} data.yourTurn Whether it's still our turn
     * @returns {void}
     */
    handleAttackResult(data) {
        // Update opponent board with hit or miss
        if (data.hit) {
            this.opponentBoard[data.row][data.col].hit = true;
            // Log successful hit
            const coord = String.fromCharCode(65 + data.row) + (data.col + 1); // Convert to A1, B2, etc.
            this.addBattleLog(`Hit at ${coord}!`, 'log-hit');
        } else {
            this.opponentBoard[data.row][data.col].miss = true;
            // Log miss
            const coord = String.fromCharCode(65 + data.row) + (data.col + 1);
            this.addBattleLog(`Miss at ${coord}`, 'log-miss');
        }
        
        // Update turn status
        this.myTurn = data.yourTurn;
        
        // Re-render boards to show updated state
        this.renderOpponentBoard();
        this.updateTurnMessage();
    }

    /**
     * handleOpponentAttack - Handle Opponent's Attack
     * 
     * Updates player board when opponent attacks.
     * Updates turn status and re-renders both boards.
     * 
     * @param {Object} data Opponent attack data from server
     * @param {number} data.row Row coordinate attacked
     * @param {number} data.col Column coordinate attacked
     * @param {boolean} data.hit Whether attack was a hit
     * @param {boolean} data.yourTurn Whether it's now our turn
     * @returns {void}
     */
    handleOpponentAttack(data) {
        // Update player board with hit or miss
        if (data.hit) {
            this.playerBoard[data.row][data.col].hit = true;
            // Log opponent's hit
            const coord = String.fromCharCode(65 + data.row) + (data.col + 1);
            this.addBattleLog(`Enemy hit at ${coord}!`, 'log-hit');
        } else {
            this.playerBoard[data.row][data.col].miss = true;
            // Log opponent's miss
            const coord = String.fromCharCode(65 + data.row) + (data.col + 1);
            this.addBattleLog(`Enemy missed at ${coord}`, 'log-miss');
        }
        
        // Update turn status
        this.myTurn = data.yourTurn;
        
        // Re-render both boards to show updated state
        this.renderPlayerBoard();
        this.renderOpponentBoard();
        this.updateTurnMessage();
    }

    /**
     * updateTurnMessage - Update Turn Indicator
     * 
     * Updates the turn message display to show whose turn it is.
     * Changes color based on whether it's player's turn.
     * 
     * @returns {void}
     */
    updateTurnMessage() {
        // Get turn message element
        const message = document.getElementById('turn-message');
        
        if (this.myTurn) {
            // It's player's turn - show green "Your Turn" message
            message.textContent = 'Your Turn - Attack!';
            message.style.color = '#4CAF50';
        } else {
            // It's opponent's turn - show orange "Opponent's Turn" message
            message.textContent = "Opponent's Turn";
            message.style.color = '#FFA500';
        }
    }

    /**
     * handleGameOver - Handle Game End
     * 
     * Displays game over screen with win/loss message.
     * Shows appropriate styling based on result.
     * Clears localStorage and resets game state.
     * 
     * @param {boolean} winner True if player won, false if lost
     * @returns {void}
     */
    handleGameOver(winner) {
        // Show game over screen
        this.showScreen('game-over-screen');
        
        // Get result message elements
        const resultMessage = document.getElementById('result-message');
        const resultDetail = document.getElementById('result-detail');
        
        if (winner) {
            // Player won - show victory message
            resultMessage.textContent = '🎉 Victory!';
            resultMessage.className = 'winner';
            resultDetail.textContent = 'You defeated ' + this.opponentName + '!';
        } else {
            // Player lost - show defeat message
            resultMessage.textContent = '💀 Defeat';
            resultMessage.className = 'loser';
            resultDetail.textContent = this.opponentName + ' won this battle.';
        }
        
        // Clear localStorage (except username which is useful to keep)
        const savedUsername = localStorage.getItem('battleship_username');
        localStorage.clear();
        if (savedUsername) {
            localStorage.setItem('battleship_username', savedUsername);
        }
        
        // Reset all game state
        this.resetGameState();
    }

    /**
     * playAgain - Play Again Handler
     * 
     * Resets game state and returns to command deck.
     * Closes WebSocket connection.
     * 
     * @returns {void}
     */
    playAgain() {
        // Reset all game state
        this.resetGameState();
        
        // Close WebSocket connection
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        // Return to command deck
        this.showCommandDeck();
    }
    
    /**
     * resetGameState - Reset All Game State
     * 
     * Clears all game-related state variables to prepare for a new game.
     * This ensures no old game data persists when starting a new game.
     * 
     * @returns {void}
     */
    resetGameState() {
        // Reset player number and opponent
        this.playerNumber = null;
        this.opponentName = '';
        
        // Reset ship placement state
        this.currentShip = null;
        this.shipOrientation = 'horizontal';
        this.placedShips = [];
        
        // Reset boards
        this.initializeBoards();
        
        // Reset turn and battle state
        this.myTurn = false;
        this.mySunkShips = [];
        this.opponentSunkShips = [];
        
        // Reset battle code and join mode
        this.battleCode = null;
        this.joinMode = null;
        
        // Reset ship placement UI
        document.querySelectorAll('.ship-item').forEach(el => {
            el.classList.remove('placed', 'selected');
        });
        
        // Reset placement button
        const confirmBtn = document.getElementById('confirm-ships-btn');
        if (confirmBtn) {
            confirmBtn.disabled = true;
        }
        
        // Reset rotate button text
        const rotateBtn = document.getElementById('rotate-btn');
        if (rotateBtn) {
            rotateBtn.textContent = 'Rotate Ship (horizontal)';
        }
        
        // Reset phase displays
        const placementPhase = document.getElementById('placement-phase');
        const battlePhase = document.getElementById('battle-phase');
        if (placementPhase) placementPhase.style.display = 'block';
        if (battlePhase) battlePhase.style.display = 'none';
        
        // Clear battle log
        const battleLog = document.getElementById('battle-log');
        if (battleLog) {
            battleLog.innerHTML = '';
        }
    }

    /**
     * updateCrewStatus - Update Battleship Crew Status
     * 
     * Updates the Operational Readiness section to show which ships
     * are still engaged (operational) and which have been sunk.
     * 
     * @returns {void}
     */
    updateCrewStatus() {
        // Get all crew items
        const crewItems = document.querySelectorAll('.crew-item');
        
        // Update each ship's status
        crewItems.forEach(item => {
            const shipName = item.dataset.ship;
            const statusElement = item.querySelector('.crew-status');
            
            // Check if this ship has been sunk
            if (this.mySunkShips.includes(shipName)) {
                // Ship is sunk - update status
                statusElement.textContent = 'Sunk';
                statusElement.className = 'crew-status sunk';
            } else {
                // Ship is still engaged
                statusElement.textContent = 'Engaged';
                statusElement.className = 'crew-status engaged';
            }
        });
    }

    /**
     * addBattleLog - Add Entry to Battle Log
     * 
     * Adds a new entry to the battle log with optional styling class.
     * Automatically scrolls to show the latest entry.
     * 
     * @param {string} message The log message to display
     * @param {string} logClass Optional CSS class for styling (log-hit, log-sunk, log-miss, log-info)
     * @returns {void}
     */
    addBattleLog(message, logClass = '') {
        // Get battle log container
        const battleLog = document.getElementById('battle-log');
        
        // Create new log entry element
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry' + (logClass ? ' ' + logClass : '');
        logEntry.textContent = message;
        
        // Add to log (append to bottom)
        battleLog.appendChild(logEntry);
        
        // Auto-scroll to bottom to show latest entry
        battleLog.scrollTop = battleLog.scrollHeight;
        
        // Limit log entries to prevent memory issues (keep last 50 entries)
        const logEntries = battleLog.querySelectorAll('.log-entry');
        if (logEntries.length > 50) {
            logEntries[0].remove();
        }
    }

    /**
     * showScreen - Show Screen Helper
     * 
     * Utility function to switch between different UI screens.
     * Hides all screens and shows the requested one.
     * 
     * @param {string} screenId ID of the screen element to show
     * @returns {void}
     */
    showScreen(screenId) {
        // Remove active class from all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Add active class to requested screen
        document.getElementById(screenId).classList.add('active');
    }
}

/**
 * DOMContentLoaded Event Listener
 * 
 * Initializes the game when the DOM is fully loaded.
 * Creates a new BattleshipGame instance to start the application.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Create and start the game
    new BattleshipGame();
});
