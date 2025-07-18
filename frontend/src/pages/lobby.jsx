import React from "react";
import { useState, useEffect } from "react";
import "../styles/lobby.css"
import CopySVG from '../assets/copy.svg';
import ShareSVG from '../assets/share.svg';
import { useLocation } from "wouter";
import { useNavigate } from "react-router-dom";
import { useGame } from "../contexts/GameContext.tsx";
import anchor from '../assets/anchor.svg';
import sailor from '../assets/sailor.svg';
import raadar from '../assets/radar.svg';

export default function Lobby() {
  const [username, setUsername] = useState(() => localStorage.getItem("username") || "");
  const [, setLocation] = useLocation();
  const [showRoomCode, setShowRoomCode] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const navigate = useNavigate();
  const { createGame, joinGame } = useGame();

  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (stored) setUsername(stored);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('username');
    window.location.href = "/";
  };

  const handleCreateGame = () => {
    const code = createGame();
    setRoomCode(code);
    setShowRoomCode(true);
    
  };

  // Placeholder for join game handler
  const handleJoinGame = (e) => {
    e.preventDefault();
    if (roomCode.length === 6) {
      joinGame(roomCode);
      navigate('/game');
    }
  };

  return(
    <div className="lobby-container">
      {/* Header */}
      <header className="lobby-header">
        <div className="logo-section">
          <img src={anchor} alt="Anchor Logo" style={{ width: 60, height: 60, marginRight: 16 }} />
          <div>
            <h2>Command Deck</h2>
            <p>
              Ahoy, <strong>Captain {username} !!!</strong>
            </p>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>

      {/* Main Cards */}
      <div className="card-grid">
        {/* Create Battle */}
        <div className="create-battle-card">
          <div className="create-battle-content">
            <div className="create-battle-header">
              <div >
                <img src={sailor} alt="Sailor Icon" style={{ width: 80, height: 80, marginBottom: 10, zIndex: 2 }} />
                
              </div>
              <h2 className="create-battle-title">Launch Operation</h2>
              <p className="create-battle-desc">Initiate a new maritime conflict</p>
            </div>
            <div style={{ position: "relative", minHeight: "170px" }}>
              <div className={`room-code-card${showRoomCode ? " show" : ""}`}>
                <div className="room-code-label">Battle Code:</div>
                <div className="room-code-value code-bg code-bg-flex">
                  <span className="code-value-text code-bg-box">{roomCode || "4Y19BN"}</span>
                  <button className="code-icon-btn code-bg-box" tabIndex={0}>
                    <img src={CopySVG} alt="copy" className="code-svg-btn" />
                  </button>
                  <button className="code-icon-btn code-bg-box" tabIndex={0}>
                    <img src={ShareSVG} alt="share" className="code-svg-btn" />
                  </button>
                </div>
                <div className="room-code-desc">Lure Them With This Bait...</div>
              </div>
              <button
                className={`create-battle-btn animated-btn${showRoomCode ? " slide-down-stay" : ""}`}
                onClick={handleCreateGame}
                disabled={showRoomCode}
                style={{ position: "absolute", left: 0, right: 0, zIndex: 2 }}
              >
                <i className="fas fa-anchor"></i>
                Launch Armada
              </button>
            </div>
          </div>
        </div>

        {/* Join Battle */}
        <div className="join-battle-card">
          <div className="join-battle-content">
            <div className="join-battle-header">
              <div>
                <img src={raadar} alt="Radar Icon" style={{ width: 80, height: 80, marginBottom: 10, zIndex: 2 }} />
                
              </div>
              <h2 className="join-battle-title">Join Battle</h2>
              <p className="join-battle-desc">Enter an ongoing sea conflict</p>
            </div>
            <form onSubmit={handleJoinGame} className="join-battle-form">
              <div>
                <label htmlFor="roomCode" className="join-battle-label">
                  Battle Code
                </label>
                <input
                  id="roomCode"
                  type="text"
                  placeholder="Enter battle code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="join-battle-input"
                  maxLength={6}
                  required
                />
              </div>
              <button
                type="submit"
                className="join-battle-btn"
              >
                <i className="fas fa-anchor"></i>
                Board Ship
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="footer-panel">
        <h3>Ready for Battle?</h3>
        <div className="footer-actions">
          <button className="primary-btn">Engage!</button>
          <button className="secondary-btn">Captain's Log</button>
        </div>
      </div>
    </div>
  )

  
}