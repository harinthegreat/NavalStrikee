const GRID_SIZE = 10;
const SHIPS = [
    { name: 'carrier', size: 5 },
    { name: 'battleship', size: 4 },
    { name: 'cruiser', size: 3 },
    { name: 'submarine', size: 3 },
    { name: 'destroyer', size: 2 }
];

class BattleshipGame {
    constructor() {
        this.ws = null;
        this.username = localStorage.getItem('battleship_username') || '';
        this.playerNumber = null;
        this.opponentName = '';
        this.currentShip = null;
        this.shipOrientation = 'horizontal';
        this.placedShips = [];
        this.playerBoard = [];
        this.opponentBoard = [];
        this.myTurn = false;
        this.battleCode = null;
        this.joinMode = null; // 'random', 'create', 'join'
        
        this.initializeBoards();
        this.setupEventListeners();
        this.showScreen('username-screen');
        
        if (this.username) {
            document.getElementById('username-input').value = this.username;
        }
    }

    initializeBoards() {
        for (let i = 0; i < GRID_SIZE; i++) {
            this.playerBoard[i] = [];
            this.opponentBoard[i] = [];
            for (let j = 0; j < GRID_SIZE; j++) {
                this.playerBoard[i][j] = { ship: null, hit: false, miss: false };
                this.opponentBoard[i][j] = { hit: false, miss: false };
            }
        }
    }

    setupEventListeners() {
        document.getElementById('join-btn').addEventListener('click', () => this.joinGame());
        document.getElementById('username-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinGame();
        });
        
