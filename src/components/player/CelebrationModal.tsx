import confetti from 'canvas-confetti';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';
import { TIER_EMOJI, TIER_LABEL } from '../../engine/tiers';
import { useReadyGame } from '../../hooks/useGameState';
import { playSound, type SoundName } from '../../lib/sound';
import type { CelebrationItem, Curriculum } from '../../types';
import { Button } from '../ui/Button';
import { SpeakButton } from './SpeakButton';

interface Scene {
  emoji: string;
  title: string;
  subtitle?: string;
  sound: SoundName;
  confetti?: 'burst' | 'big' | 'school';
  gradient: string;
  flip?: boolean; // 獎牌翻轉
  speak?: string; // 有值時顯示 🔊，讓不太識字的小孩聽教練的話
  /** 小事件（階級獎牌、出席、沒有附話的教練獎勵）：播 AUTO_ADVANCE_MS 後自動換下一個，不用點 */
  auto?: boolean;
}

const AUTO_ADVANCE_MS = 1500;

function sceneOf(item: CelebrationItem, c: Curriculum): Scene {
  const nodeTitle = (id: string) => c.quests.find((q) => q.id === id)?.title.replace('【魔王】', '') ?? '';
  const reward = (exp: number, coins: number) => [exp ? `+${exp} EXP` : '', coins ? `+${coins} 金幣` : ''].filter(Boolean).join('　');
  switch (item.kind) {
    case 'tier':
      return {
        emoji: TIER_EMOJI[item.tier],
        title: `${TIER_LABEL[item.tier]}！`,
        subtitle: `【${nodeTitle(item.nodeId)}】\n${reward(item.exp, item.coins)}`,
        sound: 'medal',
        gradient: item.tier === 'gold' ? 'from-amber-300 to-yellow-500' : item.tier === 'silver' ? 'from-slate-200 to-slate-400' : 'from-orange-300 to-amber-700',
        flip: true,
        confetti: item.tier === 'gold' ? 'burst' : undefined,
        auto: true,
      };
    case 'quest_completed':
      return { emoji: '🏆', title: 'QUEST COMPLETED!', subtitle: `【${nodeTitle(item.nodeId)}】完成了！`, sound: 'tada', confetti: 'big', gradient: 'from-fuchsia-500 to-violet-600' };
    case 'equipment': {
      const e = c.equipments.find((x) => x.id === item.equipmentId);
      return { emoji: e?.icon ?? '🎁', title: '獲得新寶物！', subtitle: e ? `${e.name}\n${e.description}` : '', sound: 'unlock', gradient: 'from-sky-400 to-indigo-600' };
    }
    case 'title': {
      const t = c.titles.find((x) => x.id === item.titleId);
      return { emoji: '🏷️', title: '獲得新稱號！', subtitle: `「${t?.name ?? ''}」`, sound: 'tada', confetti: 'burst', gradient: 'from-rose-400 to-fuchsia-600' };
    }
    case 'level_up':
      return { emoji: '⬆️', title: 'LEVEL UP!', subtitle: `Lv.${item.from} → Lv.${item.to}`, sound: 'levelup', confetti: 'big', gradient: 'from-lime-300 to-emerald-600' };
    case 'node_unlocked':
      return {
        emoji: '🗺️',
        title: '新的關卡打開了！',
        subtitle: item.nodeIds.map((id) => `【${nodeTitle(id)}】`).join('\n'),
        sound: 'unlock',
        gradient: 'from-cyan-400 to-blue-600',
      };
    case 'chapter_unlocked': {
      const ch = c.chapters.find((x) => x.id === item.chapterId);
      return {
        emoji: ch?.icon ?? '🗺️',
        title: '新的區域出現了！',
        subtitle: ch ? `第 ${ch.id} 章・${ch.name}\n${ch.description}` : '',
        sound: 'reveal',
        confetti: 'big',
        gradient: ch?.theme ?? 'from-cyan-400 to-blue-600',
      };
    }
    case 'attendance':
      return { emoji: '🏸', title: `第 ${item.sessionCount} 次練習開始！`, subtitle: reward(item.exp, item.coins), sound: 'coin', gradient: 'from-emerald-400 to-teal-600', auto: true };
    case 'milestone':
      return { emoji: '🏅', title: item.label, subtitle: reward(item.exp, item.coins), sound: 'tada', confetti: 'big', gradient: 'from-amber-400 to-rose-500' };
    case 'order_fulfilled':
      return { emoji: '📦', title: '獎品送到囉！', subtitle: `你的「${item.rewardTitle}」到了！`, sound: 'tada', confetti: 'burst', gradient: 'from-orange-400 to-pink-500' };
    case 'coach_note':
      return { emoji: '🗣️', title: '教練想跟你說', subtitle: item.text, sound: 'tap', gradient: 'from-violet-400 to-indigo-600', speak: `教練想跟你說：${item.text}` };
    case 'bonus':
      return { emoji: '🎁', title: '教練給你獎勵！', subtitle: [reward(item.exp, item.coins), item.message].filter(Boolean).join('\n'), sound: 'coin', confetti: 'burst', gradient: 'from-yellow-300 to-orange-500', speak: item.message ? `教練給你獎勵！${item.message}` : undefined, auto: !item.message };
    case 'discovery': {
      const ch = c.chapters.find((x) => x.id === item.chapterId);
      return { emoji: '🗺️', title: '發現新的小路！', subtitle: `教練在${ch?.name ?? '地圖'}裡發現了 ${item.count} 條新的小路！`, sound: 'reveal', confetti: 'burst', gradient: 'from-emerald-400 to-cyan-600' };
    }
    case 'retro_medals':
      return { emoji: '🎁', title: '驚喜！', subtitle: `而且你之前的成績，剛好達成了 ${item.count} 個新獎牌！`, sound: 'medal', confetti: 'burst', gradient: 'from-amber-300 to-orange-500' };
    case 'graduation':
      return { emoji: '🎓', title: '畢業典禮', subtitle: '恭喜你走完五個區域，登上王者之巔！\n你是真正的羽球勇者！', sound: 'tada', confetti: 'school', gradient: 'from-fuchsia-600 via-violet-600 to-amber-500' };
  }
}

