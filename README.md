# Battleship Game - Multiplayer Real-Time Battle

A real-time multiplayer Battleship game with WebSocket-based gameplay. Built with PHP backend and vanilla JavaScript frontend.

## 🎮 Features

- Real-time multiplayer gameplay via WebSockets
- Username persistence with local storage
- Interactive ship placement with random placement option
- Turn-based attack system
- Visual feedback for hits (💥) and misses (💧)
- Automatic matchmaking
- Win/loss detection
- Secure server-side validation preventing cheating

## 📋 Prerequisites

To run this game on your local machine, you need:

- **PHP 8.0 or higher** - [Download PHP](https://www.php.net/downloads)
- **Composer** - [Install Composer](https://getcomposer.org/download/)
- A modern web browser (Chrome, Firefox, Safari, Edge)

## 📥 Download Instructions

### From Replit:

1. Click the three dots menu (⋮) in the file explorer
2. Select "Download as ZIP"
3. Extract the ZIP file to your desired location

### Using Git:

If this project is connected to GitHub, you can clone it:
```bash
git clone <repository-url>
cd battleship-game
```

## 🚀 Installation & Setup

### Step 1: Install Dependencies

Open a terminal in the project directory and run:

```bash
composer install
```

This will install the Ratchet WebSocket library and all dependencies.

### Step 2: Start the WebSocket Server

In your first terminal window, run:

```bash
php server.php
```

You should see:
```
WebSocket server started on port 8080
```

**Keep this terminal running!**

### Step 3: Start the Frontend Server

In a **second terminal window** (in the same project directory), run:

```bash
php -S localhost:5000 -t public
```

You should see:
```
PHP Development Server (http://localhost:5000) started
```

**Keep this terminal running!**

### Step 4: Play the Game!

Open your web browser and go to:
```
http://localhost:5000
```

**To play multiplayer:**
1. Open the game in your first browser tab
2. Enter a username and click "Join Game"
3. Open **another browser tab** or window to `http://localhost:5000`
4. Enter a different username
5. Both players will be matched automatically!

## 🎯 How to Play

1. **Enter Username** - Choose your player name
2. **Wait for Opponent** - System will match you with another player
3. **Place Ships** - Position your 5 ships on the grid:
   - Carrier (5 cells)
   - Battleship (4 cells)
   - Cruiser (3 cells)
   - Submarine (3 cells)
   - Destroyer (2 cells)
4. **Confirm Ships** - Click "Confirm Ships" when ready
5. **Take Turns** - Attack your opponent's grid
6. **Win!** - First to sink all enemy ships wins

## 📁 Project Structure

```
battleship-game/
├── public/              # Frontend files
│   ├── css/
│   │   └── style.css   # Game styling
│   ├── js/
│   │   └── app.js      # Game logic & WebSocket client
│   ├── index.html      # Main game interface
│   └── index.php       # Frontend server router
├── src/
│   └── GameServer.php  # WebSocket server & game logic
├── vendor/             # Composer dependencies
├── server.php          # WebSocket server entry point
├── composer.json       # PHP dependencies
└── README.md          # This file
```

## 🔧 Troubleshooting

### Port Already in Use

If you see "Address already in use" errors:

**For WebSocket Server (port 8080):**
```bash
# On Linux/Mac:
lsof -ti:8080 | xargs kill -9

# On Windows:
netstat -ano | findstr :8080
taskkill /PID <process_id> /F
```

**For Frontend Server (port 5000):**
Change the port number:
```bash
php -S localhost:3000 -t public
```

Then open `http://localhost:3000` in your browser.

### Can't Connect to WebSocket

Make sure:
1. The WebSocket server is running (`php server.php`)
2. You see "WebSocket server started on port 8080" message
3. No firewall is blocking port 8080

### Ships Not Placing

Try using the "Random Placement" button to auto-place all ships.

## 🛡️ Security Features

The game includes comprehensive server-side validation:
- Ships must be correct sizes
- Ships must be placed in straight lines
- No overlapping ships
- All coordinates validated as integers within bounds
- Duplicate attacks prevented
- Fair turn-based gameplay enforced

## 🎨 Customization

### Change Game Grid Size

Edit `GRID_SIZE` in both files:
- `public/js/app.js` (line 1)
- `src/GameServer.php` (line 16)

### Modify Ship Fleet

Edit `EXPECTED_SHIPS` in:
- `public/js/app.js` (lines 2-8)
- `src/GameServer.php` (lines 17-23)

## 📝 License

This project is open source and available for personal and educational use.

## 🐛 Known Issues

- PHP 8.2+ shows deprecation warnings (they don't affect gameplay)
- Game requires both players to be online simultaneously

## 💡 Tips

- Use "Random Placement" for quick ship setup
- Watch the turn indicator to know when it's your turn
- Hits show as 💥, misses show as 💧
- You can see your ships but not your opponent's

## 🤝 Support

If you encounter any issues, check that:
1. Both servers are running
2. You're using PHP 8.0 or higher
3. Composer dependencies are installed
4. No other applications are using ports 5000 or 8080

---

**Have fun playing Battleship! 🚢⚓**
