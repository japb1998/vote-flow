import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { SocketProvider } from './contexts/SocketContext';
import { HomePage } from './pages/HomePage';
import { SessionPage } from './pages/SessionPage';
import { Footer } from './components/Footer';
import { ThemeToggle } from './components/ThemeToggle';
import { PalettePicker } from './components/PalettePicker';
import { Card } from './components/Card';
import { Button } from './components/Button';
import './styles/global.css';

function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      maxWidth: 480,
      margin: '4rem auto',
      padding: '0 1rem',
      textAlign: 'center',
    }}>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem 0' }}>
          <span style={{ fontSize: '3rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-primary)' }}>
            404
          </span>
          <h2>Page Not Found</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>
            The page you are looking for does not exist or may have moved.
          </p>
          <Button onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </Card>
    </div>
  );
}

export function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '12px 16px 0',
            maxWidth: 1200,
            width: '100%',
            margin: '0 auto',
            position: 'relative',
            zIndex: 100,
          }}>
            <PalettePicker />
            <ThemeToggle />
          </div>
          <div style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/session/:sessionId" element={<SessionPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </SocketProvider>
  );
}