function fireConfetti(kind: Scene['confetti']) {
  if (!kind) return;
  if (kind === 'burst') {
    void confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 }, zIndex: 70 });
  } else if (kind === 'big') {
    void confetti({ particleCount: 160, spread: 110, origin: { y: 0.55 }, zIndex: 70 });
    setTimeout(() => void confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0 }, zIndex: 70 }), 250);
    setTimeout(() => void confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1 }, zIndex: 70 }), 400);
  } else {
    const end = Date.now() + 2500;
    const frame = () => {
      void confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0 }, zIndex: 70 });
      void confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1 }, zIndex: 70 });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }
}

/**
 * 慶祝動畫：依佇列一次只播一個（不疊放）。大事件點「好耶！」才播下一個；小事件 1.5 秒後自動換。
 * 背景模糊凍結 → 彩帶 → 音效 → 獎勵內容。prefers-reduced-motion 時關閉彩帶與大幅位移。
 */
export function CelebrationModal({
  item,
  remaining,
  onNext,
}: {
  item: CelebrationItem | null;
  remaining: number;
  onNext: () => void;
}) {
  const { curriculum } = useReadyGame();
  const reduce = useReducedMotion();
  const scene = item ? sceneOf(item, curriculum) : null;
  const sound = scene?.sound;
  const confettiKind = scene?.confetti;

  // item 是佇列裡的物件，換下一個時參考才會變 → 每個項目只播一次
  useEffect(() => {
    if (!item || !sound) return;
    playSound(sound);
    if (!reduce) fireConfetti(confettiKind);
  }, [item, sound, confettiKind, reduce]);

  // 小事件自動換下一個；點「好耶！」提早換也可以（cleanup 會取消計時）
  const auto = !!scene?.auto;
  useEffect(() => {
    if (!item || !auto) return;
    const t = setTimeout(onNext, AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
  }, [item, auto, onNext]);

  return (
    <AnimatePresence mode="wait">
      {item && scene && (
        <motion.div
          key={JSON.stringify(item) + remaining}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-5 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onNext}
        >
          <motion.div
            className="toon kid-theme w-full max-w-md overflow-hidden rounded-[2.5rem] bg-white"
            initial={reduce ? { opacity: 0 } : { scale: 0.5, y: 60, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 14, stiffness: 220 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 上半部：主題色 ＋ 旋轉光芒 ＋ 大圖示 */}
            <div className={`relative flex h-52 items-center justify-center overflow-hidden bg-gradient-to-br ${scene.gradient}`}>
              <div aria-hidden className="sunburst absolute h-[30rem] w-[30rem] animate-spin-slow" />
              <span aria-hidden className="absolute left-6 top-5 animate-float text-3xl">✨</span>
              <span aria-hidden className="absolute bottom-6 right-8 animate-float text-2xl [animation-delay:-1.5s]">⭐</span>
              <span aria-hidden className="absolute right-10 top-8 animate-float text-xl [animation-delay:-2.5s]">✨</span>
              <motion.div
                className="relative text-[7.5rem] leading-none drop-shadow-[0_6px_0_rgba(43,35,80,0.35)]"
                initial={reduce ? false : scene.flip ? { rotateY: 540, scale: 0.3 } : { scale: 0.3, rotate: -20 }}
                animate={{ rotateY: 0, scale: 1, rotate: 0 }}
                transition={{ duration: 0.9, type: 'spring', damping: 10 }}
              >
                {scene.emoji}
              </motion.div>
            </div>
            {/* 下半部：文字 ＋ 按鈕 */}
            <div className="flex flex-col items-center gap-2 border-t-[3px] border-ink px-6 pb-7 pt-5 text-center">
              <div className="font-game text-4xl font-extrabold leading-tight text-ink">{scene.title}</div>
              {scene.subtitle && (
                <div className="whitespace-pre-line text-2xl leading-snug text-slate-600">{scene.subtitle}</div>
              )}
              {scene.speak && <SpeakButton text={scene.speak} label="念教練的話" />}
              <Button size="lg" variant="gold" block className="toon mt-3" onClick={onNext} sound={false}>
                好耶！{remaining > 1 ? `（還有 ${remaining - 1} 個）` : ''}
              </Button>
              {auto && (
                // 自動換下一個的倒數條（顏色變化在 reduced-motion 下也保留）
                <div aria-hidden className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <motion.div
                    className="h-full rounded-full bg-amber-400"
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: AUTO_ADVANCE_MS / 1000, ease: 'linear' }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
