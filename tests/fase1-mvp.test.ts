import { describe, expect, it } from 'vitest';
import fingersJson from '../content/fingers.json';
import levelsJson from '../content/levels.json';
import type { FingersConfig, LevelConfig } from '../contracts/domain';
import { normalizeKeyboardInput, resolveFingerForChar } from '../client/src/core/keyboard';
import {
  computeBarretines,
  createSublevelSequence,
  ExerciseSession,
} from '../client/src/core/engine';
import { applySessionToProgress } from '../client/src/game/progress';

const fingersConfig = fingersJson as unknown as FingersConfig;
const levels = levelsJson.levels as unknown as LevelConfig[];
const levelL01 = levels.find((l) => l.id === 'L01')!;
const levelL02 = levels.find((l) => l.id === 'L02')!;

describe('Fase 1 (v0.3) — Subnivells amb Espai i aïllament de tecles noves', () => {
  it('Pantalla 1 de L01 genera parelles (ff, jj, fj, jf) separades per Espai', () => {
    const sub1 = levelL01.sublevels![0]!;
    const seq = createSublevelSequence(levelL01, sub1, 101);
    const words = seq.split(' ');
    expect(words.length).toBe(sub1.wordsCount);
    expect(words.slice(0, 4)).toEqual(['ff', 'jj', 'fj', 'jf']);
  });

  it('Pantalla 1 i 2 de L02 treballen NOMÉS les tecles noves (d, k) + Espai sense barrejar f ni j', () => {
    const sub2_1 = levelL02.sublevels![0]!;
    const sub2_2 = levelL02.sublevels![1]!;
    const seq1 = createSublevelSequence(levelL02, sub2_1, 202);
    const seq2 = createSublevelSequence(levelL02, sub2_2, 202);

    expect(seq1.includes('f') || seq1.includes('j')).toBe(false);
    expect(seq2.includes('f') || seq2.includes('j')).toBe(false);
    expect(seq1.split(' ').slice(0, 4)).toEqual(['dd', 'kk', 'dk', 'kd']);
  });

  it('Pantalla 4 de L02 combina les tecles noves (d, k) amb les anteriors (f, j) + Espai', () => {
    const sub2_4 = levelL02.sublevels![3]!;
    const seq4 = createSublevelSequence(levelL02, sub2_4, 2026);
    expect(seq4.includes('d') || seq4.includes('k')).toBe(true);
    expect(seq4.includes('f') || seq4.includes('j')).toBe(true);
    expect(seq4.includes(' ')).toBe(true);
  });

  it('calcula de 1 a 5 Barretines segons precisió i requereix >= 3 Barretines per avançar', () => {
    expect(computeBarretines(0.99)).toBe(5);
    expect(computeBarretines(0.95)).toBe(4);
    expect(computeBarretines(0.90)).toBe(3);
    expect(computeBarretines(0.82)).toBe(2);
    expect(computeBarretines(0.65)).toBe(1);

    const sub1 = levelL01.sublevels![0]!;
    const session = new ExerciseSession(levelL01, fingersConfig, 777, { sublevel: sub1 });
    for (const ch of session.getSequence()) {
      const resolved = resolveFingerForChar(ch, fingersConfig);
      session.evaluate(
        normalizeKeyboardInput(
          { code: resolved?.code ?? 'Space', key: ch, timeStamp: 1400 },
          ch,
          1000,
          fingersConfig
        )!
      );
    }

    const summary = session.summary({
      sessionId: 'sess-b5',
      startedAtIso: '2026-11-13T12:00:00Z',
      durationSeconds: 30,
      sublevelId: sub1.id,
    });

    expect(summary.barretines).toBe(5);
    const applied = applySessionToProgress(summary, levelL01, levels, undefined, 0, []);
    expect(applied.barretinesEarned).toBe(5);
    expect(applied.sublevelUnlockedNext).toBe(true);
    expect(applied.updatedLevelProgress.sublevels_barretines?.[sub1.id]).toBe(5);
  });
});
