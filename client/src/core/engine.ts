/**
 * M2 — Motor d'exercicis, subnivells amb Espai i avaluació amb llavor (Versió 0.3).
 * Suporta:
 * - P1 (isolated_pairs): parelles de les 2 tecles noves separades per Espai (ff jj fj jf)
 * - P2 (isolated_groups): grups de 3-4 de les 2 tecles noves separats per Espai (fjf jfj fjjf)
 * - P3 (adventure_new): obstacles amb les tecles noves separats per Espai
 * - P4 (adventure_mixed): obstacles combinant tecles noves i anteriors separats per Espai
 * - P5 (master_proverb): consolidació i Dita Catalana
 */

import type {
  BarretinesCount,
  BarretinesThresholds,
  DeviceType,
  ExerciseMode,
  FingerId,
  FingersConfig,
  KeyEvaluation,
  KeyEventPayload,
  KeyStatRecord,
  LevelConfig,
  SessionSummary,
  SublevelConfig,
} from '@contracts/domain';
import { resolveFingerForChar } from './keyboard';

export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Genera la seqüència d'un subnivell (amb paraules separades per Espai) a partir d'una llavor.
 */
export function createSublevelSequence(
  level: LevelConfig,
  sublevel: SublevelConfig,
  seed: number
): string {
  const rng = createSeededRng(seed);
  const newKeys = level.newKeys.length > 0 ? level.newKeys : ['f', 'j'];
  const reviewKeys = sublevel.includeReviewKeys ? (level.reviewKeys ?? []) : [];

  // Pantalla 1: Parelles sistemàtiques de les 2 tecles noves (ex: ff jj fj jf)
  if (sublevel.stepType === 'isolated_pairs' && newKeys.length >= 2) {
    const k1 = newKeys[0]!;
    const k2 = newKeys[1]!;
    const canonicalPairs = [`${k1}${k1}`, `${k2}${k2}`, `${k1}${k2}`, `${k2}${k1}`];
    const words: string[] = [];
    for (let i = 0; i < sublevel.wordsCount; i++) {
      if (i < canonicalPairs.length) {
        words.push(canonicalPairs[i]!);
      } else {
        const idx = Math.floor(rng() * canonicalPairs.length);
        words.push(canonicalPairs[idx]!);
      }
    }
    return words.join(' ');
  }

  const [minLen, maxLen] = sublevel.wordLengthRange;
  const words: string[] = [];

  for (let w = 0; w < sublevel.wordsCount; w++) {
    const wordLen = minLen + Math.floor(rng() * (maxLen - minLen + 1));
    const chars: string[] = [];
    let prev = '';
    let sameRun = 0;

    for (let c = 0; c < wordLen; c++) {
      const useNew = reviewKeys.length === 0 || rng() < 0.65;
      const pool = useNew ? newKeys : reviewKeys;
      let chosen = pool[Math.floor(rng() * pool.length)]!;

      if (pool.length > 1 && chosen === prev && sameRun >= 2) {
        const alt = pool.filter((k) => k !== prev);
        chosen = alt[Math.floor(rng() * alt.length)]!;
      }
      sameRun = chosen === prev ? sameRun + 1 : 1;
      prev = chosen;
      chars.push(chosen);
    }

    words.push(chars.join(''));
  }

  return words.join(' ');
}

/**
 * Genera una seqüència reproduïble per al nivell (si s'invoca sense sublevel explícit,
 * genera blocs separats per espai o manté compatibilitat amb tests existents).
 */
export function createSeededSequence(
  level: LevelConfig,
  seed: number,
  sublevel?: SublevelConfig
): string {
  if (sublevel) {
    return createSublevelSequence(level, sublevel, seed);
  }

  const rng = createSeededRng(seed);
  const targetLen = Math.max(1, level.targetLengthChars);

  if (
    (level.exerciseType === 'real_words' || level.exerciseType === 'short_sentences') &&
    level.allowedWords &&
    level.allowedWords.length > 0
  ) {
    const words: string[] = [];
    let currentLen = 0;
    while (currentLen < targetLen) {
      const idx = Math.floor(rng() * level.allowedWords.length);
      const w = level.allowedWords[idx]!;
      words.push(w);
      currentLen += w.length + 1;
    }
    return words.join(' ').slice(0, targetLen).trimEnd();
  }

  const newKeys = level.newKeys.length > 0 ? level.newKeys : ['f', 'j'];
  const reviewKeys = level.reviewKeys ?? [];
  const sequence: string[] = [];
  let prevChar = '';
  let sameCharRun = 0;

  for (let i = 0; i < targetLen; i++) {
    const useNewPool = reviewKeys.length === 0 || rng() < 0.7;
    const pool = (useNewPool ? newKeys : reviewKeys).filter((k) => k !== ' ');
    const effectivePool = pool.length > 0 ? pool : newKeys;

    let chosen = effectivePool[Math.floor(rng() * effectivePool.length)]!;

    if (effectivePool.length > 1 && chosen === prevChar && sameCharRun >= 2) {
      const alternatives = effectivePool.filter((c) => c !== prevChar);
      chosen = alternatives[Math.floor(rng() * alternatives.length)]!;
    }

    if (chosen === prevChar) {
      sameCharRun++;
    } else {
      prevChar = chosen;
      sameCharRun = 1;
    }

    sequence.push(chosen);
  }

  return sequence.join('');
}

