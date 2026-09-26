# Badminton Hero Quest（羽球勇者冒險記）— 實作規格 v5.1

> **v5.1 變更摘要（本次，2026-09-26）**：**規格已實作完成並上線使用中**。
> 新增 **§0「實作狀態」**（各區塊完成度、實作與規格的差異、規格外新增的功能）；
> §2.2① base path 改為實際的 `/badmintonHero/`；§8.2 改為允許 Player 畫面有一個不顯眼的家長入口；
> §9 專案結構依實際檔案更新；§11 各 Step 標註完成狀態；§13 由「Start Instruction」改為「下一步」。
>
> v5 變更：新增 **§12「關卡表是活的 —— 中期擴充與課程複用」** ——
> 明訂關卡表**預期會在課程進行中修改**（作者無正式教學經驗，需邊做邊調），
> 定義三條不變式（只增不減）、id/`order` 脫鉤規則、五種改動的標準做法、
> `reconcile()` 校正演算法、改版時的 UI 呈現規則、以及課程包複用給下一個小孩的方式。
> 連帶：`QuestNode` 加 `order`／`isRetired`／`addedInVersion`，
> `Player` 加 `curriculumId`／`curriculumVersion`，
> `src/data/` 改為課程包結構，Admin 加【重新結算】，Step 0 加三項驗收。
> 原 §12 Start Instruction 順延為 §13。
>
> v4 變更：技術棧改為 **$0 成本架構** ——
> 後端 Supabase → **Firebase Firestore**、部署 Vercel → **GitHub Pages**（`HashRouter`）、
> **禁用 Cloud Functions**（全部邏輯在前端）、新增 **§2.2 額度防護硬性規則**與
> **§10 Firestore 資料模型／安全規則／額度預算**、§9 結構與 §11 里程碑同步更新。
> v3 變更：課程週期定為 6 個月、34 節點、銅銀金三階、出席制 EXP、等級上限 25、畢業機制。
> v2 變更：技術棧定案、型別重構、雙向核可流程、兌換訂單、Admin 保護、部署里程碑。
> v1 原稿保留於 `spec.v1.backup.md`。

---

## 0. 實作狀態（2026-09-26）

**§11 的 Step 0～7 已全部完成，已部署到 GitHub Pages 並實際使用中。目前處於 Step 8（真人測試與數值微調）。**

- 線上網址：`https://geeksajen.github.io/badmintonHero/`（家長控制台 `#/admin`）
- repo：`geeksajen/badmintonHero`，push 到 `main` → GitHub Actions 跑 lint → test → validate → build → 部署
- 自動化檢查：`npm test` **58 個測試全綠**（engine、reconcile 不變式、快取 TTL、ESLint 護欄、讀取預算）；
  `npm run validate` 全部通過（DAG、三階遞增、`order`、總量 3,970 EXP / 1,985 幣、52 次練習模擬）
- 課程包仍是初版：`QUEST_DATA_VERSION = 1`，`CHANGELOG.md` 只有 v1，`NOTES.md` 尚未填寫
  （已有 Admin【實戰筆記】可自動整理並匯出，見 §7.2）

### 0.1 完成度一覽

| 區塊 | 狀態 | 備註 |
|---|---|---|
| §3 資料模型 | ✅ | 另加欄位，見 0.2 |
| §4 數值／§5 關卡表（34 節點） | ✅ | 依規格原值，尚未依實戰調整 |
| §6 核心流程（簽到、雙向核可、DAG、階級、升級、兌換、畢業） | ✅ | 全在 `src/engine/*` 純函式 |
| §7.1 Player View | ✅ | 另有規格外新增，見 0.3 |
| §7.2 Admin View | ✅ | 含【重新結算】、商店臨時上下架／改價 |
| §8 UX 規則（零懲罰、PIN、觸控、音訊、reduced-motion、離線提示、PWA） | ✅ | §8.2 已修訂 |
| §2.2 額度防護（2 個 `onSnapshot`、單一進度文件、快取、transaction、計數器、ESLint） | ✅ | 讀取預算測試：一次完整練習單一裝置約 79 次讀取（目標 < 100） |
| §10 Firestore 規則／資料結構 | ✅ | |
| §12 活關卡表（`order`、退役、`reconcile()`、NEW 標記、課程包） | ✅ 機制完成 | 尚未真正改過一次關卡表 |
| Firebase Console 每日用量告警 | ❓ | 屬手動設定，請自行確認已設 |
| 音效 | ✅ 合成 | `scripts/gen-assets.mjs` 合成 8 個 `.wav`（FM 鐘聲、銅管和弦、濾波噪音、殘響），無版權問題；要換錄製音效只需放同名檔 |
| Step 8 支援：實戰筆記 | ✅ | 見 §7.2 |

### 0.2 實作與規格的差異（實作時的決定）

| 項目 | 規格 | 實作 | 原因 |
|---|---|---|---|
| GitHub Pages base path | `/badminton_game/` | `/badmintonHero/`（可用 `BASE_PATH` 覆寫） | 與實際 repo 名稱一致 |
| 三階獎勵切分 | 各階 `Math.round` | 金牌 = 總額 − 銅 − 銀 | 各自取整會讓總量對不上 §4.4 |
| 已完成節點回頭挑戰銀／金 | — | `status` 維持 `completed`，只設 `submittedAt` 表示待審 | 不變式 3：status 永不回退 |
| `stockPerWeek` | — | 本週兌換次數存在 `player.redeemCounter` | 同一 transaction 內檢查，0 額外讀取 |
| 今日練習小計 | — | `player.activeSession` | 更新練習紀錄不需先讀 session 文件 |
| 快取失效 | TTL 1 小時 | TTL ＋ `logsRev`／`ordersRev`／`sessionsRev` | 否則另一台裝置的寫入要等 1 小時才看得到 |
| 離線持久化 API | `enableIndexedDbPersistence` | `persistentLocalCache` | 前者在 Firebase v10+ 已棄用 |
| 離線時的核可 | `runTransaction` | 離線改用 `writeBatch` 排隊，恢復後送出 | transaction 需要連線 |
| `onSnapshot` 位置 | 只出現在 `GameProvider` | 呼叫實作在 `firebaseAdapter`，訂閱只由 `GameProvider` 發起 | 同時滿足「元件不得 import firestore」 |
| 音效 | 6 個 `.mp3` | 8 個合成 `.wav`（多了 `pop`、`reveal`） | 無版權素材；見 §8.4 |
| 慶祝事件補播 | 以 id 去重 | 另加：只補播 30 分鐘內的事件 | 新裝置第一次開啟不播幾天前的舊動畫 |
| `Player` 額外欄位 | — | `shopOverrides`、`redeemCounter`、`activeSession`、`finalCoachWords`、`*Rev` | 見上 |
| `QuestProgress` 額外欄位 | — | `unlockedAtSession`、`tierSessions`（解鎖／各階級頒發時的 `sessionCount`） | 實戰筆記：每關花了幾次練習 |
| `PracticeSession` 額外欄位 | — | `teachNote`（家長教學筆記，小孩看不到）、`sessionNumber` | 實戰筆記 |
| `RewardItem` | — | `isGrandPrize` | 畢業大禮置底＋儲蓄進度條 |
| `CelebrationItem` 額外種類 | — | `bonus`、`discovery`、`retro_medals`、`chapter_unlocked` | 教練獎勵、改版發現新路、補發獎牌、新區域出現 |
| 裝備抽屜 | `EquipmentDrawer` | 改名為「我的寶箱」`TreasureChest` | 見 0.3 |
| §8.2 Admin 入口 | Player 畫面不得有任何連結 | Header 有一個淡灰色 🔒，仍需 PIN；PIN 畫面有「回到地圖」 | 從主畫面開啟的 PWA 無法輸入網址 |

### 0.3 規格外新增的功能

- **Quest Detail 的 −1 按鈕**：小孩常誤觸 ＋1。
- **個人資料編輯**：小孩點頭像／名字可改名、從 6 個內建頭像（`src/data/avatars.ts`）挑一個。
- **章節漸進揭露**：地圖只顯示已到達的章節，之後的章節藏在雲霧後（「打倒這一區的魔王就能看見！」）；
  打倒魔王時播 `chapter_unlocked` 動畫；地圖開啟時自動捲到目前的冒險前線。
  `reconcile()` 不會因改版而提前曝光尚未到達的章節。畢業後（回顧模式）全部顯示。
- **我的寶箱**（取代裝備抽屜）：收集數不顯示分母（只增不減）；未取得的裝備顯示剪影＋「完成哪一關可以得到」，
  該關目前可挑戰時有「快到手了」跳動徽章；尚未到達章節的裝備顯示為神秘禮物，不透露名稱與章節。
- **卡通風格改版**：天空背景、圓體字（Huninn）、粗描邊與厚陰影、emoji 底部分頁列、章節招牌、
  地圖上顯示小孩頭像的「你在這裡」標記、慶祝卡片旋轉光芒。
- **🔊 念給我聽**：任務說明（連同「做到 N 下就能拿到銅牌」）、教練評語、慶祝卡片上的教練的話都可以點喇叭朗讀。
  用裝置內建的 Web Speech API（優先 zh-TW 語音、語速 0.9），不需網路、不花額度；不支援的裝置不顯示按鈕。
- **下一個目標卡**：地圖分頁固定在底部分頁列上方，顯示「👉 下一關：○○ 🥉 5 下」，點一下直接打開那一關。
  順序：已到達章節中地圖最前面的可挑戰節點 → 等教練確認中的節點 → 還沒滿金牌的已完成節點（回頭挑戰）；畢業後不顯示。
- **＋1 音調隨進度升高**：越接近下一面獎牌 `pop` 音越高，跨過門檻時播 `medal`；新區域／發現新小路播 `reveal`。
- **實戰筆記**（Admin【筆記】區，Step 8 支援）：見 §7.2。
- **PWA 自動更新**：新版部署後 Service Worker 立即接手並重新載入；每 30 分鐘及 App 回到前景時檢查更新
  （`src/lib/pwa.ts`）。

---

## 1. Role Definition & Project Objective

You are a Principal Full-Stack Engineer and Senior Game UI/UX Designer.
Build a Gamified Learning & Progress Tracking Web App named **"Badminton Hero Quest"（羽球勇者冒險記）**。

### Project Vision
把真實世界的羽球教學（對象：7 歲兒童）轉化為互動式 RPG。

- **The Child (Player)**：在 iPad／手機上體驗 RPG 世界，解鎖地圖節點、獲得 EXP／金幣、裝備道具、兌換真實獎勵。
- **The Parent/Coach (Admin)**：用手機上的即時控制台審核任務、發放額外 EXP、寫下評語、管理獎勵商店與出貨。

### 課程週期（v3 新增，這是所有數值的基準）
**整個課程設計為 6 個月（26 週）結束，之後畢業。**

- 假設頻率：**每週 2 次、每次 45～60 分鐘**，合計約 **52 次練習**。
- 6 個月內要走完全部 5 章節、34 個節點，並在最後取得「羽球勇者」稱號與畢業證書。
- **所有技能目標值都必須在此前提下設定** —— 凡是 7 歲孩童受臂力／身高／體能限制、
  半年內難以達成的動作（打到後場、跳殺、全場單打 21 分），一律降階或移除。§5 已照此調整。

### 使用情境（它決定了架構）
練習現場有 **兩台實體裝置**：小孩的 iPad ＋ 家長的手機。
家長在手機按下核可 → **小孩 iPad 立刻噴彩帶**。
→ 這是跨裝置、跨網路的即時同步，`localStorage` 無法達成。**雲端資料庫是必需品，不是加分項。**

### 成本約束（v4 新增，與上一點同等重要）
**本專案必須在完全 $0 的免費額度內運作，且永不啟用任何付費方案。**
使用者僅 2 人（1 個小孩、1 個家長）、每週約 2 次、為期 6 個月，
實際流量極小 —— 但**程式碼寫錯（無窮迴圈、過度監聽）足以在一天內燒光免費額度**。
故 §2.2 的額度防護規則屬於**硬性限制**，與功能需求同級，不可為了方便而妥協。

---

## 2. Technical Stack（已定案，不再二選一）

### 2.1 選型

