import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// Mock window.matchMedia for JSDOM
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: query.includes('dark'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as any;
}

// Simple mock for URL.createObjectURL and revokeObjectURL in test environment
if (typeof window !== 'undefined') {
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = () => 'blob:mock-url';
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = () => {};
  }
}
