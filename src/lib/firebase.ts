/**
 * Firebase 初始化。除了 src/store/ 之外，全專案只有這個檔案可以 import firebase/firestore（ESLint 強制）。
 * 只在 VITE_STORE_MODE=firebase 時被動態載入，Local Mode 不會打包進主程式。
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

export interface FirebaseHandles {
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
}

let handles: FirebaseHandles | null = null;

export function firebaseConfigFromEnv() {
  const env = import.meta.env;
  return {
    apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
    projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
    appId: env.VITE_FIREBASE_APP_ID as string | undefined,
  };
}

export function getFirebase(): FirebaseHandles {
  if (handles) return handles;
  const config = firebaseConfigFromEnv();
  if (!config.apiKey || !config.projectId) {
    throw new Error('Firebase 環境變數未設定（VITE_FIREBASE_*），請參考 .env.example');
  }
  const app = initializeApp(config);
  // ★ 離線持久化（spec §2.2 ③-6）。
  //   enableIndexedDbPersistence() 在 Firebase v10+ 已棄用，這是官方的等價新寫法；
  //   multi-tab manager 讓同一台裝置開兩個分頁也不會互搶 IndexedDB。
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    ignoreUndefinedProperties: true, // 選填欄位（submittedAt 等）以 undefined 表示「刪除」
  });
  const auth = getAuth(app);
  void setPersistence(auth, browserLocalPersistence); // 兩台裝置各登入一次即可
  handles = { app, db, auth };
  return handles;
}
