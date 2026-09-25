import { createInitialState, type ActionResult, type Ctx, type GameState } from '../src/engine/actions';
import { badminton7yoV1 } from '../src/data/curricula/badminton-7yo-v1';
import type { Curriculum } from '../src/types';

export function makeCtx(opts: { now?: Date; curriculum?: Curriculum } = {}): Ctx {
  let n = 0;
  return {
    now: opts.now ?? new Date(2026, 2, 2, 10, 0, 0), // 2026-03-02 (Mon)
    newId: () => `id${++n}`,
    curriculum: opts.curriculum ?? badminton7yoV1,
  };
}

export function fresh(ctx: Ctx = makeCtx()): GameState {
  return createInitialState(ctx, { playerId: 'hero', name: '小勇者' });
}

export function apply(state: GameState, r: ActionResult): GameState {
  void state;
  return { player: r.player, progress: r.progress };
}

/** 直接把某節點核可到某次數（測試捷徑） */
export function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}