| 層級 | 選擇 | 理由 |
|---|---|---|
| Build / Framework | **Vite + React 18 + TypeScript**（純 SPA） | 靜態產出，可直接丟 GitHub Pages；不需要 SSR |
| 樣式 | **Tailwind CSS** | — |
| 動畫 | **Framer Motion** ＋ **canvas-confetti** | 節點彈跳、升級橫幅、金幣跳動、彩帶 |
| 圖示 | **lucide-react** | — |
| 音效 | **Howler.js** | 需處理 iOS autoplay 解鎖（見 §8.4） |
| 資料＋即時同步 | **Firebase Firestore**（Spark 免費方案） | 免費額度下的即時同步；SDK 直連，不需要自己的伺服器 |
| 身分驗證 | **Firebase Auth — Email/Password，單一家庭共用帳號** | 安全規則得以鎖定單一 UID；見 §10.3 |
| 路由 | **react-router-dom 的 `HashRouter`** | **必須是 Hash**，否則 GitHub Pages 重新整理 `/admin` 會 404 |
| 部署 | **GitHub Pages**（GitHub Actions 自動建置）＋ **PWA**（vite-plugin-pwa） | $0；iPad／手機可「加到主畫面」全螢幕開啟 |

### 2.2 $0 成本與額度防護（硬性限制，不可妥協）

#### ① 靜態託管
- 前端必須是 **Vite 建立的 React SPA**，`npm run build` 產出純靜態檔，部署到 **GitHub Pages**。
- **必須使用 `HashRouter`**（網址形如 `https://geeksajen.github.io/badmintonHero/#/admin`），
  以避免重新整理或直接開啟子路徑時出現 404。
- `vite.config.ts` 必須設定 `base: '/badmintonHero/'`（與 repo 名稱一致，可用 `BASE_PATH` 覆寫），否則 assets 路徑全錯。

#### ② 絕不使用雲端函式與任何付費功能
- **禁用 Firebase Cloud Functions**（需 Blaze 付費方案）、Cloud Storage、Hosting 以外的一切付費品項。
- **所有商業邏輯完全在前端**透過 Firebase SDK 處理：
  等級計算、階級結算、DAG 解鎖、兌換扣款、畢業判定，全部是 `src/engine/*` 的純函式，
  算完後把結果寫回 Firestore。
- 這代表**沒有伺服器端驗證**。單一家庭自用可接受，安全性靠 §10.3 的 Firestore 規則
  （鎖定單一 UID）＋ §8.2 的 PIN 閘門。**此限制必須在 README 明確記載。**

#### ③ Firestore 額度最佳化（至關重要）
免費額度：**每日 50,000 次讀取 / 20,000 次寫入 / 1 GiB 儲存**。

**核心策略：不是「避免即時監聽」，而是「把被監聽的文件數壓到最小」。**

> Firestore 的 `onSnapshot` **不是輪詢**：它只在「初次訂閱」與「文件實際變更」時各計 1 次讀取。
> 因此昂貴的是**監聽了很多份文件**，而不是監聽本身。
> 本專案的核心價值就是即時慶祝動畫，若改成輪詢反而更貴也更慢 —— 故保留 `onSnapshot`，
> 但**只監聽 2 份文件**（見下）。

**必須遵守的規則：**

1. **全app 只允許 2 個 `onSnapshot` 監聽，且只監聽 2 份文件**
   （`players/{id}` 與 `players/{id}/state/questProgress`，見 §10.1）。
   在最上層的 Provider 建立一次，元件內**一律禁止**呼叫 `onSnapshot`。

2. **34 個節點的進度合併存成「一份文件」**，不是 34 份。
   一次核可 → 1 次寫入 → 兩台裝置各 1 次讀取 = **2 次讀取**。
   （若做成 34 份文件的 collection 監聽，初次訂閱就要 34 次讀取。）

3. **靜態資料一律不進 Firestore**：
   34 節點定義、章節、裝備、稱號、等級曲線、**商店商品目錄**全部寫死在 `src/data/*`。
   讀取成本 = **0**。商店要改價就改 code 重新部署。

4. **歷史型資料不監聽，改用 `getDocs` 單次讀取 ＋ LocalStorage 快取 1 小時**：
   冒險日誌（`logs`）、練習紀錄（`sessions`）、已完成訂單。
   - 快取 key 形如 `bhq:cache:logs`，內容 `{ data, fetchedAt }`，TTL **3,600,000 ms**。
   - 進入分頁時先讀快取；未過期就**完全不發 Firestore 請求**。
   - 每次 `getDocs` 一律加 `limit(20)` ＋ `orderBy('createdAt', 'desc')`，禁止無上限查詢。
   - 自己寫入新資料時，**手動把新項目 unshift 進快取**，而非重新抓取。

5. **「按下的那一刻才讀」**：
   兌換獎勵前**不需要**額外讀取餘額 —— `coins` 已在 `players/{id}` 的即時監聽中。
   但扣款**必須用 `runTransaction`**，確保不會扣成負數、不會因雙裝置同時操作而重複扣。

6. **開啟離線持久化**：`initializeFirestore` 搭配 `persistentLocalCache`
   （舊 API `enableIndexedDbPersistence(db)` 在 Firebase v10+ 已棄用）。
   球館 Wi-Fi 不穩時可離線操作，連線恢復後自動同步；同時減少重複讀取。

#### ④ 防範無窮迴圈（會在一天內燒光額度的頭號風險）
- **`react-hooks/exhaustive-deps` 設為 `error`**，CI 擋下。
- 所有 Firestore 存取**只能**寫在 `src/store/` 內，**元件與一般 hook 一律不得直接 import `firebase/firestore`**。
  以 ESLint `no-restricted-imports` 強制。
- 建立監聽的 `useEffect` **依賴陣列必須是 `[]`**，並回傳 `unsubscribe` 清理函式。
- **依賴陣列中禁止出現物件／陣列／函式的字面值**（每次 render 都是新參考 → 無限重跑）。
  需要時用 `useCallback` / `useMemo` / primitive 值。
- **嚴禁**在 `useEffect` 內 `getDocs` 之後 `setState`，而該 state 又出現在同一個 effect 的依賴陣列中。
- **必做：開發期讀寫計數器** —— 在 `src/lib/firestore-counter.ts` 包一層，
  累計本次 session 的讀／寫次數，`import.meta.env.DEV` 時印在 console 並常駐畫面角落；
  **單次 session 超過 500 次讀取即 `console.error` 大聲警告**。
  這是唯一能在開發階段就抓到迴圈的實際手段。
- Firebase Console 設定**每日用量告警 email**。

#### ⑤ 額度預算試算（證明此設計安全）

| 情境 | 讀取 | 說明 |
|---|---|---|
| 開啟 App（單一裝置） | 2 | 兩份文件各 1 次初次訂閱 |
| 一次練習約 40 筆寫入（簽到／＋1／核可／獎勵） | ~80 | 每筆變更 × 2 台裝置各 1 次 |
| 查看冒險日誌（快取未命中） | 20 | `limit(20)`，之後 1 小時內 0 次 |
| 查看訂單 | ~5 | — |
| **單日合計（有練習的日子）** | **~110** | — |
| **每日免費額度** | **50,000** | **餘裕約 450 倍** |

寫入端：一次練習約 40～60 次寫入，免費額度 20,000/日，餘裕約 300 倍。
儲存：6 個月全部資料 < 1 MB，免費額度 1 GiB。

> **結論**：正常使用下額度用不到 1%。唯一的風險是程式錯誤，
> 因此 ④ 的每一條都必須落實，而不是「盡量」。

### 2.3 開發期的 Local Mode
所有資料存取集中在單一 `GameStore` 介面（§9 的 `src/store/`）。
`localAdapter`（localStorage）供開發與離線 demo 使用，`firebaseAdapter` 為正式實作，
以 `VITE_STORE_MODE` 切換。**開發、除錯、跑動畫時一律用 Local Mode，
避免反覆 hot-reload 消耗 Firestore 額度。**

---

## 3. Data Models（TypeScript Interfaces）

### 3.1 設計原則
1. **靜態關卡定義**與**動態玩家進度**必須分離
   （v1 把 `status` 放在 `QuestNode` 裡，會導致「重置進度」與「調整關卡設計」互相污染）。
2. **兩條進度線**：節點進度（長期目標）＋ 出席進度（每次練習都會動的短期回饋）。
3. **節點內三階達標**（銅／銀／金），讓每次練習都能「往前一格」，而非卡在同一個灰圈上。

- **靜態**（寫在程式碼常數、進版控）：`Chapter`、`QuestNode`、`Equipment`、`Title`、`RewardItem`、`LEVEL_CURVE`、`ATTENDANCE_MILESTONES`
- **動態**（存 DB）：`Player`、`QuestProgress`、`PracticeSession`、`RedemptionOrder`、`ActivityLog`

### 3.2 靜態定義

```typescript
export type ChapterId = 1 | 2 | 3 | 4 | 5;

export interface Chapter {
  id: ChapterId;
  name: string;              // '氣球村'
  nameEn: string;            // 'Balloon Village'
  theme: string;             // tailwind gradient, e.g. 'from-pink-400 to-rose-500'
  icon: string;              // emoji
  description: string;
  planWeeks: [number, number];   // 預計週次區間，e.g. [1, 3]
}

/** 三階達標 */
export type TierLevel = 'bronze' | 'silver' | 'gold';

export interface QuestTiers {
  bronze: number;   // 達到即視為「節點完成」，解鎖後續節點
  silver: number;
  gold: number;
}

/** 各階可領取的 EXP／金幣比例（總和為 1） */
export const TIER_RATIO: Record<TierLevel, number> = {
  bronze: 0.5,
  silver: 0.3,
  gold: 0.2,
};

/**
 * 靜態關卡定義：不含任何玩家狀態。
 * ★ 這份資料預期會在課程進行中被修改，見 §12。
 */
export interface QuestNode {
  id: string;                  // 'q1_1'。★ 永不重用、永不重排，插入用後綴（'q2_3b'），見 §12.3
  chapterId: ChapterId;
  order: number;               // ★ 地圖顯示順序，與 id 脫鉤。插入節點時只改這裡，見 §12.3
  title: string;               // '氣球不落地'
  description: string;         // 給小孩看：口語、短句、正面用詞
  coachNote: string;           // 給家長看：教學重點與驗收標準
  tiers: QuestTiers;           // 銅／銀／金門檻
  unit: string;                // '下' | '球' | '拍' | '組' | '次' | '分'
  isBoss: boolean;             // 章節魔王關 → 地圖上放大顯示
  isRetired?: boolean;         // ★ 退役節點：保留資料與已得獎勵，從地圖隱藏，見 §12.4-③
  addedInVersion?: number;     // ★ 於哪個 QUEST_DATA_VERSION 加入，用於 UI 的 NEW 標記
  estimatedSessions: number;   // 規劃用：預估需要幾次練習達成銅牌
  rewardExp: number;           // 三階全滿的總額（依 TIER_RATIO 分批發放）
  rewardCoins: number;         // 同上
  rewardTitleId?: string;      // 於銅牌達成時發放
  rewardEquipmentIds?: string[]; // 於銅牌達成時發放（可一次多件）
  parentIds: string[];         // DAG：空陣列 = 全局起點
}

export interface Equipment {
  id: string;                // 'eq_short_racket'
  name: string;              // '短柄小拍'
  icon: string;              // emoji
  description: string;
}

export interface Title {
  id: string;                // 'title_balloon_rookie'
  name: string;              // '氣球見習生'
  color: string;             // tailwind class
}

/** 獎品目錄（可重複兌換的商品，不是一次性旗標） */
export interface RewardItem {
  id: string;
  title: string;             // '珍珠奶茶'
  cost: number;
  description: string;
  icon: string;              // '🧋'
  isActive: boolean;         // 家長可下架
  stockPerWeek?: number;     // 每週兌換上限，防止一次買爆
}

/** 出席里程碑：純累加、永不歸零（見 §8.1 零懲罰原則） */
export interface AttendanceMilestone {
  count: number;             // 第 N 次練習
  bonusExp: number;
  bonusCoins: number;
  label: string;             // '第 10 次練習！堅持的勇者'
}
```

### 3.3 動態狀態

