import { describe, expect, it } from 'vitest';
import { adminAdjust, graduate, grantBonus, updatePet } from '../src/engine/actions';
import {
  PET_MAX_STAGE,
  PET_STAGES,
  levelsToNextStage,
  petColorOf,
  petGrowth,
  petNameOf,
  petStageIndex,
  petWearOf,
} from '../src/engine/pet';
import { badminton7yoV1 as C } from '../src/data/curricula/badminton-7yo-v1';
import type { GameState } from '../src/engine/actions';
import { apply, fresh, makeCtx } from './helpers';

describe('狗狗夥伴的成長（只看等級，只升不降）', () => {
  it('各階段的等級門檻', () => {
    expect(PET_STAGES.map((s) => s.minLevel)).toEqual([1, 3, 6, 10, 15, 20, 25]);
    expect(petStageIndex(1)).toBe(0);
    expect(petStageIndex(2)).toBe(0);
    expect(petStageIndex(3)).toBe(1);
    expect(petStageIndex(9)).toBe(2);
    expect(petStageIndex(10)).toBe(3);
    expect(petStageIndex(24)).toBe(5);
    expect(petStageIndex(25)).toBe(PET_MAX_STAGE);
    expect(petStageIndex(7, true)).toBe(PET_MAX_STAGE); // 畢業直接變羽球勇者犬
  });

  it('等級越高，階段與外型只會變大，不會變小', () => {
    for (let lv = 1; lv < 25; lv++) {
      expect(petStageIndex(lv + 1)).toBeGreaterThanOrEqual(petStageIndex(lv));
      expect(petGrowth(lv + 1)).toBeGreaterThanOrEqual(petGrowth(lv));
    }
    expect(petGrowth(3)).toBe(0);
    expect(petGrowth(25)).toBe(1);
  });

  it('再升幾級會長大', () => {
    expect(levelsToNextStage(1)).toBe(2);
    expect(levelsToNextStage(7)).toBe(3);
    expect(levelsToNextStage(25)).toBeNull();
    expect(levelsToNextStage(4, true)).toBeNull();
  });

  it('預設名字與毛色；寶箱裝備會穿在身上', () => {
    const s = fresh();
    expect(petNameOf(s.player)).toBe('旺旺');
    expect(petColorOf(s.player)).toBe('cream');
    expect(petColorOf({ petColor: 'rainbow' })).toBe('cream');
    expect(petWearOf({ unlockedEquipmentIds: ['eq_shoes', 'eq_towel'] })).toEqual({ wristband: false, shoes: true, scarf: true });
  });
});

describe('長大的慶祝', () => {
  it('升級跨過階段門檻時，在 level_up 之後多一個 pet_grow', () => {
    const s = fresh(); // Lv.1，升到 Lv.3 需要 50 + 70 = 120 EXP
    const r = grantBonus(s, makeCtx(), { exp: 130, coins: 0 });
    const kinds = r.player.lastEvent!.items.map((i) => i.kind);
    expect(r.player.level).toBe(3);
    expect(kinds).toEqual(['bonus', 'level_up', 'pet_grow']);
    expect(r.player.lastEvent!.items[2]).toEqual({ kind: 'pet_grow', stage: 1 });
  });

  it('升級但沒有跨過門檻時不會有 pet_grow', () => {
    const s = fresh();
    const r = grantBonus(s, makeCtx(), { exp: 60, coins: 0 }); // Lv.2
    expect(r.player.level).toBe(2);
    expect(r.player.lastEvent!.items.some((i) => i.kind === 'pet_grow')).toBe(false);
  });

  it('一次連升好幾個階段只播一次，直接到最新的階段', () => {
    const s = fresh();
    const r = grantBonus(s, makeCtx(), { exp: 1200, coins: 0 }); // 直接到 Lv.10 以上
    const grows = r.player.lastEvent!.items.filter((i) => i.kind === 'pet_grow');
    expect(grows).toHaveLength(1);
    expect(grows[0]).toEqual({ kind: 'pet_grow', stage: petStageIndex(r.player.level) });
  });

  it('畢業時狗狗變成羽球勇者犬', () => {
    let s: GameState = fresh();
    s = apply(s, adminAdjust(s, makeCtx(), { setLevel: 12 }));
    // 模擬課程已滿 26 週
    const later = makeCtx({ now: new Date(2026, 8, 10, 10) });
    const r = graduate(s, later, {});
    expect(r.player.lastEvent!.items).toContainEqual({ kind: 'pet_grow', stage: PET_MAX_STAGE });
  });
});

describe('updatePet', () => {
  it('取名字、選毛色；不寫日誌、不發慶祝', () => {
    const s = fresh();
    const r = updatePet(s, makeCtx(), { name: ' 小白 ', color: 'white' });
    expect(r.player.petName).toBe('小白');
    expect(r.player.petColor).toBe('white');
    expect(r.logs).toEqual([]);
    expect(r.player.lastEvent).toBe(s.player.lastEvent);
  });

  it('名字不能空白、不能太長；顏色要在清單內', () => {
    const s = fresh();
    expect(() => updatePet(s, makeCtx(), { name: '  ' })).toThrow();
    expect(() => updatePet(s, makeCtx(), { name: '一二三四五六七八九' })).toThrow();
    expect(() => updatePet(s, makeCtx(), { color: 'rainbow' })).toThrow();
    expect(C.id).toBeTruthy();
  });
});
