/**
 * PWA 更新策略：部署新版後，裝置上的舊版會「自動」換成新版。
 *
 * 預設行為下，Service Worker 會先用快取的舊版顯示，新版要再重新整理一次才看得到；
 * iPad 從主畫面開啟的 App 常常一開就是好幾天，更不會自己更新。
 * 這裡做三件事：
 * 1. 新的 Service Worker 啟用後自動重新載入頁面（registerType: 'autoUpdate' ＋ immediate）
 * 2. 每 30 分鐘檢查一次是否有新版
 * 3. App 從背景切回前景時也檢查一次（iPad 最常見的情境）
 */
import { registerSW } from 'virtual:pwa-register';

const CHECK_INTERVAL_MS = 30 * 60 * 1000;

export function setupPwaUpdates(): void {
  if (!('serviceWorker' in navigator)) return;
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const check = () => {
        if (navigator.onLine) void registration.update();
      };
      setInterval(check, CHECK_INTERVAL_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
  });
}
