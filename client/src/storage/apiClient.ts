/**
 * T0.5 — Adaptador d'API amb dues implementacions:
 * 1) GoogleScriptRunClient: crida l'entorn real de Google Apps Script (window.google.script.run)
 * 2) LocalMockClient: funciona 100% en local amb dades d'exemple i persistència a memòria/localStorage
 */

import type {
  ApiResponse,
  BootstrapData,
  DateRangeFilter,
  ExportReportResult,
  GroupStudentRow,
  GroupSummaryReport,
  LevelsBundle,
  MecanoApiClient,
  SaveSessionResult,
  StudentProgressSummary,
  TeacherStudentReport,
  UpsertStudentInput,
  UserProfile,
} from '@contracts/api';
import type {
  FingersConfig,
  LevelProgressRecord,
  LevelsFile,
  SessionSummary,
  StudentSettings,
} from '@contracts/domain';
import { validateSessionSummary } from '@contracts/validators';
import levelsData from '@content/levels.json';
import fingersData from '@content/fingers.json';

const DEFAULT_SETTINGS: StudentSettings = {
  fontSizeScale: 1,
  highContrast: false,
  dyslexiaFriendlyFont: false,
  reducedMotion: false,
  soundEnabled: false,
};

/**
 * Implementació Mock Local per desenvolupar i provar sense backend (T0.5)
 */
export class LocalMockApiClient implements MecanoApiClient {
  private sessions = new Map<string, SessionSummary>();
  private progressByStudent = new Map<string, Record<string, LevelProgressRecord>>();
  private currentProfile: UserProfile;

  constructor(initialRole: 'student' | 'tutor' = 'student', previewMode = false) {
    this.currentProfile = {
      role: initialRole,
      student_id: initialRole === 'student' || previewMode ? 'A01' : undefined,
      group: 'Primària-4A',
      current_level: 'L01',
      settings: { ...DEFAULT_SETTINGS },
      is_preview_mode: previewMode,
    };

    // Inicialitza progrés d'exemple per a A01
    this.progressByStudent.set('A01', {
      L01: {
        student_id: 'A01',
        level_id: 'L01',
        status: 'unlocked',
        best_accuracy: 0,
        best_stars: 0,
        qualifying_sessions_count: 0,
        sessions_count: 0,
      },
    });
  }

  async getBootstrapData(): Promise<ApiResponse<BootstrapData>> {
    const [profileRes, progressRes, levelsRes] = await Promise.all([
      this.getProfile(),
      this.getMyProgress(),
      this.getLevels(),
    ]);
    if (!profileRes.ok || !profileRes.data) {
      return { ok: false, error: profileRes.error };
    }
    return {
      ok: true,
      data: {
        profile: profileRes.data,
        progress: progressRes.data!,
        levelsBundle: levelsRes.data!,
      },
    };
  }

  async getProfile(): Promise<ApiResponse<UserProfile>> {
    return { ok: true, data: { ...this.currentProfile } };
  }

  async getLevels(): Promise<ApiResponse<LevelsBundle>> {
    return {
      ok: true,
      data: {
        levelsFile: levelsData as unknown as LevelsFile,
        fingersConfig: fingersData as unknown as FingersConfig,
      },
    };
  }

