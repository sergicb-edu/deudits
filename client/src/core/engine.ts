/**
 * M2 — Motor d'exercicis i avaluació amb llavor (RF-04..RF-09, RF-13, RF-18, RF-19).
 * Lògica pura sense cap dependència del DOM.
 */

import type {
  DeviceType,
  ExerciseMode,
  FingerId,
  FingersConfig,
  KeyEvaluation,
  KeyEventPayload,
  KeyStatRecord,
  LevelConfig,
  SessionSummary,
} from '@contracts/domain';
import { resolveFingerForChar } from './keyboard';

/**
 * Generador pseudoaleatori determinista Mulberry32 basat en una llavor entera (RF-07).
 */
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
 * Genera la seqüència d'exercici reproduïble a partir del LevelConfig i d'una llavor (RF-06, RF-07).
 */
export function createSeededSequence(level: LevelConfig, seed: number): string {
  const rng = createSeededRng(seed);
  const targetLen = Math.max(1, level.targetLengthChars);

  // Si el nivell és de paraules o frases i té llista pròpia
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

  // Pool de tecles amb més pes per a les tecles noves (70% noves, 30% repàs)
  const newKeys = level.newKeys.length > 0 ? level.newKeys : ['f', 'j'];
  const reviewKeys = level.reviewKeys ?? [];

  const sequence: string[] = [];
  let prevChar = '';
  let sameCharRun = 0;

  for (let i = 0; i < targetLen; i++) {
    // En combinacions amb espai o longitud > 6, podem inserir espais si l'espai és a les tecles apreses
    const poolHasSpace = newKeys.includes(' ') || reviewKeys.includes(' ');
    if (poolHasSpace && i > 0 && i < targetLen - 1 && i % 5 === 4 && sequence[i - 1] !== ' ') {
      sequence.push(' ');
      prevChar = ' ';
      sameCharRun = 0;
      continue;
    }

    const useNewPool = reviewKeys.length === 0 || rng() < 0.7;
    const pool = (useNewPool ? newKeys : reviewKeys).filter((k) => k !== ' ');
    const effectivePool = pool.length > 0 ? pool : newKeys;

    let chosen = effectivePool[Math.floor(rng() * effectivePool.length)]!;

    // Evitem més de 2 repeticions seguides de la mateixa tecla per afavorir l'alternança de dits/mans
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

/**
 * Calcula el nombre d'estrelles segons la precisió (RF-13).
 */
export function computeStars(
  accuracy: number,
  thresholds: LevelConfig['passCriteria']['starsThresholds']
): 0 | 1 | 2 | 3 {
  if (accuracy >= thresholds.threeStars) return 3;
  if (accuracy >= thresholds.twoStars) return 2;
  if (accuracy >= thresholds.oneStar) return 1;
  return 0;
}

/**
 * Sessió d'exercici activa que gestiona el cursor, avalua cada pulsació sense bloquejar (RF-09)
 * i calcula el resum i estadístiques per tecla i dit (RF-18, RF-19).
 */
export class ExerciseSession {
  private readonly level: LevelConfig;
  private readonly fingersConfig: FingersConfig;
  private readonly sequence: string;
  private cursor = 0;
  private readonly evaluations: KeyEvaluation[] = [];

  constructor(level: LevelConfig, fingersConfig: FingersConfig, seed: number) {
    this.level = level;
    this.fingersConfig = fingersConfig;
    this.sequence = createSeededSequence(level, seed);
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

  /**
   * Avalua una pulsació (RF-08) i avança sempre al caràcter següent sense bloquejar l'alumne (RF-09).
   */
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

  /**
   * Construeix el resum final de la sessió (RF-18, RF-19, Ap. 8).
   */
  summary(meta: {
    sessionId: string;
    startedAtIso: string;
    durationSeconds: number;
    mode?: ExerciseMode;
    deviceType?: DeviceType;
    appVersion?: string;
  }): SessionSummary {
    const charsTotal = this.evaluations.length;
    const errorsTotal = this.evaluations.filter((e) => !e.correct).length;
    const correctCount = charsTotal - errorsTotal;
    const accuracy = charsTotal > 0 ? Number((correctCount / charsTotal).toFixed(4)) : 0;

    const durationMin = Math.max(1 / 60, meta.durationSeconds / 60);
    const wpm = Number((charsTotal / 5 / durationMin).toFixed(1));
    const completed = this.isCompleted();
    const stars = completed ? computeStars(accuracy, this.level.passCriteria.starsThresholds) : 0;

    // Agregació de mètriques per tecla i dit (RF-19)
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
      started_at: meta.startedAtIso,
      duration_s: Math.max(1, Math.round(meta.durationSeconds)),
      mode: meta.mode ?? 'practice',
      chars_total: charsTotal,
      errors_total: errorsTotal,
      accuracy,
      wpm,
      stars,
      completed,
      device_type: meta.deviceType ?? 'chromebook',
      app_version: meta.appVersion ?? '0.1.0',
      key_stats: keyStats,
    };
  }
}
