import { describe, expect, it } from 'vitest';
import fingersJson from '../content/fingers.json';
import levelsJson from '../content/levels.json';
import type { FingersConfig, LevelConfig } from '../contracts/domain';
import { normalizeKeyboardInput, resolveFingerForChar } from '../client/src/core/keyboard';
import { createSeededSequence, ExerciseSession } from '../client/src/core/engine';
import { applySessionToProgress } from '../client/src/game/progress';
import { createCascadeStore, SessionSyncQueue } from '../client/src/storage/syncQueue';
import { LocalMockApiClient } from '../client/src/storage/apiClient';

const fingersConfig = fingersJson as unknown as FingersConfig;
const levels = levelsJson.levels as unknown as LevelConfig[];
const levelL01 = levels.find((l) => l.id === 'L01')!;
const levelL04 = levels.find((l) => l.id === 'L04')!;

describe('Fase 1 — T1.1 Captura i normalització de teclat (M1)', () => {
  it('associa f -> KeyF (L-index), j -> KeyJ (R-index), ç -> Backslash (R-pinky) i espai -> Space (thumb)', () => {
    expect(resolveFingerForChar('f', fingersConfig)).toEqual({
      code: 'KeyF',
      finger: 'L-index',
      requiresShift: false,
    });
    expect(resolveFingerForChar('j', fingersConfig)).toEqual({
      code: 'KeyJ',
      finger: 'R-index',
      requiresShift: false,
    });
    expect(resolveFingerForChar('ç', fingersConfig)).toEqual({
      code: 'Backslash',
      finger: 'R-pinky',
      requiresShift: false,
    });
    expect(resolveFingerForChar(' ', fingersConfig)).toEqual({
      code: 'Space',
      finger: 'thumb',
      requiresShift: false,
    });
  });

  it('ignora modificadors (Shift, AltGr), repeticions i tecles mortes (Dead)', () => {
    expect(
      normalizeKeyboardInput(
        { code: 'ShiftLeft', key: 'Shift', timeStamp: 1200 },
        'f',
        1000,
        fingersConfig
      )
    ).toBeNull();

    expect(
      normalizeKeyboardInput(
        { code: 'Quote', key: 'Dead', timeStamp: 1200 },
        'à',
        1000,
        fingersConfig
      )
    ).toBeNull();

    expect(
      normalizeKeyboardInput(
        { code: 'KeyF', key: 'f', timeStamp: 1250, repeat: true },
        'f',
        1000,
        fingersConfig
      )
    ).toBeNull();
  });

  it('calcula correctament la latència t des de l’estímul', () => {
    const ev = normalizeKeyboardInput(
      { code: 'KeyF', key: 'f', timeStamp: 1420 },
      'f',
      1000,
      fingersConfig
    );
    expect(ev).toEqual({
      expected: 'f',
      typed: 'f',
      code: 'KeyF',
      finger: 'L-index',
      t: 420,
    });
  });
});

