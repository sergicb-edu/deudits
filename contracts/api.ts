/**
 * Contractes de l'API entre Client (M5/M7) i Servidor Google Apps Script (M6).
 * Totes les respostes retornen ApiResponse<T> = { ok: boolean, data?: T, error?: ApiError } (Ap. 8).
 */

import type {
  FingersConfig,
  KeyStatRecord,
  LevelProgressRecord,
  LevelsFile,
  SessionSummary,
  StudentSettings,
  UserRole,
} from './domain';

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'QUOTA_MAX_ACTIVE_STUDENTS'
  | 'QUOTA_MAX_SAVES_PER_DAY'
  | 'LOCK_TIMEOUT'
  | 'INTERNAL_ERROR';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: ApiError;
}

/**
 * Resposta de getProfile() (Ap. 8)
 */
export interface UserProfile {
  role: UserRole;
  student_id?: string;        // Pseudònim (ex: "A01"), només si és alumne o mode prova
  group?: string;
  current_level: string;      // Ex: "L01"
  settings: StudentSettings;
  is_preview_mode: boolean;   // true quan el tutor entra amb ?vista=alumne (RF-27)
}

/**
 * Resposta de getLevels() (Ap. 8)
 */
export interface LevelsBundle {
  levelsFile: LevelsFile;
  fingersConfig: FingersConfig;
}

/**
 * Resposta combinada d'arrencada ràpida (Proposta 3: càrrega inicial < 5s en 1 sola crida)
 */
export interface BootstrapData {
  profile: UserProfile;
  progress: StudentProgressSummary;
  levelsBundle: LevelsBundle;
}

/**
 * Resposta de saveSession() (Ap. 8)
 */
export interface SaveSessionResult {
  session_id: string;
  deduplicated: boolean;      // true si el session_id ja existia (idempotència)
  updated_progress: LevelProgressRecord;
  unlocked_next_level_id?: string;
}

/**
 * Resposta de getMyProgress() per a l'alumne (Ap. 8)
 */
export interface StudentProgressSummary {
  student_id: string;
  current_level: string;
  levels: Record<string, LevelProgressRecord>;
  unlocked_badges: string[];
  total_sessions: number;
}

/**
 * Filtre temporal per a consultes del docent
 */
export interface DateRangeFilter {
  fromIso?: string;
  toIso?: string;
}

/**
 * Resposta de getStudentProgress(student_id, range) per al docent (RF-21, Ap. 8)
 */
export interface TeacherStudentReport {
  student_id: string;
  group: string;
  current_level: string;
  active: boolean;
  settings: StudentSettings;
  progress: LevelProgressRecord[];
  sessions: SessionSummary[];
  key_heatmap: KeyStatRecord[];
}

/**
 * Resum d'un alumne dins la vista de grup (RF-22)
 */
export interface GroupStudentRow {
  student_id: string;
  group: string;
  current_level: string;
  active: boolean;
  total_sessions: number;
  total_duration_s: number;
  avg_accuracy: number;
  last_session_at?: string;
  inactive_alert: boolean;    // true si fa dies que no practica
}

/**
 * Avisos d'instància per al tutor (RF-30)
 */
export interface InstanceQuotaStatus {
  active_students_count: number;
  max_active_students: number;
  saves_today_count: number;
  max_saves_per_day: number;
  limit_reached_warning?: string;
}

/**
 * Resposta de getGroupSummary(group, range) (Ap. 8)
 */
export interface GroupSummaryReport {
  group: string;
  students: GroupStudentRow[];
  quota: InstanceQuotaStatus;
}

/**
 * Peticions d'administració d'alumnes (RF-26)
 */
export interface UpsertStudentInput {
  student_id: string;         // Ex: "A01" (pseudònim; cap nom real al full)
  email: string;              // Correu del domini educatiu
  group: string;
  current_level: string;
  active: boolean;
  settings?: Partial<StudentSettings>;
}

export interface ExportReportResult {
  filename: string;
  mimeType: 'text/csv' | 'application/pdf';
  contentBase64OrText: string;
}

/**
 * Interfície completa del Client API (implementada per GoogleScriptRunClient i LocalMockClient, T0.5)
 */
export interface MecanoApiClient {
  getBootstrapData(): Promise<ApiResponse<BootstrapData>>;
  getProfile(): Promise<ApiResponse<UserProfile>>;
  getLevels(): Promise<ApiResponse<LevelsBundle>>;
  saveSession(session: SessionSummary): Promise<ApiResponse<SaveSessionResult>>;
  getMyProgress(): Promise<ApiResponse<StudentProgressSummary>>;

  // Endpoints exclusius de docent (tutor / support_teacher)
  getStudentProgress(
    studentId: string,
    range?: DateRangeFilter
  ): Promise<ApiResponse<TeacherStudentReport>>;
  getGroupSummary(
    group?: string,
    range?: DateRangeFilter
  ): Promise<ApiResponse<GroupSummaryReport>>;
  setStudentLevel(
    studentId: string,
    levelId: string
  ): Promise<ApiResponse<LevelProgressRecord>>;
  upsertStudent(input: UpsertStudentInput): Promise<ApiResponse<GroupStudentRow>>;
  exportReport(
    studentId: string,
    range: DateRangeFilter,
    format: 'csv' | 'pdf'
  ): Promise<ApiResponse<ExportReportResult>>;
}
