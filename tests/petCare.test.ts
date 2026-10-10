import { describe, expect, it } from 'vitest';
import { bathePet, buyPetFood, feedPet, setPetAccessory, type GameState } from '../src/engine/actions';
import { PET_UNLOCKS, nextUnlock, petCareStatus, petWearOf, unlockedAccessories } from '../src/engine/pet';
import { apply, fresh, makeCtx } from './helpers';

const at = (h: number, day = 2) => makeCtx({ now: new Date(2026, 2, day, h, 0, 0) });

function withCoins(coins: number): GameState {
  const s = fresh();
  return { ...s, player: { ...s.player, coins } };
}

describe('買狗狗點心', () => {
  it('立即扣款、放進點心盒、記一筆日誌；金幣不夠不能買（不會扣成負數）', () => {
    let s = withCoins(12);
    const r = buyPetFood(s, at(9), { foodId: 'pf_bone' });
    s = apply(s, r);
    expect(s.player.coins).toBe(2);
    expect(s.player.petFood).toEqual({ pf_bone: 1 });
    expect(r.logs[0].type).toBe('pet_food_bought');
    expect(r.orders).toBeUndefined(); // 不需要家長出貨
    expect(() => buyPetFood(s, at(9), { foodId: 'pf_biscuit' })).toThrow();
    expect(s.player.coins).toBe(2);
  });
});

describe('餵點心：一天 3 次、間隔 4 小時', () => {
  function stocked(): GameState {
    let s = withCoins(100);
    for (let i = 0; i < 5; i++) s = apply(s, buyPetFood(s, at(8), { foodId: 'pf_biscuit' }));
    return s;
  }

  it('間隔不到 4 小時不能再吃；第 3 次之後今天吃飽了', () => {
    let s = stocked();
    s = apply(s, feedPet(s, at(9), { foodId: 'pf_biscuit' }));
    expect(() => feedPet(s, at(12), { foodId: 'pf_biscuit' })).toThrow('飽飽');
    s = apply(s, feedPet(s, at(13), { foodId: 'pf_biscuit' }));
    s = apply(s, feedPet(s, at(17), { foodId: 'pf_biscuit' }));
    expect(() => feedPet(s, at(22), { foodId: 'pf_biscuit' })).toThrow('明天');
    expect(s.player.petFood?.pf_biscuit).toBe(2);
    expect(s.player.petAffection).toBe(3);
  });

  it('換日重新計算', () => {
    let s = stocked();
    for (const h of [8, 12, 16]) s = apply(s, feedPet(s, at(h), { foodId: 'pf_biscuit' }));
    const status = petCareStatus(s.player, at(9, 3).now, '2026-03-03');
    expect(status.mealsLeft).toBe(3);
    expect(() => feedPet(s, at(9, 3), { foodId: 'pf_biscuit' })).not.toThrow();
  });

  it('點心盒沒有就不能餵', () => {
    const s = withCoins(100);
    expect(() => feedPet(s, at(9), { foodId: 'pf_cake' })).toThrow('商店');
  });

  it('蛋糕加 2 顆愛心', () => {
    let s = withCoins(100);
    s = apply(s, buyPetFood(s, at(8), { foodId: 'pf_cake' }));
    s = apply(s, feedPet(s, at(9), { foodId: 'pf_cake' }));
    expect(s.player.petAffection).toBe(2);
  });
});

describe('洗澡：一天一次', () => {
  it('洗過今天就不能再洗，隔天可以；每次 +1 愛心', () => {
    let s = fresh();
    s = apply(s, bathePet(s, at(9)));
    expect(s.player.petAffection).toBe(1);
    expect(() => bathePet(s, at(20))).toThrow('香香');
    s = apply(s, bathePet(s, at(9, 3)));
    expect(s.player.petAffection).toBe(2);
  });
});

describe('親密度解鎖', () => {
  it('跨過門檻時記日誌；只增不減；不給 EXP 或金幣', () => {
    let s = fresh();
    s = { ...s, player: { ...s.player, petAffection: 2 } };
    const r = bathePet(s, at(9));
    expect(r.player.petAffection).toBe(3);
    expect(r.logs.map((l) => l.type)).toEqual(['pet_unlock']);
    expect(r.player.totalExp).toBe(s.player.totalExp);
    expect(r.player.coins).toBe(s.player.coins);
    expect(nextUnlock(3)?.name).toBe('蝴蝶結');
    expect(PET_UNLOCKS.map((u) => u.hearts)).toEqual([3, 6, 10, 15, 20, 30, 40, 50]);
  });

  it('配飾只能選已解鎖的；沒解鎖的不會戴上', () => {
    let s = fresh();
    expect(() => setPetAccessory(s, at(9), { id: 'bow' })).toThrow();
    s = { ...s, player: { ...s.player, petAffection: 16 } };
    expect(unlockedAccessories(16)).toEqual(['bow', 'cap']);
    s = apply(s, setPetAccessory(s, at(9), { id: 'cap' }));
    expect(petWearOf(s.player).accessory).toBe('cap');
    expect(petWearOf({ ...s.player, petAffection: 1 }).accessory).toBeUndefined();
    s = apply(s, setPetAccessory(s, at(9), { id: null }));
    expect(petWearOf(s.player).accessory).toBeUndefined();
  });
});
