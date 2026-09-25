import { reachedChapter } from '../../engine/stats';
import { useReadyGame } from '../../hooks/useGameState';
import type { QuestNode, QuestProgressDoc } from '../../types';
import { Modal } from '../ui/Modal';

/**
 * 還沒拿到的寶物要怎麼呈現：
 * - near：來源關卡現在就能挑戰 → 剪影 ＋「✨ 快拿到了！」
 * - known：來源關卡在已到達的章節 → 剪影 ＋「完成『某關』就能拿到！」
 * - mystery：來源在還沒到的章節 → 🎁 神秘寶物（不透露是什麼、也不透露是哪一章）
 */
type LockedState = { kind: 'near' | 'known'; hint: string } | { kind: 'mystery' };

function hintFor(node: QuestNode): string {
  const name = node.title.replace('【魔王】', '');
  return node.isBoss ? `打倒魔王「${name}」就能拿到！` : `完成「${name}」就能拿到！`;
}

function lockedState(
  progress: QuestProgressDoc,
  reached: number,
  source: QuestNode | undefined,
  graduationReward: boolean,
): LockedState {
  if (!source) return graduationReward ? { kind: 'known', hint: '畢業的時候就能拿到！' } : { kind: 'mystery' };
  if (source.chapterId > reached) return { kind: 'mystery' };
  const s = progress.byNodeId[source.id]?.status;
  return { kind: s === 'unlocked' || s === 'submitted' ? 'near' : 'known', hint: hintFor(source) };
}

export function TreasureChest({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { player, progress, curriculum } = useReadyGame();
  const reached = player.graduatedAt ? curriculum.chapters.length : reachedChapter(curriculum, progress);
  const active = curriculum.quests.filter((q) => !q.isRetired);

  const ownedEq = curriculum.equipments.filter((e) => player.unlockedEquipmentIds.includes(e.id)).length;
  const ownedTitles = curriculum.titles.filter((t) => player.unlockedTitleIds.includes(t.id)).length;

  return (
    <Modal open={open} onClose={onClose} variant="sheet" title="🏆 我的寶物箱">
      {/* 只增不減的呈現：已收集幾件，不顯示「幾分之幾」 */}
      <div className="toon-sm dots relative mb-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-3xl bg-gradient-to-r from-amber-200 via-yellow-200 to-orange-200 px-4 py-3 text-lg text-ink">
        <span>✨ 已收集 {ownedEq} 件寶物</span>
        <span>🏷️ {ownedTitles} 個稱號</span>
      </div>

      <h3 className="mb-2 text-xl text-ink">💎 寶物</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {curriculum.equipments.map((e, i) => {
          const owned = player.unlockedEquipmentIds.includes(e.id);
          if (owned) {
            return (
              <div key={e.id} className="toon-sm flex flex-col items-center rounded-3xl bg-gradient-to-b from-yellow-100 to-amber-200 p-3 text-center">
                <span className="animate-float text-5xl drop-shadow-[0_3px_0_rgba(43,35,80,0.25)]" style={{ animationDelay: `${-i * 0.6}s` }}>
                  {e.icon}
                </span>
                <span className="mt-1 text-lg text-ink">{e.name}</span>
                <span className="text-sm text-slate-600">{e.description}</span>
              </div>
            );
          }
          const source = active.find((q) => q.rewardEquipmentIds?.includes(e.id));
          const state = lockedState(progress, reached, source, curriculum.graduationEquipmentIds.includes(e.id));
          return <LockedCard key={e.id} icon={e.icon} state={state} label="神秘寶物" delay={i} />;
        })}
      </div>

      <h3 className="mb-2 mt-6 text-xl text-ink">🏷️ 稱號</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {curriculum.titles.map((t, i) => {
          const owned = player.unlockedTitleIds.includes(t.id);
          if (owned) {
            const wearing = player.currentTitleId === t.id;
            return (
              <div
                key={t.id}
                className={`toon-sm relative flex min-h-[96px] flex-col items-center justify-center rounded-3xl px-2 py-3 text-center text-white ${t.color}`}
              >
                <span className="text-3xl">🏷️</span>
                <span className="text-lg">{t.name}</span>
                {wearing && (
                  <span className="toon-sm absolute -top-3 rounded-full bg-yellow-300 px-2 text-sm text-ink">⭐ 戴著中</span>
                )}
              </div>
            );
          }
          const source = active.find((q) => q.rewardTitleId === t.id);
          const state = lockedState(progress, reached, source, curriculum.graduationTitleId === t.id);
          return <LockedCard key={t.id} icon="🏷️" state={state} label="神秘稱號" delay={i} compact />;
        })}
      </div>
    </Modal>
  );
}

function LockedCard({
  icon,
  state,
  label,
  delay,
  compact,
}: {
  icon: string;
  state: LockedState;
  label: string;
  delay: number;
  compact?: boolean;
}) {
  if (state.kind === 'mystery') {
    return (
      <div className={`flex flex-col items-center justify-center rounded-3xl border-[3px] border-dashed border-violet-300 bg-violet-50 p-3 text-center ${compact ? 'min-h-[96px]' : ''}`}>
        <span className="relative">
          <span className={`inline-block animate-wiggle ${compact ? 'text-3xl' : 'text-5xl'}`} style={{ animationDelay: `${-delay * 0.4}s` }}>
            🎁
          </span>
          <span aria-hidden className="absolute -right-3 -top-2 animate-float text-lg">✨</span>
        </span>
        <span className="mt-1 text-lg text-violet-700">{label}</span>
        <span className="text-sm text-violet-500">繼續冒險就會發現！</span>
      </div>
    );
  }

  const near = state.kind === 'near';
  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-3xl p-3 text-center ${compact ? 'min-h-[96px]' : ''} ${
        near ? 'toon-sm bg-sky-100' : 'border-[3px] border-dashed border-sky-300 bg-sky-50'
      }`}
    >
      {near && (
        <span className="toon-sm absolute -top-3 animate-bob whitespace-nowrap rounded-full bg-yellow-300 px-2 text-sm text-ink left-1/2">
          ✨ 快拿到了！
        </span>
      )}
      {/* 寶物剪影：看得出形狀，但還不是你的 */}
      <span className="relative">
        <span className={`inline-block opacity-45 brightness-0 ${compact ? 'text-3xl' : 'text-5xl'}`}>{icon}</span>
        <span className="toon-sm absolute -bottom-1 -right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm">❓</span>
      </span>
      <span className="mt-1 text-lg text-sky-800">？？？</span>
      <span className="mt-0.5 rounded-2xl bg-white/80 px-2 py-0.5 text-sm leading-snug text-sky-800">{state.hint}</span>
    </div>
  );
}
