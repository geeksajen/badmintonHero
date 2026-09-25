# 🏸 羽球勇者冒險記 Badminton Hero Quest

把 7 歲孩子的羽球練習變成 RPG 冒險：小孩在 iPad 上解鎖地圖、拿獎牌、換獎品；
家長在手機上簽到、核可、發獎勵 —— **家長按下核可，iPad 立刻噴彩帶**。

實作依據：[`spec.md`](spec.md)（v5）。

---

## ⚠️ 必讀：$0 架構的三個限制

1. **沒有伺服器端驗證。** 依 spec §2.2 ②，禁用 Cloud Functions，所有商業邏輯（升級、階級結算、DAG 解鎖、兌換扣款、畢業判定）都在前端 `src/engine/*` 計算後寫回 Firestore。
   **登入家庭帳號的任何裝置都能改寫全部資料。** 單一家庭自用可接受。
2. **Admin 的 PIN 只防 7 歲小孩誤入，不是資安措施。** PIN 在前端驗證，打開 devtools 就能繞過。
   真正的存取控制是 [`firestore.rules`](firestore.rules)（鎖定單一家庭帳號 UID）。
3. **Firebase `apiKey` 是公開值。** GitHub Pages 是公開站台，任何人都看得到 build 出來的設定；
   安全性完全依賴 Firestore 規則，不是靠藏 key。

---

## 快速開始（Local Mode，不需要 Firebase）

```bash
npm install
npm run dev          # http://localhost:5173/badmintonHero/
```

- 小孩畫面：`/#/`
- 家長控制台：`/#/admin`（預設 PIN `0000`，可用 `VITE_ADMIN_PIN` 設定）
- 用**同一個瀏覽器開兩個分頁**（一個小孩、一個 admin）就能模擬兩台裝置：admin 簽到／核可，小孩分頁即時播動畫。
- 畫面左下角的 `LOCAL R:x W:y` 是開發期讀寫計數器（spec §2.2 ④），點開可看明細；單次 session 讀取超過 500 會變紅並 `console.error`。

> **開發、除錯、調動畫一律用 Local Mode**，避免 hot-reload 反覆重掛監聽消耗 Firestore 額度。

## 指令

| 指令 | 用途 |
|---|---|
| `npm run dev` | 開發伺服器 |
| `npm test` | 單元測試（engine、reconcile 不變式、快取 TTL、ESLint 護欄、讀取預算） |
| `npm run validate` | 課程包驗證：DAG 無環／無孤兒／門檻遞增／order／總量校驗／52 次練習模擬 |
| `npm run lint` | ESLint（`exhaustive-deps` 與 Firestore import 限制都是 error） |
| `npm run build` | 型別檢查 ＋ 產出 `dist/` |
| `npm run check` | 以上全部 |
| `npm run gen:assets` | 重新產生佔位音效（`.wav`）與 PWA icon |

---

## 正式部署（Firebase ＋ GitHub Pages，全程 $0）

