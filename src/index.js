import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Polyfill for supabase-js cross-fetch compatibility
if (typeof global === 'undefined') window.global = window;
if (typeof globalThis === 'undefined') window.globalThis = window;
if (typeof process === 'undefined') window.process = { env: {} };

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
