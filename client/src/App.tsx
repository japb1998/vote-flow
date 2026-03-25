import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './contexts/SocketContext';
import { HomePage } from './pages/HomePage';
import { SessionPage } from './pages/SessionPage';
import { Footer } from './components/Footer';
import { ThemeToggle } from './components/ThemeToggle';
import './styles/global.css';

export function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 999 }}>
            <ThemeToggle />
          </div>
          <div style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/session/:sessionId" element={<SessionPage />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </SocketProvider>
  );
}
