import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
});

// Mock window.location
Object.defineProperty(window, 'location', {
  configurable: true,
  writable: true,
  value: { origin: 'http://localhost:5173' },
});

// Mock navigator.clipboard — must be configurable so @testing-library/user-event
// can override it as well during its own setup.
Object.defineProperty(navigator, 'clipboard', {
  configurable: true,
  writable: true,
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
});
