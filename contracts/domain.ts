/**
 * Contractes de domini compartits entre tots els mòduls (M1..M9).
 * Versió 0.3: Inclou l'estructura de 5 pantalles (subnivells), les 5 Barretines,
 * el fil conductor «En Bit descobreix Catalunya» i el Termòmetre de la Dita Catalana.
 */

export type UserRole = 'student' | 'tutor' | 'support_teacher' | 'admin' | 'unauthorized';

export type FingerId =
  | 'L-pinky'
  | 'L-ring'
  | 'L-middle'
  | 'L-index'
  | 'thumb'
  | 'R-index'
  | 'R-middle'
  | 'R-ring'
  | 'R-pinky';

export type HandSide = 'left' | 'right' | 'both';

export type ExerciseType =
  | 'isolated_keys'   // (a) parelles o grups aïllats de tecles noves + espai
  | 'combinations'    // (b) combinacions i pseudoparaules amb espai
  | 'real_words'      // (c) paraules reals en català
  | 'short_sentences' // (d) frases curtes / dites catalanes
  | 'minigame';       // (e) aventura gamificada amb obstacles

export type SublevelStepType =
  | 'isolated_pairs'   // Pantalla 1: Parelles de les 2 tecles noves + Espai (ex: ff jj fj jf)
  | 'isolated_groups'  // Pantalla 2: Grups de 3-4 de les 2 tecles noves + Espai (ex: fjf jfj fjjf)
  | 'adventure_new'    // Pantalla 3: Joc d'obstacles d'en Bit només amb les tecles noves + Espai
  | 'adventure_mixed'  // Pantalla 4: Joc d'obstacles barrejant tecles noves + anteriors + Espai
  | 'master_proverb';  // Pantalla 5: Repte final del nivell + Termòmetre de la Dita Catalana

export type ExerciseMode = 'practice' | 'adventure' | 'proverb' | 'evaluation' | 'preview';

export type DeviceType = 'chromebook' | 'desktop' | 'unknown';

export type BarretinesCount = 0 | 1 | 2 | 3 | 4 | 5;

export interface FingerMeta {
  id: FingerId;
  hand: HandSide;
  labelCa: string;
  colorHex: string;
  patternId: string;
}

export interface KeyMapping {
  code: string;
  label: string;
  charNormal: string;
  charShift?: string;
  charAltGr?: string;
  finger: FingerId;
  row: 'top' | 'home' | 'bottom' | 'space';
  isHomeKey?: boolean;
}

export interface FingersConfig {
  schemaVersion: string;
  layoutName: string;
  fingers: Record<FingerId, FingerMeta>;
  keys: Record<string, KeyMapping>;
}

export interface AidsConfig {
  showKeyboard: boolean;
  showHands: boolean;
  highlightTargetKey: boolean;
  highlightFingerColor: boolean;
  soundEnabled: boolean;
}

export interface BarretinesThresholds {
  one: number;   // Ex: 0.70
  two: number;   // Ex: 0.80
  three: number; // Ex: 0.88 (mínim per desbloquejar la següent pantalla)
  four: number;  // Ex: 0.94
  five: number;  // Ex: 0.98 (Mestre de les 5 Barretines!)
}

export interface PassCriteria {
  minAccuracy: number;                 // Ex: 0.88 (3 Barretines) o 0.95
  minBarretinesToUnlockNext: number;   // Per defecte: 3 Barretines
  requiredSessions: number;
  starsThresholds: {
    oneStar: number;
    twoStars: number;
    threeStars: number;
  };
  barretinesThresholds?: BarretinesThresholds;
  scoreSpeed: boolean;
}

/**
 * Definició d'una de les 5 pantalles (subnivells) dins d'un nivell (RF-05)
 */
export interface SublevelConfig {
  id: string;                 // Ex: "L01.1", "L01.2", ..., "L01.5"
  screenNumber: 1 | 2 | 3 | 4 | 5;
  titleCa: string;
  subtitleCa: string;
  stepType: SublevelStepType;
  wordLengthRange: [number, number]; // Ex: [2, 2] a P1, [3, 4] a P2
  wordsCount: number;                // Nombre de blocs separats per Espai (ex: 10 blocs)
  includeReviewKeys: boolean;        // false a P1, P2, P3; true a P4, P5
}

