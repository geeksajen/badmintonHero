import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { unlockAudioOnFirstGesture } from './lib/sound';
import './index.css';

unlockAudioOnFirstGesture(); // iOS autoplay 解鎖（spec §8.4）

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