```typescript
export interface Player {
  id: string;
  name: string;
  avatar: string;
  level: number;
  currentExp: number;        // 當前等級「內」的 EXP（非累計）
  totalExp: number;          // 累計總 EXP
  coins: number;             // 可用餘額
  totalCoinsEarned: number;  // 累計賺取
  currentTitleId: string;
  unlockedEquipmentIds: string[];
  unlockedTitleIds: string[];
  sessionCount: number;      // 累計出席次數
  courseStartDate: string;   // YYYY-MM-DD，用於畢業倒數
  graduatedAt?: string;      // 畢業時間
  lastEvent?: LiveEvent;     // 慶祝動畫觸發器，見下
  curriculumId: string;      // ★ 使用哪一份課程包，e.g. 'badminton-7yo-v1'，見 §12.7
  curriculumVersion: number; // ★ 已套用到哪個 QUEST_DATA_VERSION，用於觸發 reconcile，見 §12.5
  updatedAt: string;
}

/**
 * 慶祝動畫的事件匯流排。
 * 家長核可後，把整串要播的動畫寫進 player 文件的 lastEvent；
 * iPad 端的 onSnapshot 收到變更就依序播放。
 * 這樣「即時慶祝」完全不需要額外的監聽或讀取（見 §2.2 ③）。
 */
export interface LiveEvent {
  id: string;                // uuid，用於去重：同一 id 只播一次
  items: CelebrationItem[];  // 依序播放的動畫佇列
  createdAt: string;
}

export type CelebrationItem =
  | { kind: 'tier'; nodeId: string; tier: TierLevel; exp: number; coins: number }
  | { kind: 'quest_completed'; nodeId: string }
  | { kind: 'equipment'; equipmentId: string }
  | { kind: 'title'; titleId: string }
  | { kind: 'level_up'; from: number; to: number }
  | { kind: 'node_unlocked'; nodeIds: string[] }
  | { kind: 'attendance'; sessionCount: number; exp: number; coins: number }
  | { kind: 'milestone'; label: string; exp: number; coins: number }
  | { kind: 'order_fulfilled'; rewardTitle: string }
  | { kind: 'coach_note'; text: string }
  | { kind: 'graduation' };

/** 每個節點的玩家進度 */
export type QuestStatus =
  | 'locked'       // 前置未完成
  | 'unlocked'     // 可挑戰
  | 'submitted'    // 小孩已回報「我做到了！」，等家長審核
  | 'completed';   // 已達銅牌並經家長核可（仍可回頭挑戰銀／金）

export interface QuestProgress {
  nodeId: string;
  status: QuestStatus;
  currentCount: number;         // 本次練習的次數，UI 顯示進度環
  bestCount: number;            // 歷史最佳，決定已達成的階級
  tiersAwarded: TierLevel[];    // 已發過獎的階級，防止重複發放
  attempts: number;             // 僅家長可見（見 §8.1）
  submittedAt?: string;
  completedAt?: string;
  coachFeedback?: string;       // 家長核可時寫的一句話評語
}

/**
 * 儲存形狀（額度關鍵，見 §2.2 ③-2）：
 * 34 個節點的 QuestProgress 必須合併成「一份」Firestore 文件，
 * 而不是 34 份文件的 collection。
 * 文件路徑：players/{playerId}/state/questProgress
 */
export interface QuestProgressDoc {
  byNodeId: Record<string, QuestProgress>;  // 34 筆，整份文件約 5 KB，遠低於 1 MiB 上限
  updatedAt: string;
}

/** 出席紀錄：第二條進度線，與節點完全脫鉤 */
export interface PracticeSession {
  id: string;
  date: string;              // YYYY-MM-DD
  durationMin?: number;
  attendanceExp: number;     // 固定 ATTENDANCE_EXP
  attendanceCoins: number;   // 固定 ATTENDANCE_COINS
  bonusExp: number;          // 教練額外給的
  bonusCoins: number;
  coachNote?: string;        // 今天的一句話
  createdAt: string;
}

/** 兌換訂單：取代 v1 的 RewardItem.isRedeemed */
export type OrderStatus = 'pending' | 'fulfilled' | 'cancelled';

export interface RedemptionOrder {
  id: string;
  rewardItemId: string;
  rewardTitleSnapshot: string;  // 快照，避免商品改名後訂單失真
  costSnapshot: number;
  status: OrderStatus;
  requestedAt: string;
  fulfilledAt?: string;
  note?: string;
}

/** 活動紀錄：這是 "Progress Tracking" 的核心 */
export type ActivityType =
  | 'session_checked_in'
  | 'attendance_milestone'
  | 'tier_reached'
  | 'quest_submitted'
  | 'quest_approved'
  | 'bonus_granted'
  | 'level_up'
  | 'reward_requested'
  | 'reward_fulfilled'
  | 'equipment_unlocked'
  | 'title_unlocked'
  | 'graduated';

export interface ActivityLog {
  id: string;
  type: ActivityType;
  message: string;           // '【氣球不落地】達成 🥈 銀牌！+18 EXP +9 金幣'
  expDelta?: number;
  coinDelta?: number;
  coachFeedback?: string;
  createdAt: string;
}
```

---

## 4. 數值設計（依 6 個月 / 52 次練習重算，已定案）

### 4.1 三階達標的獎勵切分

節點的 `rewardExp` / `rewardCoins` 是**三階全滿的總額**，依 `TIER_RATIO` **分批**發放：

| 階級 | 比例 | 意義 |
|---|---|---|
| 🥉 銅 | **50%** | **達成即算「節點完成」，解鎖後續節點** |
| 🥈 銀 | 30% | 額外獎勵，可事後回頭刷 |
| 🥇 金 | 20% | 完美達成，地圖節點顯示金色光環 |

**關鍵設計：解鎖只看銅牌。** 小孩絕不會因為打不到金牌而卡在地圖上。
銀／金是「回頭再來」的動機，不是路障。

### 4.2 節點 EXP／金幣基準

| 章節 | 一般節點（金牌全滿總額） | 魔王節點 |
|---|---|---|
| 第 1 章 | 60 EXP / 30 幣 | 120 EXP / 60 幣 |
| 第 2 章 | 80 EXP / 40 幣 | 160 EXP / 80 幣 |
| 第 3 章 | 100 EXP / 50 幣 | 200 EXP / 100 幣 |
| 第 4 章 | 120 EXP / 60 幣 | 240 EXP / 120 幣 |
| 第 5 章 | 150 EXP / 75 幣 | 300 EXP / 150 幣 |

**34 節點全金牌合計：3,970 EXP / 1,985 金幣。**

### 4.3 出席制（第二條進度線，v3 新增）

```typescript
export const ATTENDANCE_EXP = 25;    // 每次練習，出席即得
export const ATTENDANCE_COINS = 10;
```

| 來源 | EXP | 金幣 | 52 次合計 |
|---|---|---|---|
| 出席（每次固定） | 25 | 10 | 1,300 / 520 |
| 教練即時獎勵（每次 10～50 / 5～30，均值 25／12） | 25 | 12 | 1,300 / 624 |

**出席里程碑**（純累加、永不歸零，不做 streak）：

```typescript
export const ATTENDANCE_MILESTONES: AttendanceMilestone[] = [
  { count: 5,  bonusExp: 50,  bonusCoins: 25,  label: '第 5 次練習！好的開始' },
  { count: 10, bonusExp: 100, bonusCoins: 50,  label: '第 10 次練習！堅持的勇者' },
  { count: 20, bonusExp: 150, bonusCoins: 75,  label: '第 20 次練習！不動如山' },
  { count: 35, bonusExp: 200, bonusCoins: 100, label: '第 35 次練習！快到山頂了' },
  { count: 50, bonusExp: 300, bonusCoins: 150, label: '第 50 次練習！傳說級毅力' },
];
// 合計 800 EXP / 400 金幣
```

> **為什麼需要這條線**：節點進度必然有卡關期（第 3 章尤其）。
> 出席制保證**每次練習 EXP 條一定會動、金幣一定會增加**，
> 小孩不會出現「我很努力但畫面沒反應」的挫折。這是 6 個月週期能撐住的關鍵。

### 4.4 總量與等級曲線

**6 個月總收入試算**

| 來源 | EXP | 金幣 |
|---|---|---|
| 34 節點（全金牌） | 3,970 | 1,985 |
| 出席 × 52 | 1,300 | 520 |
| 教練獎勵 × 52 | 1,300 | 624 |
| 出席里程碑 | 800 | 400 |
| **合計（全金牌）** | **7,370** | **3,529** |
| 合計（約 75% 階級達成，較實際） | ~6,400 | ~3,100 |

```typescript
/** 升到下一級所需 EXP：requiredExp(L) = 50 + (L - 1) * 20，上限 Lv.25 */
export const LEVEL_CURVE: number[] = [
  50,  70,  90,  110, 130, 150, 170, 190, 210, 230,
  250, 270, 290, 310, 330, 350, 370, 390, 410, 430,
  450, 470, 490, 510,
]; // 24 個級距，合計 6,720
export const MAX_LEVEL = 25;
```

| 等級 | 升級所需 | 累計 | 等級 | 升級所需 | 累計 |
|---|---|---|---|---|---|
| Lv.1 → 2 | 50 | 50 | Lv.13 → 14 | 290 | 1,920 |
| Lv.2 → 3 | 70 | 120 | Lv.14 → 15 | 310 | 2,210 |
| Lv.3 → 4 | 90 | 210 | Lv.15 → 16 | 330 | 2,520 |
| Lv.4 → 5 | 110 | 320 | Lv.16 → 17 | 350 | 2,850 |
| Lv.5 → 6 | 130 | 450 | Lv.17 → 18 | 370 | 3,200 |
| Lv.6 → 7 | 150 | 600 | Lv.18 → 19 | 390 | 3,570 |
| Lv.7 → 8 | 170 | 770 | Lv.19 → 20 | 410 | 3,960 |
| Lv.8 → 9 | 190 | 960 | Lv.20 → 21 | 430 | 4,370 |
| Lv.9 → 10 | 210 | 1,170 | Lv.21 → 22 | 450 | 4,800 |
| Lv.10 → 11 | 230 | 1,400 | Lv.22 → 23 | 470 | 5,250 |
| Lv.11 → 12 | 250 | 1,650 | Lv.23 → 24 | 490 | 5,720 |
| Lv.12 → 13 | 270 | 1,920 | Lv.24 → 25 | 510 | 6,210 |
| | | | **滿等 Lv.25** | | **6,720** |

**校驗**
- **第一次練習必升級**：出席 25 ＋ `q1_1` 銅牌 30 ＋ 教練獎勵 25 ＝ 80 > 50 ✓（且直接溢出到 Lv.2 中段）
- **升級頻率**：24 次升級 ÷ 52 次練習 ≈ **每 2.2 次練習升一級**。
  前期幾乎每次都升，後期約 4 次一升 —— 對 7 歲來說是合適的慶祝密度。
- **滿等時機**：75% 階級達成 ≈ 6,400 EXP ≈ Lv.24；**全金牌 7,370 EXP 才摸得到 Lv.25**。
  刻意讓滿等成為「全金牌」的專屬獎勵，且與第 5 章魔王同步發生。

### 4.5 獎勵商店定價

**收入基準：約 3,100 金幣 / 26 週 ≈ 每週 120 金幣。**
定價原則：一週練習量 ≈ 一個中等獎品。

| 獎品 | icon | 價格 | 級距 | stockPerWeek |
|---|---|---|---|---|
| 卡通 30 分鐘 | 📺 | 60 | 小獎 | 2 |
| 選今晚的晚餐 | 🍜 | 80 | 小獎 | 2 |
| 珍珠奶茶 | 🧋 | 100 | 中獎（約一週） | 1 |
| 跟爸爸去球場打球 1 小時 | 🏸 | 120 | 中獎（讓「運動」本身也是獎勵） | 1 |
| 挑一本新書 / 小玩具 | 🎁 | 200 | 中大獎（約兩週） | 1 |
| 假日出遊選地點 | 🗺️ | 300 | 大獎（約三週） | — |
| 樂高小盒組 | 🧱 | 450 | 大獎（約一個月） | — |
| **畢業大禮：自己挑一支新球拍** | 🏆 | **1,000** | **終極目標／金幣回收池** | — |

