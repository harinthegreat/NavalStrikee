import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Auth from './pages/auth.jsx';
import Lobby from './pages/lobby.jsx';
import Game from './pages/game.tsx';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/game" element={<Game />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}

export default App;
