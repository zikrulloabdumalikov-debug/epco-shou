import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Telegram ichida bo'lsa WebApp ni tayyorlash va kengaytirish
if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
  try {
    const tg = (window as any).Telegram.WebApp;
    tg.ready();
    tg.expand();
  } catch (err) {
    console.warn('[Telegram WebApp] Init error:', err);
  }
}

createRoot(document.getElementById('root')!).render(<App />);