> 「畢業大禮」同時是**經濟系統的水槽**：沒有它，後期金幣會嚴重通膨、小獎失去意義。
> 它也給了小孩一個橫跨 6 個月的儲蓄目標。

### 4.6 畢業機制（v3 新增）

滿足以下**任一**條件即觸發畢業（家長於 Admin 按下【舉行畢業典禮】）：
- 完成 `q5_6`（最終魔王）銅牌以上，或
- `courseStartDate` 起算滿 26 週

畢業表現：全螢幕典禮動畫 → 授予「羽球勇者」稱號與 ⚔️ 勇者之拍 →
生成**畢業證書頁**（可截圖／列印）：總練習次數、總 EXP、最終等級、
金銀銅牌數量、走過的 5 個區域、教練的最後一段話、全部冒險日誌摘要。

---

## 5. 關卡表（課程包 `badminton-7yo-v1` / 5 章節 / 34 節點 / 26 週）

> ### ⚠️ 這份表格是「初版」，不是定案
> 作者沒有正式的羽球教學經驗，**預期會在陪女兒實際練習後修改本表**。
> 因此本表是一份**可版控、可中期擴充、可複用於下一個小孩**的課程包
> （`src/data/curricula/badminton-7yo-v1/`），不是寫死的常數。
>
> **修改本表前必讀 §12。** 三條鐵則先列於此：
> 1. **id 永不重用、永不重排** —— 插入節點用後綴（`q2_3b`），不要把後面全部改號。
> 2. **顯示順序看 `order` 欄位**，不看 id。插入節點只調整 `order`。
> 3. **新增節點一律當支線**（`parentIds` 指向已完成節點，且不當任何現有節點的前置），
>    這樣既有進度零回退、新節點立刻可挑戰。
>
> 下表的 `order` 欄位未逐一列出，初版即為各章由上而下 `10, 20, 30…`（留間隔供插入）。

> **相對 v2 的調整原則**
> 1. **後段加密**：節點數 6 / 7 / 8 / 7 / 6 —— 最難的第 3 章節點最多，讓卡關期仍有進展。
> 2. **難度全面降階**，移除 7 歲半年內不可及的目標：
>    - ❌ 高遠球「擊中後場」→ ✅ 過中線即可（臂力限制）
>    - ❌ 跳起殺球 → ✅ 原地頭頂擊球（動作定型與落地衝擊風險，跳躍延後到 10 歲後）
>    - ❌ 全場單打 21 分 → ✅ 半場／縮短計分，最終魔王 11 分且教練半場應戰
> 3. 每個節點都有**銅／銀／金**三階，銅牌即解鎖後續。
> 4. 章節間線性解鎖；章節**內部**保留 DAG 分支（正手／反手並行後匯流）。

### 進度節奏表

| 章節 | 節點數 | 預計週次 | 預計練習次數 |
|---|---|---|---|
| 1 氣球村 🎈 | 6 | 第 1～3 週 | ~6 |
| 2 泡棉森林 🌲 | 7 | 第 4～9 週 | ~12 |
| 3 雷霆峽谷 ⚡ | 8 | 第 10～16 週 | ~14 |
| 4 風之階梯 🌀 | 7 | 第 17～21 週 | ~10 |
| 5 王者之巔 👑 | 6 | 第 22～26 週 | ~10 |
| **合計** | **34** | **26 週** | **~52** |

---

### 第 1 章 — 氣球村 Balloon Village 🎈（第 1～3 週）
> 主題：用氣球建立手眼協調與握拍手感。球速極慢、零挫折，目標是「第一次就上手」。

| id | 任務 | 單位 | 🥉/🥈/🥇 | parentIds | EXP/幣 | 獎勵 |
|---|---|---|---|---|---|---|
| `q1_1` | 氣球不落地（徒手） | 下 | 5 / 10 / 15 | — | 60/30 | 🎈 魔法氣球 |
| `q1_2` | 正確握拍手勢通過檢查 | 次 | 3 / 6 / 10 | `q1_1` | 60/30 | 🏸 短柄小拍 |
| `q1_3` | 正手拍氣球 | 下 | 5 / 10 / 15 | `q1_2` | 60/30 | — |
| `q1_4` | 反手拍氣球 | 下 | 3 / 6 / 10 | `q1_2` | 60/30 | — |
| `q1_5` | 移動接氣球（走兩步接到） | 次 | 3 / 6 / 10 | `q1_3`,`q1_4` | 60/30 | — |
| `q1_6` | **【魔王】正反手交替拍氣球** | 下 | 5 / 10 / 15 | `q1_5` | 120/60 | 稱號 **氣球見習生** |

DAG：`q1_3`／`q1_4` 平行解鎖，**兩者皆達銅牌**才開 `q1_5`（分支→匯流）。

---

### 第 2 章 — 泡棉森林 Foam Forest 🌲（第 4～9 週）
> 主題：慢速泡棉球，建立擊球點與過網概念。開始有「打不到」的挫折，故節點切細。

| id | 任務 | 單位 | 🥉/🥈/🥇 | parentIds | EXP/幣 | 獎勵 |
|---|---|---|---|---|---|---|
| `q2_1` | 接住拋來的泡棉球 | 次 | 5 / 8 / 12 | `q1_6` | 80/40 | 🟡 泡棉球 |
| `q2_2` | 徒手揮拍動作（引拍→擊球點） | 次 | 10 / 20 / 30 | `q2_1` | 80/40 | — |
| `q2_3` | 定點正手擊球（教練餵球） | 球 | 5 / 8 / 12 | `q2_2` | 80/40 | — |
| `q2_4` | 定點反手擊球（教練餵球） | 球 | 3 / 6 / 10 | `q2_2` | 80/40 | — |
| `q2_5` | 擊球過網（不限手法） | 球 | 5 / 8 / 12 | `q2_3`,`q2_4` | 80/40 | 🎽 護腕 |
| `q2_6` | 自拋自打連續擊球 | 下 | 2 / 4 / 6 | `q2_5` | 80/40 | — |
| `q2_7` | **【魔王】與教練對拉** | 拍 | 3 / 6 / 10 | `q2_6` | 160/80 | 稱號 **森林小獵人** |

> v2 的 `自拋自打 8 下` → 銅牌降到 **2 下**；`對拉 15 拍` → 銅牌 **3 拍**。
> 這兩項是 v2 最容易讓 7 歲卡死的關卡。

---

### 第 3 章 — 雷霆峽谷 Thunder Canyon ⚡（第 10～16 週）
> 主題：換成正式球拍與羽毛球。**這是整個課程最大的難度斷層**，故節點最多（8 個）、
> 步距最小，確保每 1～2 次練習就有東西點亮。

| id | 任務 | 單位 | 🥉/🥈/🥇 | parentIds | EXP/幣 | 獎勵 |
|---|---|---|---|---|---|---|
| `q3_1` | 換正式拍球：接到教練拋來的羽球 | 次 | 3 / 5 / 8 | `q2_7` | 100/50 | 🏸 正式球拍 ＋ 🪶 羽毛球 |
| `q3_2` | 正手發高球過發球線 | 球 | 3 / 6 / 10 | `q3_1` | 100/50 | — |
| `q3_3` | 反手發短球過網 | 球 | 3 / 6 / 10 | `q3_1` | 100/50 | 🩹 專屬握把布 |
| `q3_4` | 正手擊球過網（教練餵球） | 球 | 5 / 8 / 12 | `q3_1` | 100/50 | — |
| `q3_5` | 頭頂擊高球動作（徒手＋定點，**不跳**） | 次 | 5 / 10 / 15 | `q3_4` | 100/50 | — |
| `q3_6` | 高遠球**過中線**（不要求後場） | 球 | 3 / 5 / 8 | `q3_5` | 100/50 | — |
| `q3_7` | 連續對打（不限球種） | 拍 | 3 / 5 / 8 | `q3_2`,`q3_3`,`q3_4` | 100/50 | — |
| `q3_8` | **【魔王】連續對打高球** | 拍 | 3 / 5 / 8 | `q3_6`,`q3_7` | 200/100 | 稱號 **雷霆學徒** |

DAG：`q3_2`／`q3_3`／`q3_4` 三向平行（發球線與擊球線並進），
`q3_7` 匯流三者，`q3_8` 再匯流 `q3_6` 與 `q3_7`。這是全圖最複雜的分支，可用來驗證 DAG 實作。

> **關鍵降階**：v2 的「高遠球擊中後場 10 球」→ 改為「過中線 3 球（銅）」。
> 7 歲的臂力與揮拍鏈條通常還打不到後場，這是生理限制，不是練習量問題。

---

### 第 4 章 — 風之階梯 Wind Steps 🌀（第 17～21 週）
> 主題：步法與場區移動。此階段孩子已有球感，進度會明顯加快。

| id | 任務 | 單位 | 🥉/🥈/🥇 | parentIds | EXP/幣 | 獎勵 |
|---|---|---|---|---|---|---|
| `q4_1` | 前後兩點移動步法 | 組 | 3 / 5 / 8 | `q3_8` | 120/60 | 👟 疾風球鞋 |
| `q4_2` | 左右兩點移動步法 | 組 | 3 / 5 / 8 | `q3_8` | 120/60 | — |
| `q4_3` | 四點米字步法 | 組 | 2 / 4 / 6 | `q4_1`,`q4_2` | 120/60 | — |
| `q4_4` | 上網挑球 | 球 | 5 / 8 / 12 | `q4_3` | 120/60 | — |
| `q4_5` | 上網放小球（過網即可） | 球 | 3 / 5 / 8 | `q4_4` | 120/60 | 🧣 勇者毛巾 |
| `q4_6` | 後退接高球（**原地，不跳**） | 球 | 3 / 5 / 8 | `q4_3` | 120/60 | — |
| `q4_7` | **【魔王】移動中回球不失誤** | 拍 | 5 / 8 / 12 | `q4_5`,`q4_6` | 240/120 | 稱號 **御風行者** |

> **關鍵降階**：v2 的「後退跳起擊高球」整項移除。
> 跳躍殺球不建議此年齡練習（動作定型風險、落地衝擊），改為原地頭頂／後退接高球。
> 「全場步法＋回球 20 拍」→ 銅牌降到 **5 拍**。

---

### 第 5 章 — 王者之巔 Grand Summit 👑（第 22～26 週）
> 主題：組合技與迷你實戰。**全程使用半場或縮短計分**，避免全場對 7 歲身材過大的體能問題。

| id | 任務 | 單位 | 🥉/🥈/🥇 | parentIds | EXP/幣 | 獎勵 |
|---|---|---|---|---|---|---|
| `q5_1` | 兩拍組合（發球→回球） | 組 | 3 / 5 / 8 | `q4_7` | 150/75 | — |
| `q5_2` | 三拍組合（發球→高球→放網） | 組 | 3 / 5 / 6 | `q5_1` | 150/75 | — |
| `q5_3` | 半場對打不中斷 | 拍 | 5 / 8 / 12 | `q5_2` | 150/75 | — |
| `q5_4` | 半場單打迷你賽 | 分 | 3 / 5 / 7 | `q5_3` | 150/75 | — |
| `q5_5` | 全場單打（縮短計分） | 分 | 5 / 8 / 11 | `q5_4` | 150/75 | — |
| `q5_6` | **【魔王】與教練對戰一局**（教練半場應戰） | 分 | 5 / 8 / 11 | `q5_5` | 300/150 | 稱號 **羽球勇者**<br>⚔️ 勇者之拍<br>🎓 **觸發畢業** |

> **關鍵降階**：v2 的「全場單打 11 分 / 與教練對戰 21 分」→
> 改為半場迷你賽起步，最終魔王 11 分且教練限制在半場應戰。

---

### 裝備一覽（10 件）
| id | 圖示 | 名稱 | 取得 |
|---|---|---|---|
| `eq_balloon` | 🎈 | 魔法氣球 | `q1_1` |
| `eq_short_racket` | 🏸 | 短柄小拍 | `q1_2` |
| `eq_foam_ball` | 🟡 | 泡棉球 | `q2_1` |
| `eq_wristband` | 🎽 | 護腕 | `q2_5` |
| `eq_real_racket` | 🏸 | 正式球拍 | `q3_1` |
| `eq_shuttlecock` | 🪶 | 羽毛球 | `q3_1` |
| `eq_grip` | 🩹 | 專屬握把布 | `q3_3` |
| `eq_shoes` | 👟 | 疾風球鞋 | `q4_1` |
| `eq_towel` | 🧣 | 勇者毛巾 | `q4_5` |
| `eq_champion_racket` | ⚔️ | 勇者之拍 | `q5_6` |

