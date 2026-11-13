/**
 * Contractes de domini compartits entre tots els mòduls (M1..M9).
 * REGLE DE TREBALL (Ap. 12): Aquest fitxer només es modifica amb revisió del responsable.
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
  | 'isolated_keys'   // (a) tecles aïllades
  | 'combinations'    // (b) combinacions i pseudoparaules
  | 'real_words'      // (c) paraules reals en català
  | 'short_sentences' // (d) frases curtes
  | 'minigame';       // (e) minijoc

export type ExerciseMode = 'practice' | 'evaluation' | 'minigame' | 'preview';

export type DeviceType = 'chromebook' | 'desktop' | 'unknown';

/**
 * Configuració d'un dit a fingers.json (RF-11)
 */
export interface FingerMeta {
  id: FingerId;
  hand: HandSide;
  labelCa: string;
  colorHex: string;
  patternId: string; // Per a accessibilitat sense dependre només del color (Ap. 5)
}

/**
 * Mapatge d'una tecla física (event.code) al teclat català (ISO-ES/CA)
 */
export interface KeyMapping {
  code: string;         // Ex: "KeyF", "KeyJ", "Semicolon", "Backslash"
  label: string;        // Etiqueta visual principal al teclat (ex: "F", "J", "Ç")
  charNormal: string;   // Caràcter sense modificadors (ex: "f", "j", "ç")
  charShift?: string;   // Caràcter amb Shift (ex: "F", "J", "Ç")
  charAltGr?: string;   // Caràcter amb AltGr si s'escau
  finger: FingerId;     // Dit assignat
  row: 'top' | 'home' | 'bottom' | 'space';
  isHomeKey?: boolean;  // Posició de repòs (A, S, D, F / J, K, L, Semicolon/Ç)
}

export interface FingersConfig {
  schemaVersion: string;
  layoutName: string;
  fingers: Record<FingerId, FingerMeta>;
  keys: Record<string, KeyMapping>;
}

/**
 * Configuració d'ajudes visuals i sonores per nivell o alumne (RF-10, RF-12)
 */
export interface AidsConfig {
  showKeyboard: boolean;
  showHands: boolean;
  highlightTargetKey: boolean;
  highlightFingerColor: boolean;
  soundEnabled: boolean;
}

/**
 * Criteri de superació d'un nivell (RF-13, RF-14)
 */
export interface PassCriteria {
  minAccuracy: number;       // Ex: 0.95 (95%)
  requiredSessions: number;  // Ex: 3 sessions amb precisió >= minAccuracy
  starsThresholds: {
    oneStar: number;         // Ex: 0.80
    twoStars: number;        // Ex: 0.90
    threeStars: number;      // Ex: 0.95
  };
  scoreSpeed: boolean;       // false als primers nivells (RF-13)
}

/**
 * Definició d'un nivell a levels.json (RF-04, RF-05)
 */
export interface LevelConfig {
  id: string;                // Ex: "L01"
  order: number;             // 1, 2, ...
  titleCa: string;           // Ex: "Nivell 1: Índexs en posició base (F i J)"
  descriptionCa: string;     // Objectiu pedagògic
  newKeys: string[];         // Caràcters nous introduïts (ex: ["f", "j"])
  reviewKeys: string[];      // Caràcters ja apresos que es combinen
  exerciseType: ExerciseType;
  targetLengthChars: number; // Longitud de l'exercici (ex: 60 pulsacions)
  allowedWords?: string[];   // Opcional: subconjunt de paraules o patrons del nivell
  defaultAids: AidsConfig;
  passCriteria: PassCriteria;
  unlockBadgeId?: string;    // Insígnia que desbloqueja en superar-se (RF-15)
}

export interface LevelsFile {
  schemaVersion: string;
  levels: LevelConfig[];
}

/**
 * Esdeveniment emès per M1 (Teclat) i consumit per M2 (Motor d'exercicis)
 */
export interface KeyEventPayload {
  expected: string;          // Caràcter esperat (ex: "f")
  typed: string;             // Caràcter produït (event.key)
  code: string;              // Tecla física (event.code, ex: "KeyF")
  finger: FingerId;          // Dit esperat per a la tecla esperada
  t: number;                 // Timestamp relatiu o latència en ms des de l'estímul
}

/**
 * Resultat d'avaluar una pulsació a M2 (RF-08, RF-09)
 */
export interface KeyEvaluation {
  index: number;
  expected: string;
  typed: string;
  code: string;
  expectedFinger: FingerId;
  correct: boolean;
  latencyMs: number;
}

/**
 * Estadístiques agregades per tecla i dit d'una sessió (RF-19, Ap. 7)
 */
export interface KeyStatRecord {
  key_code: string;          // Ex: "KeyF"
  finger: FingerId;          // Ex: "L-index"
  presses: number;
  errors: number;
  avg_latency_ms: number;
}

/**
 * Resum de sessió enviat al final d'un exercici (RF-18, Ap. 7 i 8)
 */
export interface SessionSummary {
  session_id: string;        // UUID v4 per garantir idempotència
  level_id: string;          // Ex: "L01"
  started_at: string;        // ISO 8601 UTC
  duration_s: number;
  mode: ExerciseMode;
  chars_total: number;
  errors_total: number;
  accuracy: number;          // 0..1 (ex: 0.95)
  wpm: number;               // Paraules per minut (1 paraula = 5 caràcters)
  stars: 0 | 1 | 2 | 3;
  completed: boolean;
  device_type: DeviceType;
  app_version: string;
  key_stats: KeyStatRecord[];
}

/**
 * Estat de progrés d'un alumne en un nivell (Full Progress, Ap. 7)
 */
export type LevelProgressStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';

export interface LevelProgressRecord {
  student_id: string;
  level_id: string;
  status: LevelProgressStatus;
  best_accuracy: number;
  best_stars: 0 | 1 | 2 | 3;
  qualifying_sessions_count: number; // Sessions amb accuracy >= minAccuracy
  sessions_count: number;
  first_completed_at?: string;
}

/**
 * Preferències d'accessibilitat i ritme per alumne (Ap. 5, T3.5)
 */
export interface StudentSettings {
  fontSizeScale: 1 | 1.25 | 1.5;
  highContrast: boolean;
  dyslexiaFriendlyFont: boolean;
  reducedMotion: boolean;
  soundEnabled: boolean;
  aidsOverride?: Partial<AidsConfig>;
}
