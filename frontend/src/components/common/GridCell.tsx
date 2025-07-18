import React from "react";
import { Ship } from "../../schema/schema.ts";
import "../../styles/grid-style.css";

interface GridCellProps {
  row: number;
  col: number;
  hasShip?: boolean;
  isHit?: boolean;
  isMiss?: boolean;
  shipId?: string | null;
  onClick?: () => void;
  isPlayerGrid?: boolean;
  disabled?: boolean;
  ship?: Ship;
}

export function GridCell({
  row,
  col,
  hasShip = false,
  isHit = false,
  isMiss = false,
  onClick,
  isPlayerGrid = false,
  disabled = false,
  ship,
}: GridCellProps) {
  const getClassNames = () => {
    let classes = "grid-cell";
    if (isPlayerGrid) classes += " player-grid";
    else classes += " opponent-grid";

    if (isHit && hasShip) classes += " hit-ship";
    else if (isHit || isMiss) classes += " miss";
    else if (hasShip && isPlayerGrid) classes += " player-ship";
    else if (!disabled && !isPlayerGrid) classes += " hover-opponent";
    else if (isPlayerGrid) classes += " hover-player";

    if (disabled) classes += " disabled";

    return classes;
  };

  const renderContent = () => {
    if (isHit && hasShip) {
      return <i className="fas fa-times icon red" />;
    }
    if ((isHit && !hasShip) || isMiss) {
      return <div className="dot" />;
    }
    if (hasShip && isPlayerGrid) {
      return (
        <div className="ship-background">
          {ship?.isSunk && <i className="fas fa-times icon red" />}
        </div>
      );
    }
    return null;
  };

  return (
    <button
      className={getClassNames()}
      onClick={onClick}
      disabled={disabled || isHit || isMiss}
    >
      {renderContent()}
    </button>
  );
}