  async saveSession(session: SessionSummary): Promise<ApiResponse<SaveSessionResult>> {
    const validation = validateSessionSummary(session);
    if (!validation.valid) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.errors.join('; '),
        },
      };
    }

    const studentId = this.currentProfile.student_id ?? 'A01';
    const studentMap = this.progressByStudent.get(studentId) ?? {};
    const levels = (levelsData as unknown as LevelsFile).levels;
    const levelCfg = levels.find((l) => l.id === session.level_id);

    if (!levelCfg) {
      return {
        ok: false,
        error: { code: 'NOT_FOUND', message: `Nivell desconegut: ${session.level_id}` },
      };
    }

    // Idempotència per session_id (RF-18, RF-20, T2.2)
    if (this.sessions.has(session.session_id)) {
      const existingProgress = studentMap[session.level_id]!;
      return {
        ok: true,
        data: {
          session_id: session.session_id,
          deduplicated: true,
          updated_progress: existingProgress,
        },
      };
    }

    // Si el tutor està en mode previsualització (?vista=alumne), no es desa res (RF-27)
    if (!this.currentProfile.is_preview_mode) {
      this.sessions.set(session.session_id, session);
    }

    const prev: LevelProgressRecord = studentMap[session.level_id] ?? {
      student_id: studentId,
      level_id: session.level_id,
      status: 'in_progress',
      best_accuracy: 0,
      best_stars: 0,
      qualifying_sessions_count: 0,
      sessions_count: 0,
    };

    const qualifies =
      session.completed && session.accuracy >= levelCfg.passCriteria.minAccuracy;
    const newQualifyingCount = prev.qualifying_sessions_count + (qualifies ? 1 : 0);
    const isNowCompleted =
      prev.status === 'completed' ||
      newQualifyingCount >= levelCfg.passCriteria.requiredSessions;

    const updated: LevelProgressRecord = {
      student_id: studentId,
      level_id: session.level_id,
      status: isNowCompleted ? 'completed' : 'in_progress',
      best_accuracy: Math.max(prev.best_accuracy, session.accuracy),
      best_stars: Math.max(prev.best_stars, session.stars) as 0 | 1 | 2 | 3,
      qualifying_sessions_count: newQualifyingCount,
      sessions_count: prev.sessions_count + 1,
      first_completed_at:
        prev.first_completed_at ?? (isNowCompleted ? new Date().toISOString() : undefined),
    };

    let unlockedNextLevelId: string | undefined;
    if (!this.currentProfile.is_preview_mode) {
      studentMap[session.level_id] = updated;
      if (isNowCompleted) {
        const nextLevel = levels.find((l) => l.order === levelCfg.order + 1);
        if (nextLevel && !studentMap[nextLevel.id]) {
          unlockedNextLevelId = nextLevel.id;
          studentMap[nextLevel.id] = {
            student_id: studentId,
            level_id: nextLevel.id,
            status: 'unlocked',
            best_accuracy: 0,
            best_stars: 0,
            qualifying_sessions_count: 0,
            sessions_count: 0,
          };
          this.currentProfile.current_level = nextLevel.id;
        }
      }
      this.progressByStudent.set(studentId, studentMap);
    }

    return {
      ok: true,
      data: {
        session_id: session.session_id,
        deduplicated: false,
        updated_progress: updated,
        unlocked_next_level_id: unlockedNextLevelId,
      },
    };
  }

  async getMyProgress(): Promise<ApiResponse<StudentProgressSummary>> {
    const studentId = this.currentProfile.student_id ?? 'A01';
    const levelsMap = this.progressByStudent.get(studentId) ?? {};
    const levels = (levelsData as unknown as LevelsFile).levels;
    const unlockedBadges: string[] = [];

    for (const lvl of levels) {
      if (levelsMap[lvl.id]?.status === 'completed' && lvl.unlockBadgeId) {
        unlockedBadges.push(lvl.unlockBadgeId);
      }
    }

    return {
      ok: true,
      data: {
        student_id: studentId,
        current_level: this.currentProfile.current_level,
        levels: { ...levelsMap },
        unlocked_badges: unlockedBadges,
        total_sessions: this.sessions.size,
      },
    };
  }

  async getStudentProgress(
    studentId: string,
    _range?: DateRangeFilter
  ): Promise<ApiResponse<TeacherStudentReport>> {
    if (this.currentProfile.role !== 'tutor' && this.currentProfile.role !== 'support_teacher') {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Accés reservat a docents' } };
    }
    const studentMap = this.progressByStudent.get(studentId) ?? {};
    const allSessions = Array.from(this.sessions.values());
    return {
      ok: true,
      data: {
        student_id: studentId,
        group: 'Primària-4A',
        current_level: this.currentProfile.current_level,
        active: true,
        settings: { ...DEFAULT_SETTINGS },
        progress: Object.values(studentMap),
        sessions: allSessions,
        key_heatmap: [],
      },
    };
  }

  async getGroupSummary(
    group = 'Primària-4A',
    _range?: DateRangeFilter
  ): Promise<ApiResponse<GroupSummaryReport>> {
    if (this.currentProfile.role !== 'tutor' && this.currentProfile.role !== 'support_teacher') {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Accés reservat a docents' } };
    }
    return {
      ok: true,
      data: {
        group,
        students: [
          {
            student_id: 'A01',
            group,
            current_level: this.currentProfile.current_level,
            active: true,
            total_sessions: this.sessions.size,
            total_duration_s: Array.from(this.sessions.values()).reduce(
              (acc, s) => acc + s.duration_s,
              0
            ),
            avg_accuracy: 0.96,
            inactive_alert: false,
          },
        ],
        quota: {
          active_students_count: 1,
          max_active_students: 30,
          saves_today_count: this.sessions.size,
          max_saves_per_day: 500,
        },
      },
    };
  }

  async setStudentLevel(
    studentId: string,
    levelId: string
  ): Promise<ApiResponse<LevelProgressRecord>> {
    if (this.currentProfile.role !== 'tutor') {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Només el tutor pot fixar el nivell' } };
    }
    const studentMap = this.progressByStudent.get(studentId) ?? {};
    const record: LevelProgressRecord = studentMap[levelId] ?? {
      student_id: studentId,
      level_id: levelId,
      status: 'unlocked',
      best_accuracy: 0,
      best_stars: 0,
      qualifying_sessions_count: 0,
      sessions_count: 0,
    };
    record.status = 'unlocked';
    studentMap[levelId] = record;
    this.progressByStudent.set(studentId, studentMap);
    this.currentProfile.current_level = levelId;
    return { ok: true, data: record };
  }

  async upsertStudent(input: UpsertStudentInput): Promise<ApiResponse<GroupStudentRow>> {
    if (this.currentProfile.role !== 'tutor') {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Només el tutor pot gestionar alumnes' } };
    }
    return {
      ok: true,
      data: {
        student_id: input.student_id,
        group: input.group,
        current_level: input.current_level,
        active: input.active,
        total_sessions: 0,
        total_duration_s: 0,
        avg_accuracy: 0,
        inactive_alert: false,
      },
    };
  }

  async exportReport(
    studentId: string,
    _range: DateRangeFilter,
    format: 'csv' | 'pdf'
  ): Promise<ApiResponse<ExportReportResult>> {
    if (this.currentProfile.role !== 'tutor' && this.currentProfile.role !== 'support_teacher') {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Accés reservat a docents' } };
    }
    return {
      ok: true,
      data: {
        filename: `evidencies_${studentId}.${format}`,
        mimeType: format === 'csv' ? 'text/csv' : 'application/pdf',
        contentBase64OrText: 'session_id,level_id,accuracy,wpm,stars\n',
      },
    };
  }
}

