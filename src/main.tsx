import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { setupPwaUpdates } from './lib/pwa';
import { unlockAudioOnFirstGesture } from './lib/sound';
import './index.css';

unlockAudioOnFirstGesture(); // iOS autoplay 解鎖（spec §8.4）
setupPwaUpdates(); // 部署新版後自動更新，不必手動清快取

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