### 1. Firebase（Spark 免費方案，**不要綁信用卡**）
1. [Firebase Console](https://console.firebase.google.com/) 建立專案 → 新增 **Web 應用程式**，記下設定值。
2. **Firestore Database** → 建立資料庫（production mode，選離你近的區域）。
3. **Authentication** → 啟用 **Email/Password** → 手動新增**一個**家庭帳號 → 複製它的 **UID**。
4. 把 [`firestore.rules`](firestore.rules) 裡的 `REPLACE_WITH_FAMILY_UID` 換成該 UID，部署規則：
   ```bash
   npx firebase-tools login
   npx firebase-tools deploy --only firestore --project <你的 projectId>
   ```
5. **設定用量告警**：Google Cloud Console → Monitoring → Alerting，針對 Firestore 讀取量設 email 告警（例如每日 > 5,000）。

### 2. GitHub Pages
1. repo：`geeksajen/badmintonHero`（workflow 會自動用 repo 名稱當 base path，網址為 `https://geeksajen.github.io/badmintonHero/`）。
2. Settings → Pages → Source 選 **GitHub Actions**。
3. Settings → Secrets and variables → Actions，新增：
   `VITE_FIREBASE_API_KEY`、`VITE_FIREBASE_AUTH_DOMAIN`、`VITE_FIREBASE_PROJECT_ID`、
   `VITE_FIREBASE_STORAGE_BUCKET`、`VITE_FIREBASE_MESSAGING_SENDER_ID`、`VITE_FIREBASE_APP_ID`、
   `VITE_ADMIN_PIN`、`VITE_PLAYER_ID`（例如 `hero`）。
4. push 到 `main` → [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) 會跑 lint → test → validate → build → 部署。

### 3. 兩台裝置
- iPad 與手機各開一次網址、登入家庭帳號（之後會記住）→ Safari「分享 → 加入主畫面」即可全螢幕使用。
- 家長手機開 `…/#/admin`。

### 本機測試 Firebase 模式
複製 `.env.example` 為 `.env.local`，填入 Firebase 設定並設 `VITE_STORE_MODE=firebase`。
只在驗收時切過去，平常維持 `local`。

---

## 額度防護（spec §2.2 ③④）是怎麼落實的

| 規則 | 落實位置 |
|---|---|
| 全 app 只有 2 個 `onSnapshot`，只監聽 2 份文件 | 實作在 `src/store/firebaseAdapter.ts`（恰好 2 次），只由 `src/providers/GameProvider.tsx` 的 `useEffect(…, [])` 各訂閱一次。`tests/guardrails.test.ts` 會 grep 驗證 |
| 34 節點進度合併成一份文件 | `players/{id}/state/questProgress` 的 `byNodeId` |
| 靜態資料不進 Firestore | `src/data/curricula/<pack>/`（含商店目錄） |
| 歷史資料 `getDocs` ＋ `limit(20)` ＋ 1 小時快取 | `src/store/cache.ts`；另帶 `rev` 戳（`player.logsRev` 等），另一台裝置寫入後快取自動失效，否則小孩要等 1 小時才看到家長核可的日誌 |
| 核可在同一個 `runTransaction` 內寫完 | `firebaseAdapter.dispatch()`；動作本身是純函式 `src/engine/actions.ts` |
| ＋1 不逐次寫入 | `QuestDetailSheet` 以 1.5 秒 debounce／關閉面板時才寫一個欄位 |
| 離線持久化 | `src/lib/firebase.ts`：`persistentLocalCache`（`enableIndexedDbPersistence` 在 Firebase v10+ 已棄用，這是官方等價寫法） |
| Firestore 只能在 `src/store/` 使用 | ESLint `no-restricted-imports`（`src/store/**` 與 `src/lib/firebase.ts` 例外） |
| `exhaustive-deps` 為 error | `eslint.config.js`，CI 擋下 |
| 開發期讀寫計數器 | `src/lib/firestore-counter.ts` ＋ 畫面左下角 `DevCounter` |

`tests/session-budget.test.ts` 會模擬一次完整練習（簽到＋5 次送審／核可＋2 次獎勵＋1 次兌換＋看日誌兩次），斷言單一裝置讀取 < 100（目前約 79），且日誌第二次開啟 0 讀取。

**離線時**：`runTransaction` 需要連線，因此離線時改以監聽到的最新狀態計算、用 `writeBatch` 排隊，連線恢復後自動送出（最後寫入者勝）。單一家庭、同時間通常只有一台裝置在操作，可接受。

---

## 修改關卡表（spec §12 —— 這是常態，不是例外）

關卡表在 [`src/data/curricula/badminton-7yo-v1/quests.ts`](src/data/curricula/badminton-7yo-v1/quests.ts)。

1. **id 永不重用、永不重排**；插入節點用後綴（`q2_3b`），尾端接續編號。
2. **顯示順序看 `order`**（初版 10, 20, 30…），插入時用中間值（如 35）。
3. **新節點當支線**：`parentIds` 指向已完成節點、不當任何現有節點的前置 → 立刻可挑戰、零回退。
4. **不要刪節點**：設 `isRetired: true`，並把它的 `parentIds` 併入子節點。
5. **改 `unit` 或改任務語意 = 換新 id**（舊的退役）。
6. `index.ts` 的 `QUEST_DATA_VERSION` +1，新節點填 `addedInVersion`，在 `CHANGELOG.md` 記一行。
7. `npm run validate` 通過 → push 部署。App 啟動時會自動 `reconcile()` 一次（補發因門檻調低而應得的獎牌、解鎖新支線、播「發現新的小路！」動畫）；也可在 Admin【課程進度 → 重新結算】手動觸發。

`reconcile()` 保證：**冪等**、`bestCount`／`tiersAwarded`／`status`／`totalExp`／`coins` **只增不減**、不重複發放、退役節點的進度與獎勵保留（見 `tests/reconcile.test.ts`）。

**每次練習後花兩分鐘在 [`NOTES.md`](src/data/curricula/badminton-7yo-v1/NOTES.md) 記一行。**

### 給下一個孩子
1. `cp -r src/data/curricula/badminton-7yo-v1 src/data/curricula/<new-pack>`，修改 `index.ts` 的 `CURRICULUM_ID`、`QUEST_DATA_VERSION = 1`
2. 在 `src/data/index.ts` 的 `CURRICULA` 註冊
3. 新的 `VITE_PLAYER_ID`；第一次開啟時建立的玩家預設使用 `DEFAULT_CURRICULUM_ID`，要指定新課程包可在 Firestore 把 `players/{id}.curriculumId` 改掉（或改 `DEFAULT_CURRICULUM_ID` 另外部署一份）
4. `firestore.rules` 不需改動

---

## 專案結構

```
src/
├─ types/               全部型別（spec §3）
├─ data/curricula/      課程包（關卡、章節、裝備、稱號、商店、等級曲線、出席、CHANGELOG、NOTES）
├─ engine/              純函式遊戲邏輯（可單元測試）
│  ├─ actions.ts        所有會改狀態的動作：簽到／送審／核可／再練／獎勵／兌換／出貨／畢業／重置…
│  ├─ unlock.ts tiers.ts exp.ts attendance.ts economy.ts graduation.ts reconcile.ts
│  ├─ settle.ts grant.ts  核可與 reconcile 共用的結算／發獎
│  ├─ stats.ts validate.ts util.ts
├─ store/               ← 唯一允許 import firebase/firestore 的目錄
│  ├─ types.ts          GameStore 介面
│  ├─ localAdapter.ts   localStorage（開發用，分頁間以 storage 事件同步）
│  ├─ firebaseAdapter.ts
│  ├─ cache.ts          1 小時 TTL ＋ rev 快取
│  └─ index.ts          依 VITE_STORE_MODE 選擇（Firebase SDK 動態載入）
├─ providers/GameProvider.tsx   ★ 唯二的監聽在此建立
├─ hooks/               useGameState / useGameActions / useHistory / useSound / useCelebrationQueue
├─ components/player/   HeroHeader, QuestMap, QuestNodeItem, TierBar, QuestDetailSheet,
│                       EquipmentDrawer, RewardShop, AdventureLog, CelebrationModal, Certificate
├─ components/admin/    PinGate, SessionCheckIn, PendingList, ActiveQuestList, BonusDispatcher,
│                       OrderList, ShopManager, CourseProgress, DangerZone
├─ pages/               PlayerPage, AdminPage, CertificatePage
└─ lib/                 firebase.ts, firestore-counter.ts, sound.ts …
scripts/validate-data.ts   課程包驗證 ＋ 52 次練習模擬
scripts/gen-assets.mjs     佔位音效與 icon 產生器
tests/                     vitest
```

## 與 spec 的差異（實作時的決定）

| 項目 | 決定 | 原因 |
|---|---|---|
| 三階獎勵切分 | 金牌 = 總額 − 銅 − 銀 | spec 的 `Math.round` 各自取整會讓 75 幣變 76（第 5 章），總量對不上 §4.4 |
| 已完成節點回頭挑戰銀／金 | `status` 維持 `completed`，只設 `submittedAt` 表示待審 | 不變式 3：status 永不回退 |
| `stockPerWeek` | 本週兌換次數存在 `player.redeemCounter` | 兌換時不必另外查 orders（0 額外讀取），且在同一個 transaction 內檢查 |
| 今日練習小計 | `player.activeSession`，`sessions/{id}` 由它推導後覆寫 | 更新練習紀錄不需先讀 session 文件 |
| 快取失效 | TTL 1 小時 ＋ `logsRev`/`ordersRev`/`sessionsRev` | 否則另一台裝置的寫入要等 1 小時才看得到（例如家長看不到新訂單） |
| 「`onSnapshot` 只出現在 GameProvider」 | 呼叫實作在 `firebaseAdapter`，訂閱只在 GameProvider | spec 同時規定元件不得 import `firebase/firestore`，兩者只能這樣同時成立 |
| 音效 | 產生器產生 `.wav` 佔位音效 | 無版權素材；換成 `.mp3` 只需放同名檔並改 `src/lib/sound.ts` 副檔名 |
| 慶祝事件補播 | 30 分鐘內的未播事件才補播 | 新裝置第一次開啟時不會播幾天前的舊動畫 |
| Quest Detail 的 −1 按鈕 | 新增 | 小孩常誤觸 ＋1 |
