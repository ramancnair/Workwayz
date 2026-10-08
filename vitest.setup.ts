import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Polyfill worker_threads.markAsUncloneable if missing in older environments
try {
  const wt = require('node:worker_threads');
  if (wt && typeof wt.markAsUncloneable !== 'function') {
    wt.markAsUncloneable = (val: any) => val;
  }
} catch (_) {}

// Mock window.matchMedia
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock scrollTo
  window.scrollTo = vi.fn() as any;
}
