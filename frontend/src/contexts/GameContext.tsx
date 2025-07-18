import React from "react";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { GameState, Ship, SHIP_DEFINITIONS } from "../schema/schema.ts";

interface GameContextType {
  gameState: GameState | null;
  currentShip: string | null;
  shipOrientation: "horizontal" | "vertical";
  createGame: () => string;
  joinGame: (roomCode: string) => void;
  setCurrentShip: (shipId: string | null) => void;
  toggleOrientation: () => void;
  placeShip: (row: number, col: number) => boolean;
  fireShot: (row: number, col: number) => boolean;
  isShipPlacementValid: (shipLength: number, row: number, col: number, orientation: "horizontal" | "vertical") => boolean;
  getAllShipsPlaced: () => boolean;
  startBattle: () => void;
  resetGame: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

function createInitialGrid() {
  return Array.from({ length: 10 }, (_, row) =>
    Array.from({ length: 10 }, (_, col) => ({
      row,
      col,
      hasShip: false,
      isHit: false,
      shipId: null
    }))
  );
}

function createInitialOpponentGrid() {
  return Array.from({ length: 10 }, (_, row) =>
    Array.from({ length: 10 }, (_, col) => ({
      row,
      col,
      isHit: false,
      isMiss: false,
      hasShip: null
    }))
  );
}

function createInitialShips(): Ship[] {
  return Object.entries(SHIP_DEFINITIONS).map(([key, def]) => ({
    id: key,
    name: key as any,
    length: def.length,
    positions: [],
    orientation: "horizontal" as const,
    isPlaced: false,
    hits: [],
    isSunk: false
  }));
}

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentShip, setCurrentShip] = useState<string | null>("carrier");
  const [shipOrientation, setShipOrientation] = useState<"horizontal" | "vertical">("horizontal");

  useEffect(() => {
    // Load game state from localStorage
    const savedGame = localStorage.getItem("battleship_game");
    if (savedGame) {
      try {
        const gameData = JSON.parse(savedGame);
        setGameState(gameData);
      } catch (error) {
        console.error("Failed to parse saved game data:", error);
        localStorage.removeItem("battleship_game");
      }
    }
  }, []);

  useEffect(() => {
    // Save game state to localStorage
    if (gameState) {
      localStorage.setItem("battleship_game", JSON.stringify(gameState));
    }
  }, [gameState]);

  const createGame = (): string => {
    const roomCode = generateRoomCode();
    const newGame: GameState = {
      id: `game_${Date.now()}`,
      roomCode,
      phase: "setup",
      currentTurn: "player",
      playerGrid: createInitialGrid(),
      opponentGrid: createInitialOpponentGrid(),
      playerShips: createInitialShips(),
      opponentShipsRemaining: 5,
      winner: null
    };
    
    setGameState(newGame);
    return roomCode;
  };

  const joinGame = (roomCode: string): void => {
    // TODO: Replace with actual API call when backend is implemented
    // For now, create a new game with the provided room code
    const newGame: GameState = {
      id: `game_${Date.now()}`,
      roomCode: roomCode.toUpperCase(),
      phase: "setup",
      currentTurn: "player",
      playerGrid: createInitialGrid(),
      opponentGrid: createInitialOpponentGrid(),
      playerShips: createInitialShips(),
      opponentShipsRemaining: 5,
      winner: null
    };
    
    setGameState(newGame);
  };

  const toggleOrientation = () => {
    setShipOrientation(prev => prev === "horizontal" ? "vertical" : "horizontal");
  };

  const isShipPlacementValid = (shipLength: number, row: number, col: number, orientation: "horizontal" | "vertical"): boolean => {
    if (!gameState) return false;

    // Check if ship fits within grid bounds
    if (orientation === "horizontal") {
      if (col + shipLength > 10) return false;
    } else {
      if (row + shipLength > 10) return false;
    }

    // Check for overlapping ships
    for (let i = 0; i < shipLength; i++) {
      const checkRow = orientation === "horizontal" ? row : row + i;
      const checkCol = orientation === "horizontal" ? col + i : col;
      
      if (gameState.playerGrid[checkRow][checkCol].hasShip) {
        return false;
      }

      // Check adjacent cells for ships (ships can't touch)
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const adjRow = checkRow + dr;
          const adjCol = checkCol + dc;
          
          if (adjRow >= 0 && adjRow < 10 && adjCol >= 0 && adjCol < 10) {
            if (gameState.playerGrid[adjRow][adjCol].hasShip) {
              // Allow if it's part of the same ship being placed
              const isPartOfCurrentShip = orientation === "horizontal" 
                ? adjRow === row && adjCol >= col && adjCol < col + shipLength
                : adjCol === col && adjRow >= row && adjRow < row + shipLength;
              
              if (!isPartOfCurrentShip) {
                return false;
              }
            }
          }
        }
      }
    }

    return true;
  };

  const placeShip = (row: number, col: number): boolean => {
    if (!gameState || !currentShip) return false;

    const ship = gameState.playerShips.find(s => s.id === currentShip);
    if (!ship || ship.isPlaced) return false;

    if (!isShipPlacementValid(ship.length, row, col, shipOrientation)) {
      return false;
    }

    // Create new positions for the ship
    const positions: { row: number; col: number }[] = [];
    for (let i = 0; i < ship.length; i++) {
      const shipRow = shipOrientation === "horizontal" ? row : row + i;
      const shipCol = shipOrientation === "horizontal" ? col + i : col;
      positions.push({ row: shipRow, col: shipCol });
    }

    // Update game state
    setGameState(prev => {
      if (!prev) return prev;

      const newGrid = prev.playerGrid.map(gridRow => [...gridRow]);
      
      // Place ship on grid
      positions.forEach(pos => {
        newGrid[pos.row][pos.col] = {
          ...newGrid[pos.row][pos.col],
          hasShip: true,
          shipId: currentShip
        };
      });

      // Update ship
      const newShips = prev.playerShips.map(s => 
        s.id === currentShip 
          ? { ...s, positions, orientation: shipOrientation, isPlaced: true }
          : s
      );

      // Move to next unplaced ship
      const nextShip = newShips.find(s => !s.isPlaced);
      setCurrentShip(nextShip ? nextShip.id : null);

      return {
        ...prev,
        playerGrid: newGrid,
        playerShips: newShips
      };
    });

    return true;
  };

  const getAllShipsPlaced = (): boolean => {
    if (!gameState) return false;
    return gameState.playerShips.every(ship => ship.isPlaced);
  };

  const startBattle = (): void => {
    if (!gameState || !getAllShipsPlaced()) return;

    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        phase: "battle"
      };
    });
  };

  const fireShot = (row: number, col: number): boolean => {
    if (!gameState || gameState.phase !== "battle" || gameState.currentTurn !== "player") {
      return false;
    }

    const cell = gameState.opponentGrid[row][col];
    if (cell.isHit || cell.isMiss) {
      return false; // Already fired at this cell
    }

    // TODO: Replace with actual game logic when backend is implemented
    // For now, use random hit/miss logic
    const isHit = Math.random() > 0.7; // 30% hit chance

    setGameState(prev => {
      if (!prev) return prev;

      const newOpponentGrid = prev.opponentGrid.map(gridRow => [...gridRow]);
      newOpponentGrid[row][col] = {
        ...newOpponentGrid[row][col],
        isHit: isHit,
        isMiss: !isHit,
        hasShip: isHit
      };

      let newOpponentShipsRemaining = prev.opponentShipsRemaining;
      if (isHit) {
        // TODO: Implement proper ship sinking logic
        // For demo, randomly sink ships
        if (Math.random() > 0.8) {
          newOpponentShipsRemaining = Math.max(0, newOpponentShipsRemaining - 1);
        }
      }

      const winner = newOpponentShipsRemaining === 0 ? "player" : 
                    prev.playerShips.every(ship => ship.isSunk) ? "opponent" : null;

      return {
        ...prev,
        opponentGrid: newOpponentGrid,
        opponentShipsRemaining: newOpponentShipsRemaining,
        currentTurn: "opponent", // Switch turns
        winner,
        phase: winner ? "finished" : "battle"
      };
    });

    // TODO: Simulate opponent turn when backend is implemented
    setTimeout(() => {
      if (gameState?.phase === "battle" && gameState.winner === null) {
        simulateOpponentTurn();
      }
    }, 1500);

    return true;
  };

  const simulateOpponentTurn = (): void => {
    if (!gameState) return;

    // TODO: Replace with actual opponent logic from backend
    // For now, simulate random opponent shots
    const availableCells: { row: number; col: number }[] = [];
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        if (!gameState.playerGrid[row][col].isHit) {
          availableCells.push({ row, col });
        }
      }
    }

    if (availableCells.length === 0) return;

    const randomCell = availableCells[Math.floor(Math.random() * availableCells.length)];
    
    setGameState(prev => {
      if (!prev) return prev;

      const newPlayerGrid = prev.playerGrid.map(gridRow => [...gridRow]);
      const targetCell = newPlayerGrid[randomCell.row][randomCell.col];
      targetCell.isHit = true;

      let newPlayerShips = [...prev.playerShips];
      
      // Check if ship was hit and update ship state
      if (targetCell.hasShip && targetCell.shipId) {
        const shipIndex = newPlayerShips.findIndex(s => s.id === targetCell.shipId);
        if (shipIndex !== -1) {
          const ship = newPlayerShips[shipIndex];
          const newHits = [...ship.hits, { row: randomCell.row, col: randomCell.col }];
          const isSunk = newHits.length === ship.length;
          
          newPlayerShips[shipIndex] = {
            ...ship,
            hits: newHits,
            isSunk
          };
        }
      }

      const allPlayerShipsSunk = newPlayerShips.every(ship => ship.isSunk);
      const winner = allPlayerShipsSunk ? "opponent" : null;

      return {
        ...prev,
        playerGrid: newPlayerGrid,
        playerShips: newPlayerShips,
        currentTurn: "player",
        winner,
        phase: winner ? "finished" : "battle"
      };
    });
  };

  const resetGame = (): void => {
    setGameState(null);
    setCurrentShip("carrier");
    setShipOrientation("horizontal");
    localStorage.removeItem("battleship_game");
  };

  return (
    <GameContext.Provider value={{
      gameState,
      currentShip,
      shipOrientation,
      createGame,
      joinGame,
      setCurrentShip,
      toggleOrientation,
      placeShip,
      fireShot,
      isShipPlacementValid,
      getAllShipsPlaced,
      startBattle,
      resetGame
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}