/**
 * Ambient cultural català i aventura d'en Bit per a cada nivell (Ap. 1 i 9)
 */
export interface LevelThemeConfig {
  locationCa: string;         // Ex: "Observatori del Montsec", "Plaça de Vilafranca"
  traditionCa: string;        // Ex: "Aterratge espacial", "Diada Castellera"
  missionStoryCa: string;     // Explicació narrativa per a l'alumne
  obstacleNameCa: string;     // Ex: "Meteorit", "Pis del castell", "Compàs de sardana", "Guspira de la Patum"
  actionVerbCa: string;       // Ex: "Desintegrar meteorit", "Aixecar pis del castell"
  themeKey: 'montsec_space' | 'vilafranca_castells' | 'girona_sardana' | 'berga_patum';
  proverbCa: string;          // Dita catalana simplificada per al Termòmetre (ex: "qui dia passa any empeny")
  proverbMeaningCa: string;   // Breu explicació cultural de la dita
  bitAccessoryId: string;     // Complement que guanya en Bit
  bitAccessoryNameCa: string; // Ex: "Faixa Castellera d'en Bit"
}

export interface LevelConfig {
  id: string;
  order: number;
  titleCa: string;
  descriptionCa: string;
  newKeys: string[];
  reviewKeys: string[];
  exerciseType: ExerciseType;
  targetLengthChars: number;
  allowedWords?: string[];
  defaultAids: AidsConfig;
  passCriteria: PassCriteria;
  unlockBadgeId?: string;
  theme?: LevelThemeConfig;
  sublevels?: SublevelConfig[];
}

export interface LevelsFile {
  schemaVersion: string;
  levels: LevelConfig[];
}

export interface KeyEventPayload {
  expected: string;
  typed: string;
  code: string;
  finger: FingerId;
  t: number;
}

export interface KeyEvaluation {
  index: number;
  expected: string;
  typed: string;
  code: string;
  expectedFinger: FingerId;
  correct: boolean;
  latencyMs: number;
}

export interface KeyStatRecord {
  key_code: string;
  finger: FingerId;
  presses: number;
  errors: number;
  avg_latency_ms: number;
}

export interface SessionSummary {
  session_id: string;
  level_id: string;
  sublevel_id?: string;       // Ex: "L01.1" o "L01.proverb"
  started_at: string;
  duration_s: number;
  mode: ExerciseMode;
  chars_total: number;
  errors_total: number;
  accuracy: number;
  wpm: number;
  stars: 0 | 1 | 2 | 3;
  barretines?: BarretinesCount; // 0..5 Barretines (RF-13)
  completed: boolean;
  device_type: DeviceType;
  app_version: string;
  key_stats: KeyStatRecord[];
}

export type LevelProgressStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';

export interface LevelProgressRecord {
  student_id: string;
  level_id: string;
  status: LevelProgressStatus;
  best_accuracy: number;
  best_stars: 0 | 1 | 2 | 3;
  best_barretines?: BarretinesCount;
  sublevels_barretines?: Record<string, BarretinesCount>;
  qualifying_sessions_count: number;
  sessions_count: number;
  first_completed_at?: string;
}

/**
 * Registre d'evolució del Termòmetre de la Dita Catalana (Pas 3 entre nivells)
 */
export interface ProverbBenchmarkRecord {
  level_id: string;
  proverb_text: string;
  wpm: number;
  accuracy: number;
  barretines: BarretinesCount;
  completed_at: string;
}

export interface StudentSettings {
  fontSizeScale: 1 | 1.25 | 1.5;
  highContrast: boolean;
  dyslexiaFriendlyFont: boolean;
  reducedMotion: boolean;
  soundEnabled: boolean;
  aidsOverride?: Partial<AidsConfig>;
}
