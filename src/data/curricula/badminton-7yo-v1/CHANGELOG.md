# badminton-7yo-v1 關卡表變更紀錄

> 每次修改 `quests.ts`：
> 1. `index.ts` 的 `QUEST_DATA_VERSION` +1
> 2. 新節點填 `addedInVersion: <新版本號>`（地圖會顯示 NEW）
> 3. 在下面記一行（新增／門檻調整／退役，以及**原因**）
> 4. `npm run validate` 通過後再部署
> 5. 部署後 App 會自動 reconcile；也可在 Admin 按【重新結算】
>
> 規則速查（spec §12）：id 永不重用／重排；插入用後綴（`q2_3b`）；
> 新節點當支線；不刪節點改 `isRetired`；改 `unit`＝換新 id。

## v1 — 初版
- 5 章節 / 34 節點 / 26 週（spec v5 §5）
- 各章 `order` 為 10, 20, 30…，留出插入空間

<!--
範例：
## v2 — 2026-04-12
- 新增 q2_3b「揮拍不碰地」(order 35)，parentIds: [q2_2]
- 新增 q2_5b、q2_6b（同為支線，不擋 q2_7）
- q3_6 銅牌門檻 3 → 2（女兒卡 5 次練習）
- 原因：第 2 章實際節奏比預期快，第 3 章比預期慢
-->