/**
 * Implementació per a producció dins de Google Apps Script (window.google.script.run)
 */
export class GoogleAppsScriptApiClient implements MecanoApiClient {
  private callServer<T>(fnName: string, ...args: unknown[]): Promise<ApiResponse<T>> {
    return new Promise((resolve) => {
      const g = (globalThis as unknown as { google?: { script?: { run?: Record<string, unknown> } } })
        .google;
      if (!g?.script?.run) {
        resolve({
          ok: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Entorn google.script.run no disponible',
          },
        });
        return;
      }

      const runner = g.script.run as {
        withSuccessHandler: (cb: (res: ApiResponse<T>) => void) => {
          withFailureHandler: (errCb: (err: Error) => void) => Record<string, (...a: unknown[]) => void>;
        };
      };

      runner
        .withSuccessHandler((response: ApiResponse<T>) => resolve(response))
        .withFailureHandler((error: Error) =>
          resolve({
            ok: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: error?.message ?? 'Error de comunicació amb Apps Script',
            },
          })
        )[fnName](...args);
    });
  }

  getBootstrapData(): Promise<ApiResponse<BootstrapData>> {
    return this.callServer<BootstrapData>('getBootstrapData');
  }
  getProfile(): Promise<ApiResponse<UserProfile>> {
    return this.callServer<UserProfile>('getProfile');
  }
  getLevels(): Promise<ApiResponse<LevelsBundle>> {
    return this.callServer<LevelsBundle>('getLevels');
  }
  saveSession(session: SessionSummary): Promise<ApiResponse<SaveSessionResult>> {
    return this.callServer<SaveSessionResult>('saveSession', session);
  }
  getMyProgress(): Promise<ApiResponse<StudentProgressSummary>> {
    return this.callServer<StudentProgressSummary>('getMyProgress');
  }
  getStudentProgress(
    studentId: string,
    range?: DateRangeFilter
  ): Promise<ApiResponse<TeacherStudentReport>> {
    return this.callServer<TeacherStudentReport>('getStudentProgress', studentId, range);
  }
  getGroupSummary(
    group?: string,
    range?: DateRangeFilter
  ): Promise<ApiResponse<GroupSummaryReport>> {
    return this.callServer<GroupSummaryReport>('getGroupSummary', group, range);
  }
  setStudentLevel(
    studentId: string,
    levelId: string
  ): Promise<ApiResponse<LevelProgressRecord>> {
    return this.callServer<LevelProgressRecord>('setStudentLevel', studentId, levelId);
  }
  upsertStudent(input: UpsertStudentInput): Promise<ApiResponse<GroupStudentRow>> {
    return this.callServer<GroupStudentRow>('upsertStudent', input);
  }
  exportReport(
    studentId: string,
    range: DateRangeFilter,
    format: 'csv' | 'pdf'
  ): Promise<ApiResponse<ExportReportResult>> {
    return this.callServer<ExportReportResult>('exportReport', studentId, range, format);
  }
}

/**
 * Factoria que tria automàticament l'adaptador real (si som a GAS) o el Mock Local.
 */
export function createApiClient(): MecanoApiClient {
  const hasGas =
    typeof globalThis !== 'undefined' &&
    Boolean((globalThis as unknown as { google?: { script?: { run?: unknown } } }).google?.script?.run);
  if (hasGas) {
    return new GoogleAppsScriptApiClient();
  }
  return new LocalMockApiClient();
}