### 稱號一覽（6 個）
`title_newbie` 羽球新手（初始）／ `title_balloon_rookie` 氣球見習生（`q1_6`）／
`title_forest_hunter` 森林小獵人（`q2_7`）／ `title_thunder_apprentice` 雷霆學徒（`q3_8`）／
`title_wind_walker` 御風行者（`q4_7`）／ `title_hero` 羽球勇者（`q5_6`）

---

## 6. 核心流程

### 6.1 練習簽到（每次練習的起點，v3 新增）

```
[家長手機] 抵達球場 → 按【開始今天的練習】
    → 建立 PracticeSession
    → 立即發放 ATTENDANCE_EXP(25) / ATTENDANCE_COINS(10)
    → player.sessionCount += 1
    → 檢查 ATTENDANCE_MILESTONES，命中則追加獎勵
    → 寫入 ActivityLog
                    │ Realtime
                    ▼
[小孩 iPad] 「第 12 次練習開始！+25 EXP +10 金幣」
            EXP 條增長動畫（→ 可能直接觸發升級橫幅）
```
**這保證了每次練習畫面一定有反應**，即使當天一個節點都沒過。

### 6.2 任務完成流程（雙向＋三階）

```
[小孩 iPad]                         [家長手機]
點節點 → 看任務說明
    │
    ├─ 點「＋1」記錄次數 ──────────→ Realtime：進度環即時更新
    │  currentCount++，越過銅/銀/金門檻時
    │  節點外環變色（灰→銅→銀→金）
    │
    └─ 點【我做到了！】
       status → submitted
       帶上本次 currentCount
                                        │
                                        ▼
                              待審清單出現紅點
                                        │
                        ┌───────────────┴───────────────┐
                  【核可通過】                    【再練習一次】
                        │                              │
        bestCount = max(bestCount, currentCount)  status → unlocked
        依 bestCount 計算新達成的階級              currentCount 歸零
        發放「尚未發放」的階級獎勵                  留下鼓勵評語（非懲罰）
          （tiersAwarded 去重）                    bestCount 保留不變
        若首次達銅：                                     │
          status → completed                             ▼
          發放稱號／裝備                   [iPad] 顯示教練的鼓勵話語
          重算 DAG 解鎖後續節點                    （無任何扣分）
                        │
                        ▼
[小孩 iPad] 慶祝動畫佇列依序播放：
  ① 階級達成（🥉/🥈/🥇 獎牌翻轉）
  ② QUEST COMPLETED（彩帶 + tada.mp3）※ 僅首次達銅
  ③ 獲得裝備 / 稱號
  ④ LEVEL UP 橫幅（可連續多級）
  ⑤ 新節點解鎖（地圖路徑點亮動畫）
```

**重要**
- 家長可**直接核可**不等小孩回報（現場快速操作），`unlocked → completed` 是合法單步轉移。
- 節點達銅牌後**仍可再挑戰**銀／金，`completed` 狀態下節點依然可點。
- `tiersAwarded` 確保同一階級的獎勵永不重複發放。
- **核可的所有寫入必須在同一個 `runTransaction` 內完成**
  （`player` 的等級／金幣／裝備／`lastEvent` ＋ `questProgress` 文件），
  避免兩台裝置同時操作造成狀態分裂，也讓 iPad 只收到 2 次變更通知。

> **額度注意（§2.2 ③）**：「＋1」按鈕若每點一次就寫 Firestore，
> 一次練習點 50 下就是 50 次寫入 ＋ 100 次讀取。額度仍然夠，但沒必要。
> **實作方式**：`currentCount` 先存在本地 state（畫面立即有反應），
> 以 **1.5 秒 debounce** 或「離開 Quest Detail Sheet 時」才寫入一次 Firestore。
> 小孩自己的計數不需要家長即時看到 —— 真正需要即時的是**核可**那一刻。

### 6.3 解鎖判定（DAG）

```typescript
/** 節點可解鎖 ⟺ 所有 parentIds 皆已達成銅牌（status === 'completed'） */
function computeUnlocked(
  nodes: QuestNode[],
  progress: Record<string, QuestProgress>,
): string[] {
  return nodes
    .filter((n) => progress[n.id]?.status === 'locked')
    .filter((n) => n.parentIds.every((p) => progress[p]?.status === 'completed'))
    .map((n) => n.id);
}
```
每次核可後**重算全圖**，避免增量更新造成狀態漂移。

### 6.4 階級結算

```typescript
const TIER_ORDER: TierLevel[] = ['bronze', 'silver', 'gold'];

/** 依歷史最佳成績，算出尚未發獎的階級與應發數值 */
function settleTiers(node: QuestNode, prog: QuestProgress) {
  const reached = TIER_ORDER.filter((t) => prog.bestCount >= node.tiers[t]);
  const pending = reached.filter((t) => !prog.tiersAwarded.includes(t));
  const exp = pending.reduce((s, t) => s + Math.round(node.rewardExp * TIER_RATIO[t]), 0);
  const coins = pending.reduce((s, t) => s + Math.round(node.rewardCoins * TIER_RATIO[t]), 0);
  return { pending, exp, coins, isFirstBronze: pending.includes('bronze') };
}
```

### 6.5 升級判定

```typescript
/** 支援單次獎勵跨多級 */
function applyExp(player: Player, delta: number): { player: Player; levelsGained: number } {
  let { level, currentExp } = player;
  let gained = 0;
  currentExp += delta;
  while (level < MAX_LEVEL && currentExp >= LEVEL_CURVE[level - 1]) {
    currentExp -= LEVEL_CURVE[level - 1];
    level += 1;
    gained += 1;
  }
  if (level >= MAX_LEVEL) currentExp = 0; // 滿等後 EXP 條顯示為 MAX
  return {
    player: { ...player, level, currentExp, totalExp: player.totalExp + delta },
    levelsGained: gained,
  };
}
```

### 6.6 獎勵兌換流程

```
[小孩] 商店點「兌換」
   → 檢查 coins >= cost、isActive、本週未超過 stockPerWeek
   → 確認對話框（防誤觸）：「要用 100 金幣換珍珠奶茶嗎？」
   → 扣款、建立 RedemptionOrder(status: 'pending')、金幣倒數動畫
        │
[家長] 訂單清單出現新訂單
   → 【已完成 / Fulfill】 → 'fulfilled'
   → 或【取消並退款】 → 'cancelled'，coins 回補
        │
[小孩] 「你的珍珠奶茶送到囉！」通知動畫
```

### 6.7 畢業流程

```
條件達成（q5_6 銅牌 或 滿 26 週）
   → [家長] Admin 出現【舉行畢業典禮】按鈕（需二次確認）
   → [小孩] 全螢幕典禮動畫 → 授予羽球勇者 + 勇者之拍
   → 產生畢業證書頁（可截圖／列印）
   → player.graduatedAt 寫入；地圖進入「回顧模式」（全金色，可瀏覽不可再挑戰）
```

---

## 7. Core Feature Requirements

### 7.1 Player View（小孩視角，iPad 優先）

**Hero Profile Header**
等級徽章、頭像、動畫 EXP 條（Framer Motion `layout` 平滑增長）、金幣計數器（數字滾動＋彈跳）、
當前稱號徽章、裝備列（點擊展開抽屜）、**出席次數 `12 / 52`** 與**畢業倒數週次**。

**RPG Quest Map（主畫面）**
- 垂直捲動的 SVG 曲線路徑串連 34 個節點，由下往上（第 1 章在下、王者之巔在頂），對應「登頂」隱喻。
- 5 個區域各有漸層背景與裝飾，捲動時背景過渡。
- DAG 分支處路徑分岔後匯流，以 SVG `path` 繪製（第 3 章有三向分支）。
- **節點狀態視覺**：
  | 狀態 | 表現 |
  |---|---|
  | `locked` | 灰階、🔒 padlock、不可點 |
  | `unlocked` | 彩色、持續 pulse 光暈、可點；外環進度環顯示 `currentCount` 對三階門檻的位置（灰→銅→銀→金分段著色） |
  | `submitted` | ⏳ 沙漏、慢速呼吸動畫、「等教練確認中」 |
  | `completed` | 依最高階級顯示 🥉/🥈/🥇 獎牌；路徑點亮。未滿金牌者外環留一圈缺口，暗示「還可以再來」 |
- 魔王節點尺寸放大 1.5 倍，加皇冠／閃電裝飾。

**Quest Detail Sheet（點節點後的底部彈出面板）**
任務說明（大字、口語）、**三階門檻條**（🥉5 🥈10 🥇15，已達成的打勾）、
目前次數與歷史最佳、【＋1】大按鈕、【我做到了！】按鈕、獎勵預覽。

**Celebration Modal（由 `player.lastEvent` 的 snapshot 變更觸發）**
背景模糊凍結 → canvas-confetti → tada.mp3 → 獎勵條列。
依 `lastEvent.items` 的順序**逐一**播放（**動畫要排隊，不可同時疊放**）；
以 `lastEvent.id` 去重，重新整理或斷線重連不會重播。

**Reward Shop（分頁）**
商品卡片網格、金幣餘額置頂、買不起時卡片變灰但仍可見（維持目標感）、
「畢業大禮」獨立置底並顯示儲蓄進度條、兌換確認對話框。

**Adventure Log（分頁）**
`ActivityLog` 時間軸（含出席、階級、升級、教練評語）。這是家長與小孩一起回顧成長的地方。

**Certificate（畢業後）**
畢業證書頁，可截圖／列印。

### 7.2 Coach/Admin View（家長視角，手機優先）

- **今日練習**（置頂）：【開始今天的練習】簽到鈕、本次已發放的 EXP／幣小計、今日一句話輸入。
- **待審清單**：所有 `submitted` 節點，紅點提醒；顯示回報次數與將達成的階級；
  【核可通過】【再練習一次】兩個大按鈕，附一句話評語輸入框。
- **當前可挑戰任務**：所有 `unlocked` 與未滿金牌的 `completed` 節點，
  支援現場直接核可、手動輸入次數。
- **Custom Reward Dispatcher**：快捷鈕（+10／+30／+50 EXP、+10／+20 幣）＋自訂數值＋自訂訊息。
- **Order Fulfillment**：`pending` 訂單清單，【已完成】／【取消退款】。
- **商店管理**：商品目錄寫死在 `src/data/rewards.ts`（§10.1，讀取成本 0），
  故此處只做**臨時上下架**與**臨時改價**，覆寫值存在 `players/{id}.shopOverrides`；
  永久調整請改 code 重新部署。
- **課程進度**：第 N / 26 週、出席 N / 52 次、各章完成度、**是否落後於 §5 節奏表的提醒**。
- **實戰筆記**（v5.1 新增，支援 Step 8 與 §12.7 的 `NOTES.md`）：
  - **教學筆記**：寫在最近一次練習上（隔天補寫也可以），存進 `sessions/{id}.teachNote`，小孩看不到。
  - **卡關提醒**：未拿銅牌的節點，已練次數 ≥ `max(3, estimatedSessions × 2)` 即列出；
    若 `bestCount` > 0 且低於銅牌門檻，建議直接把門檻調成 `bestCount`（§12.4-④）。分頁列有黃色徽章。
  - **各章實際 vs 規劃**：規劃次數 ＝ `planWeeks` 週數 × 每週 2 次。
  - **匯出**：【📋 複製】／【📤 下載／分享】產生 `NOTES.md` 格式的 Markdown
    （每次練習拿到的獎牌＋教學筆記、各章耗時、各關解鎖／🥉🥈🥇 在第幾次練習、送審次數、卡關點、偏易／偏難提示）。
  - 額度：畫面上的統計只用已監聽的進度文件（0 額外讀取）；匯出時分頁讀取全部練習紀錄
    （每頁 `limit(20)`，半年約 52 次讀取，只在按下按鈕時發生）。
  - 舊資料沒有 `tierSessions`／`unlockedAtSession`：銅牌依 `completedAt` 日期對照練習紀錄推算，
    解鎖依前置節點的銅牌推算；推不出來的顯示「—」。
