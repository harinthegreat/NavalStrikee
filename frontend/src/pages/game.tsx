import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useGame } from "../contexts/GameContext.tsx";
import { SHIP_DEFINITIONS } from "../schema/schema.ts";
import {GameGrid } from "../components/common/GameGrid.tsx";
import "../styles/game.css";
import { useNavigate } from "react-router-dom";
import { Select, SelectItem } from "../components/ui/Selecter.tsx";
import { toast } from 'react-toastify';


const Game = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    gameState,
    currentShip,
    shipOrientation,
    setCurrentShip,
    toggleOrientation,
    placeShip,
    fireShot,
    isShipPlacementValid,
    getAllShipsPlaced,
    startBattle,
    resetGame
  } = useGame();

  useEffect(() => {
    if (!gameState) {
      navigate("/lobby");
    }
  }, [gameState, navigate]);

  if (!gameState) {
    return null;
  }

  const handleCellClick = (row: number, col: number, isPlayerGrid: boolean) => {
    if (gameState.phase === "setup" && isPlayerGrid && currentShip) {
      const ship = gameState.playerShips.find(s => s.id === currentShip);
      if (ship && !ship.isPlaced) {
        if (isShipPlacementValid(ship.length, row, col, shipOrientation)) {
          placeShip(row, col);
        } else {
          toast.error("Invalid Placement: Ships cannot overlap or be placed adjacent to each other");
        }
      }
    } else if (gameState.phase === "battle" && !isPlayerGrid && gameState.currentTurn === "player") {
      const success = fireShot(row, col);
      if (!success) {
        toast.error("Invalid Shot: You've already fired at this location");
      }
    }
  };

  const handleReadyForBattle = () => {
    if (getAllShipsPlaced()) {
      startBattle();
      toast.success("Battle Commenced! All ships deployed. Begin the assault!");
    } else {
      toast.error("Fleet Incomplete: Please place all ships before starting battle");
    }
  };

  const handleBackToLobby = () => {
    resetGame();
    navigate("/lobby");
  };

  const getGameStatus = () => {
    if (gameState.phase === "setup") {
      return "Get your Squadron ready...";
    }
    if (gameState.winner) {
      return gameState.winner === "player" ? "Mission Accomplished!!!" : "All Hands Down!!!";
    }
    return gameState.currentTurn === "player" ? "Cap's Move" : "Get Ready For Impact, Captain";
  };

  const getStatusColor = () => {
    if (gameState.winner === "player") return "status-victory";
    if (gameState.winner === "opponent") return "status-defeat";
    if (gameState.currentTurn === "player") return "status-active";
    return "status-waiting";
  };

  return (
    <div className="game-container">
      {/* Game Header */}
      <header className="game-header">
        <div className="header-content">
          <div className="header-title">
            <div className="title-icon">
              <i className="fas fa-ship"></i>
            </div>
            <div>
              <h1>Naval Engagement</h1>
              <p className="room-code">
                Room: <span>{gameState.roomCode}</span>
              </p>
            </div>
          </div>
          
          {/* Game Status */}
          <div className="game-status">
            <div className={`status-indicator ${getStatusColor()}`}>
              <div className="status-pulse"></div>
              <span>{getGameStatus()}</span>
            </div>
            <div className="ships-remaining">
              <p>Ships Remaining</p>
              <p className="ships-count">
                {gameState.playerShips.filter(s => !s.isSunk).length} vs {gameState.opponentShipsRemaining}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            
            <button
              onClick={resetGame}
              className="btn-surrender"
            >
              <i className="fas fa-flag"></i>
              <span>Cease Fire</span>
            </button>
          </div>
        </div>
      </header>

      {/* Ship Placement Controls */}
      {gameState.phase === "setup" && (
        <div className="placement-controls">
          <div className="controls-content">
            <div className="controls-info">
              <h2>Deploy Your Fleet</h2>
              <p>Place your ships on the grid. Click to place.</p>
            </div>
            
            <div className="controls-actions">
              <div className="ship-selector">
                <label>Current Ship:</label>
                
            <Select
              value={currentShip || ""}
              onValueChange={(value) => setCurrentShip(value)}
              className="ship-dropdown"
            >
              {gameState.playerShips.map((ship) => (
                <SelectItem
                  key={ship.id}
                  value={ship.id}
                  disabled={ship.isPlaced}
                  className={ship.isPlaced ? "placed-ship" : ""}
                  
                >
                  {SHIP_DEFINITIONS[ship.name].name} ({ship.length}) {ship.isPlaced && "✓"}
                </SelectItem>
              ))}
            </Select>
              </div>
              
              <button
                onClick={toggleOrientation}
                className="btn-orientation"
              >
                <i className="fas fa-redo"></i>
                {shipOrientation === "horizontal" ? "Horizontal" : "Vertical"}
              </button>
              
              <button
                onClick={handleReadyForBattle}
                disabled={!getAllShipsPlaced()}
                className="btn-ready"
              >
                Commence Assault....
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Grids */}
      <div className="game-grids">
        <GameGrid
          grid={gameState.playerGrid}
          ships={gameState.playerShips}
          onCellClick={(row, col) => handleCellClick(row, col, true)}
          isPlayerGrid={true}
          disabled={gameState.phase === "battle"}
          title="Allied Armada"
          subtitle="Hold The Line"
          icon="fas fa-shield-alt"
          iconColor="icon-green"
        />

        <GameGrid
          grid={gameState.opponentGrid}
          onCellClick={(row, col) => handleCellClick(row, col, false)}
          isPlayerGrid={false}
          disabled={gameState.phase !== "battle" || gameState.currentTurn !== "player" || !!gameState.winner}
          title="Hostile Zone"
          subtitle="Commence Fire"
          icon="fas fa-crosshairs"
          iconColor="icon-red"
        />
      </div>

      {/* Game Information */}
      <div className="game-info">
        <div className="info-card">
          <div className="card-content">
            <h3>Operational Readiness</h3>
            <div className="fleet-status">
              {gameState.playerShips.map(ship => (
                <div key={ship.id} className="ship-status">
                  <span className="ship-name">
                    {SHIP_DEFINITIONS[ship.name].name} ({ship.length})
                  </span>
                  <span className={`ship-state ${ship.isSunk ? "state-destroyed" : "state-active"}`}>
                    {ship.isSunk ? "Sunk" : ship.isPlaced ? "Engaged" : "Awaiting Orders"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="info-card">
          <div className="card-content">
            <h3>Battle Log</h3>
            <div className="battle-log">
              {gameState.phase === "setup" && (
                <div className="log-entry log-deploy">
                  <i className="fas fa-ship"></i>
                  Mobilizing Fleet...
                </div>
              )}
              {gameState.phase === "battle" && (
                <div className="log-entry log-battle">
                  <i className="fas fa-crosshairs"></i>
                  Battle in progress!
                </div>
              )}
              {gameState.winner && (
                <div className={`log-entry ${gameState.winner === "player" ? "log-victory" : "log-defeat"}`}>
                  <i className="fas fa-trophy"></i>
                  {gameState.winner === "player" ? "Victory achieved!" : "Fleet destroyed!"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;