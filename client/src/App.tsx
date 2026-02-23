import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './contexts/SocketContext';
import { HomePage } from './pages/HomePage';
import { SessionPage } from './pages/SessionPage';
import './styles/global.css';

export function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/session/:sessionId" element={<SessionPage />} />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}
