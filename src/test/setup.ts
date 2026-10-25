import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// Simple mock for URL.createObjectURL and revokeObjectURL in test environment
if (typeof window !== 'undefined') {
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = () => 'blob:mock-url';
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = () => {};
  }
}