describe('Fase 1 — T1.2 Motor d’exercicis i avaluació amb llavor (M2)', () => {
  it('genera seqüències 100% reproduïbles amb la mateixa llavor (RF-07)', () => {
    const seq1 = createSeededSequence(levelL01, 42);
    const seq2 = createSeededSequence(levelL01, 42);
    const seqDifferent = createSeededSequence(levelL01, 99);

    expect(seq1).toBe(seq2);
    expect(seq1).not.toBe(seqDifferent);
    expect(seq1.length).toBe(levelL01.targetLengthChars);
    expect([...seq1].every((ch) => ch === 'f' || ch === 'j')).toBe(true);
  });

  it('inclou la ç i la a al nivell L04 (Proposta 1 acordada)', () => {
    const seqL04 = createSeededSequence(levelL04, 2026);
    expect(seqL04.includes('a')).toBe(true);
    expect(seqL04.includes('ç')).toBe(true);
  });

  it('no bloqueja en cas d’errada (RF-09) i calcula precisió, estrelles i estadístiques per tecla (RF-19)', () => {
    const session = new ExerciseSession(levelL01, fingersConfig, 12345);
    const seq = session.getSequence();

    // Escrivim totes les tecles bé excepte la primera
    for (let i = 0; i < seq.length; i++) {
      const expected = seq[i]!;
      const typed = i === 0 ? (expected === 'f' ? 'j' : 'f') : expected;
      const evalRes = session.evaluate({
        expected,
        typed,
        code: expected === 'f' ? 'KeyF' : 'KeyJ',
        finger: expected === 'f' ? 'L-index' : 'R-index',
        t: 500,
      });

      if (i === 0) {
        expect(evalRes.correct).toBe(false);
      } else {
        expect(evalRes.correct).toBe(true);
      }
    }

    expect(session.isCompleted()).toBe(true);
    const summary = session.summary({
      sessionId: 'sess-test-001',
      startedAtIso: '2026-11-13T10:00:00Z',
      durationSeconds: 60,
    });

    expect(summary.chars_total).toBe(40);
    expect(summary.errors_total).toBe(1);
    expect(summary.accuracy).toBe(0.975);
    expect(summary.stars).toBe(3);
    expect(summary.key_stats.length).toBe(2);
  });
});

describe('Fase 1 — T1.4 i T1.5 Gamificació (M4) i Persistència en cascada (M5)', () => {
  it('desbloqueja L02 i la insígnia badge_home_index en assolir 3 sessions >= 95%', () => {
    const session = new ExerciseSession(levelL01, fingersConfig, 777);
    for (const ch of session.getSequence()) {
      session.evaluate({
        expected: ch,
        typed: ch,
        code: ch === 'f' ? 'KeyF' : 'KeyJ',
        finger: ch === 'f' ? 'L-index' : 'R-index',
        t: 400,
      });
    }
    const summary = session.summary({
      sessionId: 'sess-perfect',
      startedAtIso: '2026-11-13T10:05:00Z',
      durationSeconds: 45,
    });

    const step1 = applySessionToProgress(summary, levelL01, levels, undefined, 0, []);
    expect(step1.updatedLevelProgress.qualifying_sessions_count).toBe(1);
    expect(step1.levelJustCompleted).toBe(false);

    const step2 = applySessionToProgress(
      summary,
      levelL01,
      levels,
      step1.updatedLevelProgress,
      1,
      []
    );
    expect(step2.updatedLevelProgress.qualifying_sessions_count).toBe(2);
    expect(step2.levelJustCompleted).toBe(false);

    const step3 = applySessionToProgress(
      summary,
      levelL01,
      levels,
      step2.updatedLevelProgress,
      2,
      []
    );
    expect(step3.updatedLevelProgress.qualifying_sessions_count).toBe(3);
    expect(step3.levelJustCompleted).toBe(true);
    expect(step3.newlyUnlockedLevelId).toBe('L02');
    expect(step3.newlyUnlockedBadges.map((b) => b.id)).toContain('badge_home_index');
  });

  it('persisteix el progrés localment i buida la cua de sessions amb LocalMockApiClient', async () => {
    const api = new LocalMockApiClient('student');
    const store = createCascadeStore('test_mecano_mvp');
    const queue = new SessionSyncQueue(api, store);

    const session = new ExerciseSession(levelL01, fingersConfig, 888);
    for (const ch of session.getSequence()) {
      session.evaluate({
        expected: ch,
        typed: ch,
        code: ch === 'f' ? 'KeyF' : 'KeyJ',
        finger: ch === 'f' ? 'L-index' : 'R-index',
        t: 450,
      });
    }
    const summary = session.summary({
      sessionId: 'sess-queue-001',
      startedAtIso: '2026-11-13T10:10:00Z',
      durationSeconds: 50,
    });

    const res = await queue.enqueueAndFlush(summary);
    expect(res.sentNow).toBe(true);
    expect(res.pendingCount).toBe(0);
  });
});