        // Command Deck listeners
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        document.getElementById('random-match-btn').addEventListener('click', () => this.startRandomMatch());
        document.getElementById('launch-armada-btn').addEventListener('click', () => this.launchOperation());
        document.getElementById('board-ship-btn').addEventListener('click', () => this.joinBattle());
        document.getElementById('copy-code-btn').addEventListener('click', () => this.copyBattleCode());
        document.getElementById('share-code-btn').addEventListener('click', () => this.shareBattleCode());
        document.getElementById('join-code-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinBattle();
        });
        
        document.getElementById('rotate-btn').addEventListener('click', () => this.toggleOrientation());
        document.getElementById('random-btn').addEventListener('click', () => this.randomPlacement());
        document.getElementById('confirm-ships-btn').addEventListener('click', () => this.confirmShips());
        document.getElementById('play-again-btn').addEventListener('click', () => this.playAgain());
        
        document.querySelectorAll('.ship-item').forEach(item => {
            item.addEventListener('click', () => this.selectShip(item));
        });
    }

    joinGame() {
        const username = document.getElementById('username-input').value.trim();
        if (!username) {
            alert('Please enter a username');
            return;
        }
        
        this.username = username;
        localStorage.setItem('battleship_username', username);
        
        // Show command deck instead of directly connecting
        this.showCommandDeck();
    }

    showCommandDeck() {
        this.showScreen('command-deck-screen');
        document.getElementById('captain-name').textContent = this.username;
        this.generateBattleCode();
        // Clear join code input
        document.getElementById('join-code-input').value = '';
    }

    generateBattleCode() {
        // Generate a 6-character alphanumeric code
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        this.battleCode = code;
        document.getElementById('launch-code').value = code;
    }

    logout() {
        this.username = '';
        localStorage.removeItem('battleship_username');
        this.showScreen('username-screen');
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    startRandomMatch() {
        this.joinMode = 'random';
        this.battleCode = null;
        this.connectWebSocket();
    }

    launchOperation() {
        if (!this.battleCode) {
            this.generateBattleCode();
        }
        this.joinMode = 'create';
        this.connectWebSocket();
    }

    joinBattle() {
        const code = document.getElementById('join-code-input').value.trim().toUpperCase();
        if (!code || code.length !== 6) {
            alert('Please enter a valid 6-character battle code');
            return;
        }
        this.battleCode = code;
        this.joinMode = 'join';
        this.connectWebSocket();
    }

    copyBattleCode() {
        const codeInput = document.getElementById('launch-code');
        codeInput.select();
        codeInput.setSelectionRange(0, 99999); // For mobile devices
        navigator.clipboard.writeText(this.battleCode).then(() => {
            alert('Battle code copied to clipboard!');
        }).catch(() => {
            // Fallback for older browsers
            document.execCommand('copy');
            alert('Battle code copied!');
        });
    }

    shareBattleCode() {
        if (navigator.share) {
            navigator.share({
                title: 'Battleship Battle Code',
                text: `Join my Battleship game! Code: ${this.battleCode}`,
            }).catch(() => {
                this.copyBattleCode();
            });
        } else {
            this.copyBattleCode();
        }
    }

    connectWebSocket() {
        this.showScreen('waiting-screen');
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const wsUrl = `https://navalstrikee-2.onrender.com`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('Connected to server');
            const message = {
                type: 'join',
                username: this.username
            };
            
            if (this.joinMode === 'random') {
                message.mode = 'random';
            } else if (this.joinMode === 'create') {
                message.mode = 'create';
                message.battleCode = this.battleCode;
            } else if (this.joinMode === 'join') {
                message.mode = 'join';
                message.battleCode = this.battleCode;
            }
            
            this.ws.send(JSON.stringify(message));
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            alert('Failed to connect to server. Make sure the server is running.');
            this.showScreen('command-deck-screen');
        };
        
        this.ws.onclose = () => {
            console.log('Disconnected from server');
        };
    }

    handleMessage(data) {
        console.log('Received:', data);
        
        switch (data.type) {
            case 'waiting':
                document.getElementById('waiting-message').textContent = data.message;
                break;
            case 'game_start':
                this.playerNumber = data.playerNumber;
                this.opponentName = data.opponent;
                this.startGame();
                break;
            case 'ships_confirmed':
                document.getElementById('player-status').textContent = 'Ready';
                break;
            case 'both_ready':
                this.myTurn = data.yourTurn;
                this.startBattle();
                break;
            case 'attack_result':
                this.handleAttackResult(data);
                break;
            case 'opponent_attack':
                this.handleOpponentAttack(data);
                break;
            case 'ship_sunk':
                alert(`You sunk the opponent's ${data.ship}!`);
                break;
            case 'your_ship_sunk':
                alert(`Your ${data.ship} was sunk!`);
                break;
            case 'game_over':
                this.handleGameOver(data.winner);
                break;
            case 'opponent_disconnected':
                alert(data.message);
                this.showCommandDeck();
                break;
            case 'error':
                alert(data.message);
                // If we're in waiting state and get an error, go back to command deck
                if (document.getElementById('waiting-screen').classList.contains('active')) {
                    this.showScreen('command-deck-screen');
                }
                break;
        }
    }

    startGame() {
        this.showScreen('game-screen');
        document.getElementById('player-name').textContent = this.username;
        document.getElementById('opponent-name').textContent = this.opponentName;
        
        this.renderPlacementBoard();
    }

    renderPlacementBoard() {
        const board = document.getElementById('placement-board');
        board.innerHTML = '';
        
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                if (this.playerBoard[row][col].ship) {
                    cell.classList.add('ship');
                }
                
                cell.addEventListener('mouseenter', () => this.previewShip(row, col, true));
                cell.addEventListener('mouseleave', () => this.previewShip(row, col, false));
                cell.addEventListener('click', () => this.placeShip(row, col));
                
                board.appendChild(cell);
            }
        }
    }

    selectShip(item) {
        if (item.classList.contains('placed')) return;
        
        document.querySelectorAll('.ship-item').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        
        this.currentShip = {
            name: item.dataset.ship,
            size: parseInt(item.dataset.size)
        };
    }

    toggleOrientation() {
        this.shipOrientation = this.shipOrientation === 'horizontal' ? 'vertical' : 'horizontal';
        document.getElementById('rotate-btn').textContent = 
            `Rotate Ship (${this.shipOrientation})`;
    }

    previewShip(row, col, show) {
        if (!this.currentShip || !show) {
            document.querySelectorAll('.cell.hover-valid, .cell.hover-invalid').forEach(cell => {
                cell.classList.remove('hover-valid', 'hover-invalid');
            });
            return;
        }
        
        const valid = this.canPlaceShip(row, col, this.currentShip.size, this.shipOrientation);
        const cells = this.getShipCells(row, col, this.currentShip.size, this.shipOrientation);
        
        cells.forEach(([r, c]) => {
            const cell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            if (cell) {
                cell.classList.add(valid ? 'hover-valid' : 'hover-invalid');
            }
        });
    }

    canPlaceShip(row, col, size, orientation) {
        const cells = this.getShipCells(row, col, size, orientation);
        
        for (const [r, c] of cells) {
            if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
                return false;
            }
            if (this.playerBoard[r][c].ship) {
                return false;
            }
        }
        
        return true;
    }

    getShipCells(row, col, size, orientation) {
        const cells = [];
        for (let i = 0; i < size; i++) {
            if (orientation === 'horizontal') {
                cells.push([row, col + i]);
            } else {
                cells.push([row + i, col]);
            }
        }
        return cells;
    }

    placeShip(row, col) {
        if (!this.currentShip) {
            alert('Please select a ship first');
            return;
        }
        
        if (!this.canPlaceShip(row, col, this.currentShip.size, this.shipOrientation)) {
            alert('Cannot place ship here');
            return;
        }
        
        const cells = this.getShipCells(row, col, this.currentShip.size, this.shipOrientation);
        const positions = [];
        
        cells.forEach(([r, c]) => {
            this.playerBoard[r][c].ship = this.currentShip.name;
            positions.push({ row: r, col: c });
        });
        
        this.placedShips.push({
            name: this.currentShip.name,
            positions: positions
        });
        
        document.querySelector(`.ship-item[data-ship="${this.currentShip.name}"]`).classList.add('placed');
        this.currentShip = null;
        document.querySelectorAll('.ship-item').forEach(el => el.classList.remove('selected'));
        
        this.renderPlacementBoard();
        
        if (this.placedShips.length === SHIPS.length) {
            document.getElementById('confirm-ships-btn').disabled = false;
        }
    }

    randomPlacement() {
        this.placedShips = [];
        this.initializeBoards();
        document.querySelectorAll('.ship-item').forEach(el => el.classList.remove('placed'));
        document.getElementById('confirm-ships-btn').disabled = true;
        
        SHIPS.forEach(ship => {
            let placed = false;
            while (!placed) {
                const row = Math.floor(Math.random() * GRID_SIZE);
                const col = Math.floor(Math.random() * GRID_SIZE);
                const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
                
                if (this.canPlaceShip(row, col, ship.size, orientation)) {
                    const cells = this.getShipCells(row, col, ship.size, orientation);
                    const positions = [];
                    
                    cells.forEach(([r, c]) => {
                        this.playerBoard[r][c].ship = ship.name;
                        positions.push({ row: r, col: c });
                    });
                    
                    this.placedShips.push({
                        name: ship.name,
                        positions: positions
                    });
                    
                    placed = true;
                }
            }
        });
        
        document.querySelectorAll('.ship-item').forEach(el => el.classList.add('placed'));
        document.getElementById('confirm-ships-btn').disabled = false;
        this.renderPlacementBoard();
    }

    confirmShips() {
        this.ws.send(JSON.stringify({
            type: 'ships_placed',
            ships: this.placedShips
        }));
        
        document.getElementById('player-status').textContent = 'Ready';
        document.getElementById('confirm-ships-btn').disabled = true;
    }

    startBattle() {
        document.getElementById('placement-phase').style.display = 'none';
        document.getElementById('battle-phase').style.display = 'block';
        document.getElementById('player-status').textContent = 'In Battle';
        document.getElementById('opponent-status').textContent = 'In Battle';
        
        this.renderPlayerBoard();
        this.renderOpponentBoard();
        this.updateTurnMessage();
    }

    renderPlayerBoard() {
        const board = document.getElementById('player-board');
        board.innerHTML = '';
        
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                
                if (this.playerBoard[row][col].ship) {
                    cell.classList.add('ship');
                }
                
                if (this.playerBoard[row][col].hit) {
                    cell.classList.add('hit');
                } else if (this.playerBoard[row][col].miss) {
                    cell.classList.add('miss');
                }
                
                board.appendChild(cell);
            }
        }
    }

    renderOpponentBoard() {
        const board = document.getElementById('opponent-board');
        board.innerHTML = '';
        
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                const cellData = this.opponentBoard[row][col];
                
                if (cellData.hit) {
                    cell.classList.add('hit');
                } else if (cellData.miss) {
                    cell.classList.add('miss');
                } else if (this.myTurn) {
                    cell.classList.add('attackable');
                    cell.addEventListener('click', () => this.attack(row, col));
                }
                
                board.appendChild(cell);
            }
        }
    }

    attack(row, col) {
        if (!this.myTurn) {
            alert("It's not your turn!");
            return;
        }
        
        if (this.opponentBoard[row][col].hit || this.opponentBoard[row][col].miss) {
            alert('You already attacked this cell!');
            return;
        }
        
        this.ws.send(JSON.stringify({
            type: 'attack',
            row: row,
            col: col
        }));
    }

    handleAttackResult(data) {
        if (data.hit) {
            this.opponentBoard[data.row][data.col].hit = true;
        } else {
            this.opponentBoard[data.row][data.col].miss = true;
        }
        
        this.myTurn = data.yourTurn;
        this.renderOpponentBoard();
        this.updateTurnMessage();
    }

    handleOpponentAttack(data) {
        if (data.hit) {
            this.playerBoard[data.row][data.col].hit = true;
        } else {
            this.playerBoard[data.row][data.col].miss = true;
        }
        this.myTurn = data.yourTurn;
        
        this.renderPlayerBoard();
        this.renderOpponentBoard();
        this.updateTurnMessage();
    }

    updateTurnMessage() {
        const message = document.getElementById('turn-message');
        if (this.myTurn) {
            message.textContent = 'Your Turn - Attack!';
            message.style.color = '#4CAF50';
        } else {
            message.textContent = "Opponent's Turn";
            message.style.color = '#FFA500';
        }
    }

    handleGameOver(winner) {
        this.showScreen('game-over-screen');
        
        const resultMessage = document.getElementById('result-message');
        const resultDetail = document.getElementById('result-detail');
        
        if (winner) {
            resultMessage.textContent = '🎉 Victory!';
            resultMessage.className = 'winner';
            resultDetail.textContent = 'You defeated ' + this.opponentName + '!';
        } else {
            resultMessage.textContent = '💀 Defeat';
            resultMessage.className = 'loser';
            resultDetail.textContent = this.opponentName + ' won this battle.';
        }
    }

    playAgain() {
        this.placedShips = [];
        this.initializeBoards();
        this.myTurn = false;
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        this.showCommandDeck();
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new BattleshipGame();
});