- **【重新結算】按鈕**：手動觸發 `reconcile()`（§12.5）。
  改完關卡表重新部署後按一次，補發所有因門檻調整而應得的獎勵。
- **危險操作區**（需二次確認）：舉行畢業典禮、重置進度、手動調整等級／金幣。

---

## 8. 給 7 歲使用者的 UX 硬性規則

### 8.1 零懲罰原則
**沒有扣分、沒有倒數計時、沒有連續天數中斷的紅字、沒有排行榜。**
- 出席獎勵只用**累計里程碑**，不用 streak —— streak 會斷，斷了就是懲罰。
- 「再練習一次」文案必須是鼓勵式（「再試一次就會更棒！」），絕不出現「失敗」「錯誤」字樣。
- `bestCount` 只增不減；重來不會退步。
- `attempts` 僅供家長參考，**不在小孩畫面顯示**。

### 8.2 Admin 入口必須保護
小孩會亂點。`#/admin` 路由需 **4 位數 PIN 閘門**（`VITE_ADMIN_PIN`，通過後存 `sessionStorage`）。
Player 畫面**只允許一個不顯眼的入口**（Header 靜音鈕旁的淡灰色 🔒），點了仍要輸入 PIN；
PIN 畫面提供「回到地圖」按鈕，誤入的小孩可以自己離開。
（v5.1 修訂：原規定「不得有任何連結」，但從主畫面開啟的 PWA 沒有網址列，家長無法進入 Admin。）

> **誠實說明**：因為 §2.2 ② 禁用 Cloud Functions，PIN 完全在前端驗證，
> 打開 devtools 就能繞過。它的目的是**防止 7 歲小孩誤入**，不是防駭客。
> 真正的存取控制在 §10.3 的 Firestore 規則（鎖定單一 Auth UID）。
> 此限制必須寫進 README。

### 8.3 觸控與可讀性
- 最小點擊區 **64×64 px**；主要按鈕高度 ≥ 72px。
- 正文最小 18px，任務標題 ≥ 28px。
- 高對比配色，通過 WCAG AA。
- 兌換、提交等不可逆動作一律**二次確認**。

### 8.4 音訊
- Howler 需在**第一次使用者互動**時呼叫 `Howler.ctx.resume()` 解鎖 iOS autoplay。
- 預設音量 **0.4**；Header 常駐靜音切換鈕，狀態存 `localStorage`。
- 音效清單（v5.1：由 `scripts/gen-assets.mjs` 合成 `.wav`，`npm run gen:assets` 重新產生）：
  `tada`（完成：小鼓滾奏＋銅管和弦）、`levelup`（升級：銅管琶音）、`coin`（金幣）、
  `tap`（按鈕）、`pop`（＋1，播放速度 0.85→1.45 隨「距下一面獎牌的進度」升高音調）、
  `unlock`（解鎖／送出）、`medal`（階級達成：鐘琴琶音）、`reveal`（新區域／發現新小路：和弦漸強＋鐘聲）。

### 8.5 其他
- 支援 `prefers-reduced-motion`：關閉彩帶與大幅位移，保留顏色變化。
- 離線時顯示友善提示（「跟教練的連線斷掉了，等一下喔」）。
  已開啟 Firestore 離線持久化（§2.2 ③-6），操作仍可進行，連線恢復後自動同步。
- PWA：`display: standalone`、鎖定直向、提供 iPad 用 icon 與啟動畫面。
  **`manifest` 的 `start_url` / `scope` 必須含 GitHub Pages 的 base path 與 hash**
  （例：`/badmintonHero/#/`），否則從主畫面開啟會白畫面。
- PWA 新版部署後必須**自動更新**（v5.1）：iPad 從主畫面開啟的 App 常常一開好幾天，不會自己換版。

---

## 9. 專案結構

> v5.1：以下已依實際檔案更新（★ 為規格外新增）。

```
badmintonHero/
├─ .github/workflows/
│  └─ deploy.yml         ← lint → test → validate → build → 部署到 GitHub Pages
├─ scripts/
│  ├─ validate-data.ts   課程包驗證 ＋ 52 次練習模擬（npm run validate）
│  └─ gen-assets.mjs     佔位音效與 PWA icon 產生器
├─ tests/                vitest：engine, reconcile, cache, data, guardrails, session-budget
├─ public/
│  ├─ sounds/            tada, levelup, coin, tap, pop, unlock, medal, reveal (.wav 合成)
│  ├─ icons/             PWA icons
│  └─ 404.html           ← 保險：轉址回 index.html（HashRouter 下通常用不到）
├─ src/
│  ├─ types/
│  │  └─ index.ts        §3 全部 interface
│  ├─ data/
│  │  ├─ curricula/      ← 課程包（進版控，讀取成本 0），可複製給下一個小孩
│  │  │  └─ badminton-7yo-v1/
│  │  │     ├─ index.ts        匯出整包 + QUEST_DATA_VERSION
│  │  │     ├─ chapters.ts
│  │  │     ├─ quests.ts       34 個 QuestNode（含 tiers / order）
│  │  │     ├─ equipments.ts   10 件
│  │  │     ├─ titles.ts       6 個
│  │  │     ├─ rewards.ts      8 件商品
│  │  │     ├─ levelCurve.ts   LEVEL_CURVE / MAX_LEVEL / TIER_RATIO
│  │  │     ├─ attendance.ts   ATTENDANCE_EXP / COINS / MILESTONES
│  │  │     ├─ CHANGELOG.md    ★ 每次改關卡表的紀錄，見 §12.5
│  │  │     └─ NOTES.md        ★ 真實教學心得回寫，見 §12.7
│  │  ├─ avatars.ts      ★ 6 個內建頭像
│  │  └─ index.ts        依 player.curriculumId 取得課程包
│  ├─ store/             ← 唯一允許 import firebase/firestore 的目錄（ESLint 強制）
│  │  ├─ types.ts        GameStore 介面（UI 只依賴這個）
│  │  ├─ localAdapter.ts localStorage 實作（Local Mode，開發期用）
│  │  ├─ firebaseAdapter.ts
│  │  ├─ cache.ts        LocalStorage TTL 快取（1 小時），供 getDocs 類查詢使用
│  │  └─ index.ts        依 VITE_STORE_MODE 選擇 adapter
│  ├─ engine/            ← 純函式遊戲邏輯，可單元測試
│  │  ├─ unlock.ts       computeUnlocked (DAG)
│  │  ├─ tiers.ts        settleTiers
│  │  ├─ exp.ts          applyExp / 升級判定
│  │  ├─ attendance.ts   簽到與里程碑結算
│  │  ├─ economy.ts      兌換檢查、stockPerWeek
│  │  ├─ graduation.ts   畢業條件判定
│  │  ├─ reconcile.ts    ★ 關卡表改版後的進度校正，見 §12.5
│  │  ├─ actions.ts      所有會改狀態的動作（簽到／送審／核可／再練／獎勵／兌換／出貨／畢業／改名…）
│  │  ├─ settle.ts, grant.ts   核可與 reconcile 共用的結算／發獎
│  │  └─ stats.ts, validate.ts, util.ts   統計（含章節揭露）、課程包驗證
│  ├─ hooks/
│  │  ├─ useGameState.ts          讀取 GameProvider 的 context
│  │  ├─ useGameActions.ts, useHistory.ts
│  │  ├─ useSound.ts
│  │  └─ useCelebrationQueue.ts   依 player.lastEvent 排隊播放
│  ├─ providers/
│  │  └─ GameProvider.tsx         ★ 全app 唯二的 onSnapshot 在此，deps 必須為 []
│  ├─ components/
│  │  ├─ player/         HeroHeader, QuestMap, QuestNodeItem, TierBar,
│  │  │                  QuestDetailSheet, TreasureChest★, ProfileEditor★, RewardShop,
│  │  │                  AdventureLog, CelebrationModal, Certificate, mapLayout
│  │  ├─ admin/          PinGate, SessionCheckIn, PendingList, ActiveQuestList,
│  │  │                  BonusDispatcher, OrderList, ShopManager,
│  │  │                  CourseProgress, DangerZone, QuestReviewRow
│  │  ├─ LoginGate.tsx, DevCounter.tsx
│  │  └─ ui/             Button, Card, Modal, ProgressRing, CoinCounter, MedalBadge, Toast
│  ├─ pages/             PlayerPage.tsx, AdminPage.tsx, CertificatePage.tsx
│  ├─ lib/
│  │  ├─ firebase.ts             initializeApp / getFirestore / persistentLocalCache
│  │  ├─ firestore-counter.ts    ★ 開發期讀寫計數器（§2.2 ④）
│  │  ├─ pwa.ts                  ★ PWA 自動更新
│  │  └─ sound.ts, format.ts, seenNew.ts
│  ├─ App.tsx            HashRouter 在此
│  └─ main.tsx
├─ firestore.rules       ← §10.3，用 firebase CLI 部署（免費）
├─ firestore.indexes.json
├─ tailwind.config.ts
├─ vite.config.ts        base: '/badmintonHero/'
├─ .env.example          VITE_FIREBASE_* / VITE_ADMIN_PIN / VITE_STORE_MODE / VITE_PLAYER_ID
└─ README.md             必須記載：$0 限制、無伺服器驗證、PIN 僅防誤觸
```

> **ESLint 硬性設定**（§2.2 ④）
> ```jsonc
> {
>   "rules": {
>     "react-hooks/exhaustive-deps": "error",
>     "no-restricted-imports": ["error", {
>       "patterns": [{
>         "group": ["firebase/firestore"],
>         "message": "Firestore 只能在 src/store/ 內使用（見 spec §2.2 ④）"
>       }]
>     }]
>   }
> }
> ```
> 於 `src/store/**` 以 overrides 解除 `no-restricted-imports`。

---

## 10. Firestore 資料模型與安全規則

### 10.1 文件結構（依額度而設計）

```
players/{playerId}                          ← 【監聽 1】Player + lastEvent
  ├─ state/questProgress                    ← 【監聽 2】34 節點進度合併成一份
  ├─ sessions/{sessionId}                   ← getDocs + 快取，不監聽
  ├─ orders/{orderId}                       ← getDocs + 快取，不監聽
  └─ logs/{logId}                           ← getDocs limit(20) + 快取，不監聽
```

| 路徑 | 型別 | 存取方式 | 預估文件數（6 個月） |
|---|---|---|---|
| `players/{id}` | `Player`（含 `lastEvent`） | **`onSnapshot`** | 1 |
| `players/{id}/state/questProgress` | `QuestProgressDoc` | **`onSnapshot`** | 1 |
| `players/{id}/sessions/{sid}` | `PracticeSession` | `getDocs` ＋ 快取 1h | ~52 |
| `players/{id}/orders/{oid}` | `RedemptionOrder` | `getDocs` ＋ 快取 1h；`pending` 另以 `where` 查 | ~40 |
| `players/{id}/logs/{lid}` | `ActivityLog` | `getDocs` `orderBy(createdAt,desc).limit(20)` ＋ 快取 1h | ~400 |

**不進 Firestore 的東西**（全部寫死在 `src/data/*`，讀取成本 0）：
章節、34 個節點定義、裝備、稱號、等級曲線、出席常數、**商店商品目錄**。

> 為什麼商店目錄也寫死？它半年只會改幾次，放 Firestore 每次開店就要付讀取成本。
> 改價 = 改 code + 重新部署（GitHub Actions 兩分鐘）。
> 代價是 §7.2 的「商店管理」改為**唯讀展示 + 修改指引**，
> 或以 `isActive` 覆寫存在 `players/{id}` 的一個小欄位（`shopOverrides`）來做臨時上下架。

### 10.2 為什麼 `lastEvent` 放在 player 文件裡

慶祝動畫需要「家長按核可 → iPad 立刻播放」。做法是家長端算完結果後，
**在同一次 `runTransaction` 內**把 `player`（等級／金幣／裝備）與 `lastEvent`（動畫佇列）一起寫入。
iPad 的既有監聽收到變更即播放 —— **不需要額外的 collection、額外的監聽、額外的讀取**。

