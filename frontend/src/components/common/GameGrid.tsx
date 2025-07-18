import React from "react";
import { GridCell } from "./GridCell.tsx";
import { Ship } from "../../schema/schema.ts";
import "../../styles/grid-style.css";

interface GameGridProps {
  grid: any[][];
  ships?: Ship[];
  onCellClick?: (row: number, col: number) => void;
  isPlayerGrid?: boolean;
  disabled?: boolean;
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
}

export function GameGrid({
  grid,
  ships = [],
  onCellClick,
  isPlayerGrid = false,
  disabled = false,
  title,
  subtitle,
  icon,
  iconColor,
}: GameGridProps) {
  const columnLabels = ['A','B','C','D','E','F','G','H','I','J'];
  const rowLabels = ['1','2','3','4','5','6','7','8','9','10'];

  const getShipForCell = (row: number, col: number): Ship | undefined => {
    if (!isPlayerGrid) return undefined;
    const cell = grid[row][col];
    return ships.find((ship) => ship.id === cell.shipId);
  };

  return (
    <div className="game-grid-container">
      <div className="grid-header">
        <h2 className="grid-title">{title}</h2>
        <div className="grid-subtitle">
          <i className={`${icon} ${iconColor} icon`}></i>
          {subtitle}
        </div>
      </div>

      <div className="grid-content">
        <div className="grid-column-labels">
          <div className="empty-label"></div>
          {columnLabels.map((label) => (
            <div key={label} className="grid-label">
              {label}
            </div>
          ))}
        </div>

        {rowLabels.map((rowLabel, rowIndex) => (
          <div className="grid-row" key={rowIndex}>
            <div className="grid-label">{rowLabel}</div>
            {columnLabels.map((_, colIndex) => {
              const cell = grid[rowIndex][colIndex];
              const ship = getShipForCell(rowIndex, colIndex);
              return (
                <GridCell
                  key={`${rowIndex}-${colIndex}`}
                  row={rowIndex}
                  col={colIndex}
                  hasShip={cell.hasShip}
                  isHit={cell.isHit}
                  isMiss={cell.isMiss}
                  shipId={cell.shipId}
                  ship={ship}
                  onClick={() => onCellClick?.(rowIndex, colIndex)}
                  isPlayerGrid={isPlayerGrid}
                  disabled={disabled}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}