export function computeStars(
  accuracy: number,
  thresholds: LevelConfig['passCriteria']['starsThresholds']
): 0 | 1 | 2 | 3 {
  if (accuracy >= thresholds.threeStars) return 3;
  if (accuracy >= thresholds.twoStars) return 2;
  if (accuracy >= thresholds.oneStar) return 1;
  return 0;
}

const DEFAULT_BARRETINES_THRESHOLDS: BarretinesThresholds = {
  one: 0.70,
  two: 0.80,
  three: 0.88,
  four: 0.94,
  five: 0.98,
};

/**
 * Calcula de 0 a 5 Barretines segons la precisió (RF-13, Versió 0.3).
 * Amb >= 88% s'obtenen 3 Barretines (el mínim per desbloquejar la següent pantalla).
 */
export function computeBarretines(
  accuracy: number,
  thresholds: BarretinesThresholds = DEFAULT_BARRETINES_THRESHOLDS,
  completed = true
): BarretinesCount {
  if (!completed) return 0;
  if (accuracy >= thresholds.five) return 5;
  if (accuracy >= thresholds.four) return 4;
  if (accuracy >= thresholds.three) return 3;
  if (accuracy >= thresholds.two) return 2;
  return 1;
}

export class ExerciseSession {
  private readonly level: LevelConfig;
  private readonly sublevel?: SublevelConfig;
  private readonly fingersConfig: FingersConfig;
  private readonly sequence: string;
  private cursor = 0;
  private readonly evaluations: KeyEvaluation[] = [];

  constructor(
    level: LevelConfig,
    fingersConfig: FingersConfig,
    seed: number,
    options?: { sublevel?: SublevelConfig; customText?: string }
  ) {
    this.level = level;
    this.sublevel = options?.sublevel;
    this.fingersConfig = fingersConfig;
    this.sequence =
      options?.customText ?? createSeededSequence(level, seed, options?.sublevel);
  }

  getSequence(): string {
    return this.sequence;
  }

  getCursorIndex(): number {
    return this.cursor;
  }

  getEvaluations(): readonly KeyEvaluation[] {
    return this.evaluations;
  }

  nextExpectedChar(): string | null {
    if (this.cursor >= this.sequence.length) {
      return null;
    }
    return this.sequence[this.cursor]!;
  }

  isCompleted(): boolean {
    return this.cursor >= this.sequence.length;
  }

  evaluate(event: KeyEventPayload): KeyEvaluation {
    if (this.isCompleted()) {
      throw new Error("L'exercici ja ha finalitzat");
    }

    const expected = this.sequence[this.cursor]!;
    const resolved = resolveFingerForChar(expected, this.fingersConfig);
    const expectedFinger: FingerId = resolved?.finger ?? event.finger;
    const correct = event.typed === expected;

    const evaluation: KeyEvaluation = {
      index: this.cursor,
      expected,
      typed: event.typed,
      code: resolved?.code ?? event.code,
      expectedFinger,
      correct,
      latencyMs: Math.max(0, Math.round(event.t)),
    };

    this.evaluations.push(evaluation);
    this.cursor++;

    return evaluation;
  }

  summary(meta: {
    sessionId: string;
    startedAtIso: string;
    durationSeconds: number;
    mode?: ExerciseMode;
    deviceType?: DeviceType;
    appVersion?: string;
    sublevelId?: string;
  }): SessionSummary {
    const charsTotal = this.evaluations.length;
    const errorsTotal = this.evaluations.filter((e) => !e.correct).length;
    const correctCount = charsTotal - errorsTotal;
    const accuracy = charsTotal > 0 ? Number((correctCount / charsTotal).toFixed(4)) : 0;

    const durationMin = Math.max(1 / 60, meta.durationSeconds / 60);
    const wpm = Number((charsTotal / 5 / durationMin).toFixed(1));
    const completed = this.isCompleted();
    const stars = completed ? computeStars(accuracy, this.level.passCriteria.starsThresholds) : 0;
    const barretines = computeBarretines(
      accuracy,
      this.level.passCriteria.barretinesThresholds,
      completed
    );

    const statsByKey = new Map<
      string,
      { finger: FingerId; presses: number; errors: number; totalLatency: number }
    >();

    for (const ev of this.evaluations) {
      const prev = statsByKey.get(ev.code) ?? {
        finger: ev.expectedFinger,
        presses: 0,
        errors: 0,
        totalLatency: 0,
      };
      prev.presses += 1;
      if (!ev.correct) prev.errors += 1;
      prev.totalLatency += ev.latencyMs;
      statsByKey.set(ev.code, prev);
    }

    const keyStats: KeyStatRecord[] = Array.from(statsByKey.entries()).map(([key_code, data]) => ({
      key_code,
      finger: data.finger,
      presses: data.presses,
      errors: data.errors,
      avg_latency_ms: Math.round(data.totalLatency / data.presses),
    }));

    return {
      session_id: meta.sessionId,
      level_id: this.level.id,
      sublevel_id: meta.sublevelId ?? this.sublevel?.id,
      started_at: meta.startedAtIso,
      duration_s: Math.max(1, Math.round(meta.durationSeconds)),
      mode: meta.mode ?? 'practice',
      chars_total: charsTotal,
      errors_total: errorsTotal,
      accuracy,
      wpm,
      stars,
      barretines,
      completed,
      device_type: meta.deviceType ?? 'chromebook',
      app_version: meta.appVersion ?? '0.3.0',
      key_stats: keyStats,
    };
  }
}
