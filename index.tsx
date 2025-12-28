import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

try {
  const root = ReactDOM.createRoot(document.getElementById('root') || (() => { throw new Error('Failed to initialize React root: The element with id "root" was not found in the DOM. Please ensure index.html contains a div with id="root" and that the DOM is fully loaded before mounting the React application.'); })());
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('React Root Initialization Error: Unable to render the application. Details:', error);
  document.body.innerHTML = '<div style="color: red; padding: 20px; font-family: monospace;">Failed to initialize the application. Please check the console for more details.</div>';
}