`lastEvent.id` 用於去重：`useCelebrationQueue` 記住最後播過的 id，
重新整理或重連後不會重播。

### 10.3 安全規則（`firestore.rules`）

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 單一家庭共用帳號的 UID，部署時填入實際值
    function isFamily() {
      return request.auth != null
          && request.auth.uid == 'REPLACE_WITH_FAMILY_UID';
    }

    match /players/{playerId} {
      allow read, write: if isFamily();
      match /{document=**} {
        allow read, write: if isFamily();
      }
    }

    // 其餘一律拒絕
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**說明**
- Firebase 的 `apiKey` 本來就是公開值，安全性**完全依賴上面的規則**，不是靠藏 key。
  GitHub Pages 是公開站台，這點必須接受。
- 登入採 **Email/Password 單一家庭帳號**（非 Anonymous —— 匿名登入每台裝置會拿到不同 UID，
  兩台裝置就讀不到同一份資料）。
- 以 `browserLocalPersistence` 持久化登入，兩台裝置各登入一次即可，之後免重複輸入。
- 因為禁用 Cloud Functions（§2.2 ②），**沒有伺服器端驗證**：
  登入後的任何裝置都能改寫全部資料。單一家庭自用可接受，但必須在 README 寫明。

### 10.4 索引
`logs` 需要 `createdAt desc` 的單欄位索引（Firestore 自動建立）。
`orders` 若用 `where('status','==','pending').orderBy('requestedAt')` 需複合索引，
寫入 `firestore.indexes.json` 一併部署。
**訂單量極少（半年約 40 筆），也可直接抓全部在前端過濾，省掉索引。**

---

## 11. Development Milestones（請逐步執行）

> **v5.1 狀態（2026-09-26）**：Step 0～7 ✅ 已完成並上線；Step 8 🔄 進行中。
> 自動化驗收（測試、validate、ESLint、grep 護欄、讀取預算）皆由 CI 把關；
> 需要真實裝置的驗收項目以「實際在用」為準，未逐條留下紀錄。

### Step 0 — 決策定案與資料建模 ⏱️ ~1.5h　✅
產出 `src/types/index.ts` 與 `src/data/*`
（5 章節、**34 節點含三階門檻**、10 裝備、6 稱號、8 商品、等級曲線、出席常數）。

**驗收**
- `npm run build` 型別檢查通過
- 驗證腳本輸出：DAG 無環、無孤兒節點、所有 `rewardEquipmentIds`／`rewardTitleId` 對得到定義
- 每個節點 `tiers.bronze < silver < gold`
- 數值總和與 §4.4 表格一致（節點全金牌 3,970 EXP / 1,985 幣）
- 模擬 52 次練習的收入曲線，確認滿等落在第 5 章
- **（§12）`order` 在同一章內唯一、且以 10 為間隔留出插入空間**
- **（§12）沒有任何 `parentIds` 指向 `isRetired` 的節點**
- **（§12）reconcile 回歸測試**：餵入「舊進度 ＋ 新關卡表」，
  斷言 `bestCount`／`tiersAwarded`／`status`／`totalExp`／`coins` **無任何一項下降**

### Step 1 — Core Setup & Store 抽象 ⏱️ ~2.5h　✅
Vite ＋ TS ＋ Tailwind ＋ **`HashRouter`** ＋ `base: '/badmintonHero/'`；
ESLint 兩條硬性規則（§9）；`src/engine/*` 純函式
（unlock／tiers／exp／attendance／economy／graduation）＋單元測試；
`src/store/localAdapter.ts` ＋ `cache.ts`。**本步驟完全不碰 Firebase。**

**驗收**：engine 測試全綠，特別是——
- 同一階級的獎勵不會重複發放（`tiersAwarded` 去重）
- `bestCount` 只增不減
- 單次獎勵可跨多級升級
- 第三章三向分支的解鎖判定正確
- 兌換時金幣不會被扣成負數
- `cache.ts` 的 TTL 行為正確（未過期不重抓、寫入後就地更新）
- ESLint 能擋下「在元件內 import `firebase/firestore`」

### Step 2 — Player Dashboard & Interactive Map ⏱️ ~5h　✅（另加卡通風格、章節漸進揭露、寶箱、個人資料編輯，見 §0.3）
HeroHeader（含出席／倒數）、SVG 曲線地圖（5 區域、34 節點、DAG 分支）、
四種節點狀態＋三階獎牌環、Quest Detail Sheet、裝備抽屜、獎勵商店、冒險日誌。

**驗收**：iPad 直向與手機上都無橫向捲動；所有觸控目標 ≥ 64px；34 節點捲動順暢。

### Step 3 — Admin Control Panel ⏱️ ~3.5h　✅
PIN 閘門、練習簽到、待審清單、快速核可、Bonus Dispatcher、訂單出貨、
商店管理、課程進度儀表、危險操作區。

**驗收**：同裝置兩個分頁，Admin 簽到／核可後 Player 分頁狀態更新。

### Step 4 — Firebase 接線與跨裝置即時同步 ⏱️ ~3.5h　✅（第 2～4 點由測試自動驗證；第 5 點請不定期看 Console Usage）
建立 Firebase 專案（**Spark 免費方案，不綁信用卡**）、Email/Password 家庭帳號、
`firestore.rules` 部署、`lib/firebase.ts`（含 `persistentLocalCache`）、
`lib/firestore-counter.ts`、`firebaseAdapter`、`GameProvider`（**唯二的 `onSnapshot`**）、
核可流程改用 `runTransaction`（player ＋ questProgress ＋ lastEvent 一次寫入）。

**驗收（每一條都要實測）**
1. **手機按核可 → iPad 在 1 秒內反應**。這是全案最關鍵的驗收點。
2. **讀寫計數器**：完整跑一次模擬練習（簽到 ＋ 5 次核可 ＋ 2 次獎勵 ＋ 1 次兌換），
   單一裝置讀取次數 **< 100**。超過代表監聽或快取寫錯了。
3. 全專案 grep：`onSnapshot` 只出現在 `GameProvider.tsx`，且出現 **2 次**。
4. 全專案 grep：`firebase/firestore` 的 import 只出現在 `src/store/` 與 `src/lib/firebase.ts`。
5. 在 Firebase Console 的 Usage 頁確認：一天開發下來讀取 **< 2,000**（額度 50,000）。
6. 開飛航模式操作仍可用，恢復連線後兩台裝置狀態一致。
7. 未登入的裝置讀取 Firestore 會被規則拒絕。

> **開發期一律用 `VITE_STORE_MODE=local`**，只有在驗收這一步才切到 Firebase。
> 帶著 hot-reload 反覆重掛監聽是最容易燒額度的行為。

### Step 5 — GitHub Pages 部署與 PWA ⏱️ ~1.5h　✅（另加 PWA 自動更新）
`.github/workflows/deploy.yml`（build → 上傳 artifact → 部署 Pages）、
repo Settings 啟用 Pages（source: GitHub Actions）、
Firebase 環境變數存成 **repo secrets** 並於 build 時注入、
PWA manifest（`start_url` / `scope` 含 base path 與 hash）、icon、iOS 加到主畫面測試。

**驗收**
- 線上網址可開，**重新整理 `#/admin` 不會 404**
- assets 全部載入（base path 正確，無 404 的 js/css）
- iPad 與手機皆能從主畫面全螢幕開啟並正常運作
- 兩台真實裝置連線同一份 Firestore，即時同步成立

> 刻意排在特效之前 —— 先確保「在真實裝置上能用」，再談好不好看。
> GitHub Pages 的路徑問題只會在真正部署後才現形，不能等到最後才做。

### Step 6 — Gamification FX（Audio & Visual Juice）⏱️ ~3h　✅（音效為合成 `.wav`，v5.1 重做）
canvas-confetti、獎牌翻轉、升級橫幅、金幣跳動、EXP 條動畫、音效與靜音鈕、
慶祝動畫排隊（`useCelebrationQueue`）、`prefers-reduced-motion`。

**驗收**：一次核可同時觸發「銀牌＋首次完成＋獲得裝備＋連升兩級＋解鎖新節點」時，
五段動畫依序播放不重疊。

### Step 7 — 畢業機制與證書 ⏱️ ~1.5h　✅（程式與測試完成；真正的畢業典禮要等課程結束）
畢業條件判定、典禮動畫、證書頁（統計數據、獎牌統計、教練寄語）、地圖回顧模式。

### Step 8 — 真人測試與數值微調（進行式）　🔄 進行中（尚未改過關卡表；Admin【實戰筆記】已可記錄教學筆記、提醒卡關、匯出 `NOTES.md`）
讓小孩實際用 2～3 次練習後，回頭調整 §4 數值與 §5 門檻。
**特別注意第 3 章**：若前兩次練習發現 `q3_1`～`q3_4` 的銅牌門檻仍太高，立即下調，
不要等到小孩卡住失去興趣。

---

## 12. 關卡表是活的 —— 中期擴充與課程複用

### 12.1 設計立場（先講清楚，這不是例外處理）

**本專案的關卡表預期會在課程進行中被修改，這是常態。**

作者沒有正式的羽球教學經驗。真實的教學節奏只有在陪孩子練過幾次之後才會浮現 ——
「這一關太難卡了一個月」「這個動作其實要拆成三步教」「第 2 章應該有 10 關而不是 7 關」。

因此：

- §5 的 34 個節點是**初版假設**，不是定案。
- 系統必須讓「中期加關卡、改門檻、拆節點」成為**十分鐘就能完成、且零風險**的動作。
- 這份課程包未來要能**原封不動套用到下一個小孩**身上。

> **給實作者的指示**：請把本節當作結構性需求，而不是異常處理。
> 若為了省事而把關卡資料寫死、讓 id 隱含順序、讓進度與定義耦合，
> 第一次修改關卡表就會付出重寫的代價。

---

### 12.2 三條不變式（任何改動都不得違反）

| # | 不變式 | 理由 |
|---|---|---|
| 1 | `bestCount` **只增不減** | 歷史最佳成績是孩子的成就，任何改版都不能讓它退步 |
| 2 | `tiersAwarded` **只增不減** | 已頒發的獎牌永遠有效，即使門檻事後被調高 |
| 3 | `status` **單調前進**（`locked → unlocked → completed`，永不回退） | 地圖上亮起來的節點不會再變灰 |

**衍生鐵則：`player.totalExp` / `coins` / `unlockedEquipmentIds` / `unlockedTitleIds`
在任何改版情境下都只會增加，永不回收。**

> 這是 §8.1 零懲罰原則在「改版」這個維度上的延伸。
> 對 7 歲孩子而言，**地圖本身就是她對「我走了多遠」的認知** ——
> 6 個金圈變回灰圈，她不會理解「可是 EXP 還在」，她只會知道東西不見了。
> `reconcile()` 的單元測試必須把這三條寫成斷言。

---

### 12.3 id 與 order：兩個必須脫鉤的東西

**規則 1 — id 永不重用、永不重排。**
不要因為要在 `q2_3` 與 `q2_4` 之間插入節點，就把後面全部改號。
那會讓 `q2_4` 這個 id 突然代表另一個任務，而孩子的 `bestCount`／`tiersAwarded`
還掛在舊語意上 —— 這是**唯一會真正損毀資料**的改法。

插入節點的命名慣例：
- 插在既有節點之間 → 加字母後綴：`q2_3b`、`q2_3c`
- 加在章節尾端 → 接續編號：`q2_8`、`q2_9`、`q2_10`
- **已使用過的 id 即使節點退役也不得再指派給別的任務**

**規則 2 — 顯示順序由 `order` 決定，不由 id 決定。**
初版各章 `order` 為 `10, 20, 30…`，**刻意留出 9 個插入空位**。
在 `q2_3`(30) 與 `q2_4`(40) 之間插入 → 新節點 `order: 35`。id 完全不用動。

```typescript
// 地圖排序：先章節，再 order；id 永遠不參與排序
const visible = nodes
  .filter((n) => !n.isRetired)
  .sort((a, b) => a.chapterId - b.chapterId || a.order - b.order);
```

**規則 3 — 語意變更必須換新 id。**
若同一個節點從「高遠球過中線 3 球」改成「高遠球過網 3 球」，
`bestCount` 的單位語意已經不同，不可沿用。
正確做法：舊節點 `isRetired: true`，新增一個新 id 的節點。
同理，**改 `unit` 一律視為語意變更**。

