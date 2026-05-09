import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Auto dark mode based on system preference
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (prefersDark) {
  document.documentElement.classList.add('dark');
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  document.documentElement.classList.toggle('dark', e.matches);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)