---

### 12.4 五種改動的標準做法

#### ① 追加支線（最常用，零風險）★ 推薦
**情境**：「第 2 章我發現該有 10 關而不是 7 關，但女兒已經做到第 6 關了。」

**做法**：新節點的 `parentIds` 指向**已完成**的節點，且**不當任何現有節點的前置**。

```
現況（孩子正在打 q2_7）
q2_1 ✅ → q2_2 ✅ → q2_3 ✅ ┐
                    q2_4 ✅ ┴→ q2_5 ✅ → q2_6 ✅ → q2_7 🔵 進行中

加 3 個新節點（order 35 / 55 / 65）
q2_1 ✅ → q2_2 ✅ → q2_3 ✅ ┐
                    q2_4 ✅ ┴→ q2_5 ✅ → q2_6 ✅ → q2_7 🔵
                       │
                       ├→ q2_3b 🆕 立刻可挑戰
                       ├→ q2_5b 🆕 立刻可挑戰
                       └→ q2_6b 🆕 立刻可挑戰
```

**結果**：三個新節點馬上是 `unlocked`；`q2_7` 完全不受影響，照常可以打完進第 3 章；
已完成的 6 個一個都沒動。**零回退。**

> **這就是當初堅持用 DAG 而非線性陣列的實際回報：中期插節點是免費的。**

⚠️ **不要**把新節點設成 `q2_7` 的前置。兩個原因：
(a) `computeUnlocked` 只升不降，`q2_7` 已解鎖就不會被鎖回去，你的意圖根本不會生效；
(b) 就算生效了，那才是真正的倒退。

#### ② 細化既有節點
**情境**：「`q3_6` 高遠球太難，應該拆成三步教。」

**做法**：保留 `q3_6` 不動（孩子可能已在挑戰中），另外新增 `q3_6a`／`q3_6b`
作為**更簡單的前導支線**，掛在 `q3_5` 之後、`order` 排在 `q3_6` 前面。
孩子可以選擇先去打簡單的，也可以繼續硬闖 `q3_6`。

**不要**把 `q3_6` 的 `parentIds` 改成指向新的 `q3_6a` —— 那會在孩子已解鎖後製造矛盾狀態。

#### ③ 退役節點（取代「刪除」）
**情境**：「這一關教錯了／根本沒必要。」

**絕對不要從 `quests.ts` 刪掉節點。** 子節點的 `parentIds` 還指著它，會**永遠解不開**。

**做法**：
1. 設 `isRetired: true`（地圖隱藏，但進度資料與已得獎勵完整保留）
2. **把它的 `parentIds` 併入所有以它為前置的子節點**，維持 DAG 連通：
   ```typescript
   // 退役 X 時：對每個 child，其 parentIds 中的 X 替換為 X.parentIds
   child.parentIds = child.parentIds.flatMap((p) =>
     p === X.id ? X.parentIds : [p]
   );
   ```
3. 驗證腳本斷言：**沒有任何 `parentIds` 指向 `isRetired` 節點**

#### ④ 調整門檻（`tiers`）
| 方向 | 影響 | 需要 reconcile？ |
|---|---|---|
| **調低** | 孩子的 `bestCount` 可能已越過新門檻 → 應立刻補發獎牌 | **是** |
| **調高** | 已發的獎牌與 EXP 一律不回收（不變式 2） | 否 |

⚠️ 調高門檻後可能出現「已拿金牌但 `bestCount` 低於新金牌門檻」的狀態。
這是**預期行為**，UI 以 `tiersAwarded` 為準顯示獎牌，不要拿 `bestCount` 反推。

#### ⑤ 調整獎勵（`rewardExp` / `rewardCoins` / 裝備 / 稱號）
- 已發放的數額不會追溯調整（已併入 `player.totalExp`）
- 未發放的階級使用新數值
- **在已完成的節點上「新增」裝備或稱號** → 需要 reconcile 才會補發
- ⚠️ 大幅調整會讓 §4.4 的總量試算失準，請一併更新該表

---

### 12.5 `reconcile()` — 關卡表改版後的進度校正

#### 版本號
```typescript
// src/data/curricula/badminton-7yo-v1/index.ts
/** ★ 每次修改 quests.ts 就 +1，並在 CHANGELOG.md 記一行 */
export const QUEST_DATA_VERSION = 1;
```

`Player.curriculumVersion` 記錄「已套用到哪一版」。
App 啟動時若 `player.curriculumVersion < QUEST_DATA_VERSION` → 自動執行一次 `reconcile()`。
Admin 也可用【重新結算】按鈕手動觸發（§7.2）。

#### 演算法
```typescript
// src/engine/reconcile.ts
export function reconcile(
  nodes: QuestNode[],
  doc: QuestProgressDoc,
  player: Player,
): { doc: QuestProgressDoc; player: Player; event?: LiveEvent } {

  // 1. 補齊新節點的進度紀錄（預設 locked / bestCount 0 / tiersAwarded []）
  //    絕不覆寫已存在的紀錄。

  // 2. 保留孤兒紀錄：quests.ts 已無對應定義的 nodeId，原樣保留不刪。
  //    （可能是誤刪，資料留著才救得回來。）

  // 3. 對每個節點重跑 settleTiers(node, prog)：
  //    依「現行門檻」與「歷史 bestCount」算出應得但尚未發放的階級，
  //    累計待補發的 EXP / 金幣 / 裝備 / 稱號。

  // 4. 對首次達銅但 status 仍非 completed 者 → 升為 completed。
  //    ★ 只升不降：既有的 completed 一律不動。

  // 5. 重算 DAG：computeUnlocked() 把符合條件的 locked 升為 unlocked。
  //    ★ 只升不降：已 unlocked / completed 的節點不因新增 parentIds 而回退。

  // 6. 套用 applyExp() 發放補償，寫入 ActivityLog。

  // 7. 若有任何補發，產生一個 LiveEvent 讓孩子看到（見 12.6 的文案）。

  // 8. player.curriculumVersion = QUEST_DATA_VERSION
}
```

#### 必要性質（寫成單元測試）
- **冪等**：連續跑兩次 `reconcile`，第二次不得產生任何變化
- **單調**：輸出的 `bestCount` / `tiersAwarded` / `status` / `totalExp` / `coins`
  **每一項都 ≥ 輸入**（§12.2 三條不變式）
- **無重複發放**：`tiersAwarded` 去重機制在 reconcile 路徑同樣生效
- **退役安全**：`isRetired` 節點不參與 DAG 解鎖計算，但其進度與獎勵保留

#### CHANGELOG 格式
```markdown
## v2 — 2026-04-12
- 新增 q2_3b「揮拍不碰地」(order 35)，parentIds: [q2_2]
- 新增 q2_5b、q2_6b（同為支線，不擋 q2_7）
- q3_6 銅牌門檻 3 → 2（女兒卡 5 次練習）
- 原因：第 2 章實際節奏比預期快，第 3 章比預期慢
```

---

### 12.6 UI 呈現規則（改版時孩子看到什麼）

#### ⚠️ 不要顯示章節完成百分比
新增 3 個節點時，`6/7 = 86%` 會變成 `6/10 = 60%`。
**資料一筆都沒動，但孩子看到的數字掉了 26 個百分點。**

改用**只增不減**的呈現：
- ✅「已完成 **6** 個 ⭐」「🥇 3 🥈 2 🥉 1」
- ❌「第 2 章 60%」「6 / 10」

同理，§7.1 Hero Header 的「出席 12 / 52」是安全的（分母固定），
但章節進度一律不用分數形式。

#### 新節點用「發現」的語氣包裝，不用「修正」
改版觸發的 `LiveEvent` 應該是正面事件：

> 🗺️ **「教練在泡棉森林裡發現了 3 條新的小路！」**
> （而不是「關卡已更新」「任務已調整」）

- 新節點在地圖上帶 **NEW** 徽章（依 `addedInVersion` 判定），首次點開後消失
- 若 reconcile 有補發獎勵，接著播：
  > 🎁 **「而且你之前的成績，剛好達成了 2 個新獎牌！」**

#### 退役節點的處理
直接從地圖淡出，**不做任何說明**。
孩子不會記得那個圈圈，解釋反而會引起注意。
已獲得的裝備／稱號保留在裝備抽屜裡，永遠是她的。

---

### 12.7 課程複用：套用到下一個小孩

#### 範圍決定（重要）
本專案**只做「結構上留路」，不做任何多使用者 UI**。

| 做 | 不做 |
|---|---|
| 課程資料收進 `src/data/curricula/<pack-id>/` | 課程編輯器 |
| `Player` 帶 `curriculumId` / `curriculumVersion` | 多帳號 / 帳號切換畫面 |
| Firestore 以 `players/{playerId}` 為界 | 小孩選擇畫面 |

**理由**：一旦要做那些，§10.3 的安全規則（鎖單一 UID）與 §2.2 的額度模型都要重算，
成本遠大於收益。而「複製一個資料夾」本來就是十分鐘的事。

真正有價值的是**現在就把課程資料與孩子進度徹底分離**，未來擴充不必重寫。
這件事加兩個欄位就達成了。

#### 新增一個孩子的完整步驟
1. `cp -r src/data/curricula/badminton-7yo-v1 src/data/curricula/badminton-6yo-v1`
2. 依新對象調整 §4 數值與 §5 關卡表；`QUEST_DATA_VERSION` 從 1 重新起算
3. Firestore 新增 `players/{newPlayerId}` 文件，`curriculumId` 指向新課程包
4. 該孩子的裝置設 `VITE_PLAYER_ID={newPlayerId}`，重新部署一份（或加一個 env 切換）
5. §10.3 規則不需改動（仍是同一個家庭 UID）

#### ★ 教學心得回寫（`NOTES.md`）
**這是整個專案最有價值的產出，比關卡表本身更有價值。**

跑完 6 個月後，把真實資料寫回課程包：

```markdown
# badminton-7yo-v1 實戰筆記（2026-03 ~ 2026-09，對象：7 歲女童）

## 各章實際耗時 vs 規劃
| 章節 | 規劃練習數 | 實際 | 差異原因 |
|---|---|---|---|
| 1 氣球村 | 6 | 4 | 比預期快，氣球太簡單 |
| 3 雷霆峽谷 | 14 | 21 | 高遠球臂力不足，卡 q3_6 五次 |

## 卡關點與解法
- `q3_6` 高遠球：回頭刷 `q2_2` 徒手揮拍拿金牌後才突破 → 根因是揮拍鏈條不是臂力

## 實際達標次數（建議下一版的門檻）
- `q2_6` 自拋自打：第一次達標是 3 下，銅牌設 2 是對的

## 下一版建議
- 第 1 章砍到 4 關，省下的 2 次練習挪給第 3 章
```

> 作者是**從零累積真實教學經驗**的那個人。
> 這份筆記記錄的「7 歲孩子在第幾次練習做到什麼」是網路上查不到的一手資料，
> 也是下一個孩子的課程包唯一真正的依據。
> **每次練習後花兩分鐘記一行，勝過事後回憶。**

---

## 13. 下一步（v5.1，取代原 Start Instruction）

Step 0～7 已完成（見 §0）。之後的任何修改仍必須遵守：

- **§2.2 的 $0 與額度防護硬性限制**：GitHub Pages ＋ `HashRouter`、禁用 Cloud Functions、
  全 app 僅 2 個 `onSnapshot`、Firestore 只能在 `src/store/` 內使用、所有 `useEffect` 依賴陣列正確。
  新功能若需要新的資料，優先放進既有的兩份被監聽文件或靜態課程包，而不是新增監聽。
- **§12 的活資料規則**：改關卡表照 §12.4 的做法，`QUEST_DATA_VERSION` +1、寫 `CHANGELOG.md`、
  `npm run validate` 通過再部署。
- **§8.1 零懲罰原則**：任何新畫面都不得出現會「變少」的數字、倒數或失敗字樣。
- 提交前跑 `npm run check`（lint ＋ test ＋ validate ＋ build）。

目前的重點是 **Step 8**：每次練習後在 `NOTES.md` 記一行，依實戰調整 §5 門檻。
