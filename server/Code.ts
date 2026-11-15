/**
 * M6 Backend — Google Apps Script + Google Sheets (Fase 2 completa).
 *
 * Implementa:
 * - Auto-provisionament de les 6 pestanyes de Google Sheets:
 *   Config, Alumnes, Sessions, Estadistiques_Tecles, Assoliments, Logs_Tecnics
 * - Control d'accés per rol (requireRole_) i protecció de concurrència (LockService)
 * - Persistència de sessions (Fase 1 Pràctica, Fase 2 Joc 8-bits, Fase 3 Dita Catalana)
 * - Lectura agregada per al Panell Docent (M7: KPIs, Dites Catalanes, Mapa de Calor de tecles, Sessions)
 * - Configuració pedagògica del docent (llindar de precisió, desbloqueig de nivells) i exportació CSV
 */

import type { ApiResponse, UserProfile } from '../contracts/api';
import type { UserRole } from '../contracts/domain';

export const SHEET_TABS = {
  CONFIG: 'Config',
  STUDENTS: 'Alumnes',
  SESSIONS: 'Sessions',
  KEY_STATS: 'Estadistiques_Tecles',
  ACHIEVEMENTS: 'Assoliments',
  TECH_LOGS: 'Logs_Tecnics',
} as const;

export interface TeacherDashboardPayload {
  studentId: string;
  studentEmail: string;
  group: string;
  currentLevel: string;
  totalSessions: number;
  totalMinutes: number;
  avgWpmNet: number;
  avgAccuracyPct: number;
  totalBarretines: number;
  stepBarretines: Record<string, number>;
  proverbHistory: Array<{
    sessionId: string;
    timestampIso: string;
    levelId: string;
    stepLabel: string;
    wpmNet: number;
    accuracyPct: number;
    barretines: number;
  }>;
  keyStats: Record<string, { hits: number; errors: number }>;
  recentSessions: Array<{
    sessionId: string;
    timestampIso: string;
    levelId: string;
    phaseType: 'drill' | 'arcade' | 'proverb';
    stepId: string;
    stepLabel: string;
    wpmNet: number;
    accuracyPct: number;
    errors: number;
    totalPresses: number;
    barretines: number;
    durationSec: number;
  }>;
  pedagogicalConfig: {
    minAccuracyPct: number;
    minBarretinesToUnlock: number;
    unlockedAllLevels: boolean;
    requireProverbPhase: boolean;
  };
}

/**
 * Punt d'entrada de l'aplicació web d'Apps Script (RF-25, RF-27).
 */
export function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.HTML.HtmlOutput {
  ensureSpreadsheetStructure_();
  const identity = resolveCurrentUserIdentity_();
  const requestedView = e?.parameter?.vista || e?.parameter?.view;

  if (identity.role === 'unauthorized') {
    return HtmlService.createHtmlOutput(
      '<!DOCTYPE html><html lang="ca"><head><meta charset="utf-8"><title>Accés no autoritzat</title></head>' +
        '<body style="font-family:sans-serif;padding:2rem;"><h1>Accés denegat</h1>' +
        '<p>El teu compte no té accés a aquesta instància de Mecano.</p></body></html>'
    ).setTitle('Mecano — Accés no autoritzat');
  }

  if (
    (identity.role === 'tutor' || identity.role === 'support_teacher' || identity.role === 'admin') &&
    requestedView !== 'alumne' &&
    requestedView !== 'student'
  ) {
    return HtmlService.createHtmlOutputFromFile('admin')
      .setTitle('Mecano — Panell del Docent')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  }

  return HtmlService.createHtmlOutputFromFile('student')
    .setTitle('Mecano — En Bit descobreix Catalunya')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/**
 * Inicialitza o verifica l'estructura de les 6 pestanyes al llibre de Google Sheets.
 * Es pot executar manualment des de l'editor d'Apps Script o automàticament al primer doGet.
 */
export function setupMecanoSpreadsheet(): ApiResponse<{ createdTabs: string[] }> {
  const createdTabs = ensureSpreadsheetStructure_();
  return { ok: true, data: { createdTabs } };
}

/**
 * Endpoint públic: retorna el perfil de l'usuari autenticat.
 */
export function getProfile(): ApiResponse<UserProfile> {
  const auth = requireRole_(['student', 'tutor', 'support_teacher', 'admin']);
  if (!auth.ok || !auth.identity) {
    return {
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Usuari sense rol autoritzat a aquesta instància' },
    };
  }

  return {
    ok: true,
    data: {
      role: auth.identity.role,
      student_id: auth.identity.studentId,
      group: auth.identity.group,
      current_level: auth.identity.currentLevel ?? 'L01',
      settings: {
        fontSizeScale: 1,
        highContrast: false,
        dyslexiaFriendlyFont: false,
        reducedMotion: false,
        soundEnabled: true,
      },
      is_preview_mode: auth.identity.role !== 'student',
    },
  };
}

/**
 * Desa una sessió completada (Fase 1 Pràctica, Fase 2 Joc 8-Bits o Fase 3 Dita Catalana)
 * a les pestanyes Sessions, Estadistiques_Tecles i Assoliments amb LockService.
 */
export function apiSaveSession(payload: {
  sessionId: string;
  timestampIso: string;
  levelId: string;
  phaseType: 'drill' | 'arcade' | 'proverb';
  stepId: string;
  stepLabel: string;
  wpmNet: number;
  accuracyPct: number;
  errors: number;
  totalPresses: number;
  barretines: number;
  durationSec: number;
  keyStats?: Record<string, { hits: number; errors: number }>;
}): ApiResponse<{ saved: boolean; sessionId: string }> {
  const auth = requireRole_(['student', 'tutor', 'support_teacher', 'admin']);
  if (!auth.ok || !auth.identity) {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'No autoritzat' } };
  }

  const lock = LockService.getDocumentLock();
  try {
    lock.waitLock(10000);
    ensureSpreadsheetStructure_();
    const ss = getSpreadsheet_();
    const studentId = auth.identity.studentId || 'ALU-01';

    // 1. Insereix a Sessions
    const shSessions = ss.getSheetByName(SHEET_TABS.SESSIONS);
    if (shSessions) {
      shSessions.appendRow([
        payload.sessionId,
        payload.timestampIso,
        studentId,
        payload.levelId,
        payload.phaseType,
        payload.stepId,
        payload.stepLabel,
        payload.wpmNet,
        payload.accuracyPct,
        payload.errors,
        payload.totalPresses,
        payload.barretines,
        payload.durationSec,
      ]);
    }

    // 2. Actualitza màxim de Barretines a Assoliments
    const shAch = ss.getSheetByName(SHEET_TABS.ACHIEVEMENTS);
    if (shAch) {
      const rows = shAch.getDataRange().getValues();
      let foundRow = -1;
      let prevBest = 0;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === studentId && rows[i][1] === payload.stepId) {
          foundRow = i + 1;
          prevBest = Number(rows[i][3] || 0);
          break;
        }
      }
      const bestBarretines = Math.max(prevBest, Number(payload.barretines || 0));
      if (foundRow > 0) {
        shAch.getRange(foundRow, 4, 1, 3).setValues([
          [bestBarretines, payload.wpmNet, payload.timestampIso],
        ]);
      } else {
        shAch.appendRow([
          studentId,
          payload.stepId,
          payload.levelId,
          bestBarretines,
          payload.wpmNet,
          payload.timestampIso,
        ]);
      }
    }

    // 3. Actualitza Estadistiques_Tecles
    if (payload.keyStats) {
      const shKeys = ss.getSheetByName(SHEET_TABS.KEY_STATS);
      if (shKeys) {
        const keyRows = shKeys.getDataRange().getValues();
        for (const [keyChar, st] of Object.entries(payload.keyStats)) {
          let rowIdx = -1;
          let prevHits = 0;
          let prevErrs = 0;
          for (let i = 1; i < keyRows.length; i++) {
            if (keyRows[i][0] === studentId && String(keyRows[i][1]) === keyChar) {
              rowIdx = i + 1;
              prevHits = Number(keyRows[i][2] || 0);
              prevErrs = Number(keyRows[i][3] || 0);
              break;
            }
          }
          const newHits = prevHits + Number(st.hits || 0);
          const newErrs = prevErrs + Number(st.errors || 0);
          if (rowIdx > 0) {
            shKeys.getRange(rowIdx, 3, 1, 3).setValues([
              [newHits, newErrs, payload.timestampIso],
            ]);
          } else {
            shKeys.appendRow([studentId, keyChar, newHits, newErrs, payload.timestampIso]);
          }
        }
      }
    }

    return { ok: true, data: { saved: true, sessionId: payload.sessionId } };
  } catch (err) {
    logTechnicalError_('apiSaveSession', String(err));
    return {
      ok: false,
      error: { code: 'STORAGE_ERROR', message: 'Error desant la sessió a Google Sheets' },
    };
  } finally {
    try {
      lock.releaseLock();
    } catch {}
  }
}

/**
 * Endpoint per al Panell del Docent (M7): retorna els KPIs, evolució de Dites Catalanes,
 * Mapa de Calor de Tecles, Historial de Sessions i Configuració Pedagògica.
 */
export function apiGetTeacherDashboard(): ApiResponse<TeacherDashboardPayload> {
  const auth = requireRole_(['tutor', 'support_teacher', 'admin']);
  if (!auth.ok) {
    return {
      ok: false,
      error: { code: 'FORBIDDEN', message: 'Només l’equip docent pot consultar el panell' },
    };
  }

  ensureSpreadsheetStructure_();
  const ss = getSpreadsheet_();

  const shSessions = ss.getSheetByName(SHEET_TABS.SESSIONS);
  const sessionRows = shSessions ? shSessions.getDataRange().getValues().slice(1) : [];

  const recentSessions: TeacherDashboardPayload['recentSessions'] = sessionRows
    .map((r) => ({
      sessionId: String(r[0] || ''),
      timestampIso: String(r[1] || ''),
      levelId: String(r[3] || 'L01'),
      phaseType: (r[4] || 'drill') as 'drill' | 'arcade' | 'proverb',
      stepId: String(r[5] || ''),
      stepLabel: String(r[6] || ''),
      wpmNet: Number(r[7] || 0),
      accuracyPct: Number(r[8] || 100),
      errors: Number(r[9] || 0),
      totalPresses: Number(r[10] || 0),
      barretines: Number(r[11] || 0),
      durationSec: Number(r[12] || 0),
    }))
    .reverse();

  const shAch = ss.getSheetByName(SHEET_TABS.ACHIEVEMENTS);
  const achRows = shAch ? shAch.getDataRange().getValues().slice(1) : [];
  const stepBarretines: Record<string, number> = {};
  for (const r of achRows) {
    const stepId = String(r[1] || '');
    const b = Number(r[3] || 0);
    if (stepId) {
      stepBarretines[stepId] = Math.max(stepBarretines[stepId] || 0, b);
    }
  }

  const shKeys = ss.getSheetByName(SHEET_TABS.KEY_STATS);
  const keyRows = shKeys ? shKeys.getDataRange().getValues().slice(1) : [];
  const keyStats: Record<string, { hits: number; errors: number }> = {};
  for (const r of keyRows) {
    const k = String(r[1] || '');
    if (k) {
      keyStats[k] = {
        hits: Number(r[2] || 0),
        errors: Number(r[3] || 0),
      };
    }
  }

  const totalSessions = recentSessions.length;
  const totalSec = recentSessions.reduce((a, s) => a + s.durationSec, 0);
  const avgWpmNet =
    totalSessions > 0
      ? Number((recentSessions.reduce((a, s) => a + s.wpmNet, 0) / totalSessions).toFixed(1))
      : 0;
  const avgAccuracyPct =
    totalSessions > 0
      ? Math.round(recentSessions.reduce((a, s) => a + s.accuracyPct, 0) / totalSessions)
      : 100;
  const totalBarretines = Object.values(stepBarretines).reduce((a, b) => a + b, 0);

  const proverbHistory = recentSessions
    .filter((s) => s.phaseType === 'proverb')
    .slice()
    .reverse()
    .map((s) => ({
      sessionId: s.sessionId,
      timestampIso: s.timestampIso,
      levelId: s.levelId,
      stepLabel: s.stepLabel,
      wpmNet: s.wpmNet,
      accuracyPct: s.accuracyPct,
      barretines: s.barretines,
    }));

  const cfgMap = readConfigMap_(ss);

  return {
    ok: true,
    data: {
      studentId: cfgMap.STUDENT_ID || 'ALU-01',
      studentEmail: cfgMap.STUDENT_EMAIL || 'alumne@escola.cat',
      group: cfgMap.GROUP || '4t Primària',
      currentLevel: cfgMap.CURRENT_LEVEL || 'L01',
      totalSessions,
      totalMinutes: Math.max(0, Math.round(totalSec / 60)),
      avgWpmNet,
      avgAccuracyPct,
      totalBarretines,
      stepBarretines,
      proverbHistory,
      keyStats,
      recentSessions: recentSessions.slice(0, 100),
      pedagogicalConfig: {
        minAccuracyPct: Number(cfgMap.MIN_ACCURACY_PCT || 88),
        minBarretinesToUnlock: Number(cfgMap.MIN_BARRETINES || 3),
        unlockedAllLevels: cfgMap.UNLOCK_ALL_LEVELS === 'true',
        requireProverbPhase: cfgMap.REQUIRE_PROVERB !== 'false',
      },
    },
  };
}

/**
 * Desa la configuració pedagògica del docent a la pestanya Config.
 */
export function apiSaveTeacherConfig(config: {
  minAccuracyPct: number;
  minBarretinesToUnlock: number;
  unlockedAllLevels: boolean;
  requireProverbPhase: boolean;
}): ApiResponse<{ saved: boolean }> {
  const auth = requireRole_(['tutor', 'support_teacher', 'admin']);
  if (!auth.ok) {
    return { ok: false, error: { code: 'FORBIDDEN', message: 'Accés restringit al docent' } };
  }

  ensureSpreadsheetStructure_();
  const ss = getSpreadsheet_();
  writeConfigValue_(ss, 'MIN_ACCURACY_PCT', String(config.minAccuracyPct));
  writeConfigValue_(ss, 'MIN_BARRETINES', String(config.minBarretinesToUnlock));
  writeConfigValue_(ss, 'UNLOCK_ALL_LEVELS', String(Boolean(config.unlockedAllLevels)));
  writeConfigValue_(ss, 'REQUIRE_PROVERB', String(Boolean(config.requireProverbPhase)));

  return { ok: true, data: { saved: true } };
}

/**
 * Exporta l'historial de sessions en format CSV per al docent (RF-23).
 */
export function apiExportCsv(): ApiResponse<{ filename: string; csvContent: string }> {
  const dash = apiGetTeacherDashboard();
  if (!dash.ok || !dash.data) {
    return { ok: false, error: dash.error };
  }

  const header = [
    'session_id',
    'timestamp_iso',
    'student_id',
    'level_id',
    'phase_type',
    'step_id',
    'step_label',
    'wpm_net',
    'accuracy_pct',
    'errors',
    'total_presses',
    'barretines',
    'duration_sec',
  ].join(',');

  const lines = dash.data.recentSessions.map((s) =>
    [
      s.sessionId,
      s.timestampIso,
      dash.data!.studentId,
      s.levelId,
      s.phaseType,
      s.stepId,
      `"${String(s.stepLabel).replace(/"/g, '""')}"`,
      s.wpmNet,
      s.accuracyPct,
      s.errors,
      s.totalPresses,
      s.barretines,
      s.durationSec,
    ].join(',')
  );

  return {
    ok: true,
    data: {
      filename: `mecano_${dash.data.studentId}_sessions.csv`,
      csvContent: [header, ...lines].join('\n'),
    },
  };
}

// ============================================================================
// Funcions privades de servidor (acabades en '_' — inaccessibles des del client)
// ============================================================================

interface ResolvedIdentity {
  email: string;
  role: UserRole;
  studentId?: string;
  group?: string;
  currentLevel?: string;
}

function requireRole_(allowedRoles: UserRole[]): { ok: boolean; identity?: ResolvedIdentity } {
  const identity = resolveCurrentUserIdentity_();
  if (!allowedRoles.includes(identity.role)) {
    return { ok: false };
  }
  return { ok: true, identity };
}

function resolveCurrentUserIdentity_(): ResolvedIdentity {
  const email = (Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (!email) {
    return { email: '', role: 'unauthorized' };
  }

  const props = PropertiesService.getScriptProperties();
  const tutorEmail = (props.getProperty('TUTOR_EMAIL') || '').trim().toLowerCase();
  if (tutorEmail && email === tutorEmail) {
    return { email, role: 'tutor', studentId: 'ALU-01', currentLevel: 'L01' };
  }

  try {
    const ss = getSpreadsheet_();
    const cfg = readConfigMap_(ss);
    if (cfg.TUTOR_EMAIL && email === cfg.TUTOR_EMAIL.toLowerCase()) {
      return { email, role: 'tutor', studentId: cfg.STUDENT_ID || 'ALU-01', currentLevel: 'L01' };
    }
    if (cfg.STUDENT_EMAIL && email === cfg.STUDENT_EMAIL.toLowerCase()) {
      return {
        email,
        role: 'student',
        studentId: cfg.STUDENT_ID || 'ALU-01',
        group: cfg.GROUP || 'Primària',
        currentLevel: cfg.CURRENT_LEVEL || 'L01',
      };
    }
  } catch {}

  return { email, role: 'unauthorized' };
}

function getSpreadsheet_(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const props = PropertiesService.getScriptProperties();
  const sheetId = props.getProperty('SPREADSHEET_ID');
  if (sheetId) {
    return SpreadsheetApp.openById(sheetId);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function ensureSpreadsheetStructure_(): string[] {
  const created: string[] = [];
  try {
    const ss = getSpreadsheet_();
    if (!ss) return created;

    const schema: Array<{ name: string; headers: string[]; seedRows?: string[][] }> = [
      {
        name: SHEET_TABS.CONFIG,
        headers: ['clau', 'valor', 'descripcio'],
        seedRows: [
          ['SCHEMA_VERSION', '2.0.0', 'Versió de l’esquema Mecano'],
          ['STUDENT_ID', 'ALU-01', 'Identificador intern de l’alumne'],
          ['STUDENT_EMAIL', 'alumne@escola.cat', 'Correu Google Workspace de l’alumne'],
          ['TUTOR_EMAIL', 'docent@escola.cat', 'Correu Google Workspace del docent'],
          ['GROUP', 'Primària', 'Grup o curs'],
          ['CURRENT_LEVEL', 'L01', 'Nivell actual desbloquejat'],
          ['MIN_ACCURACY_PCT', '88', 'Precisió mínima per obtenir 3 Barretines'],
          ['MIN_BARRETINES', '3', 'Barretines mínimes (sobre 5) per desbloquejar el següent pas'],
          ['UNLOCK_ALL_LEVELS', 'false', 'Permet al docent desbloquejar tots els nivells'],
          ['REQUIRE_PROVERB', 'true', 'Requereix superar la Fase 3 (Dita Catalana) per canviar de nivell'],
        ],
      },
      {
        name: SHEET_TABS.STUDENTS,
        headers: ['student_id', 'email', 'grup', 'nivell_actual', 'creat_iso'],
      },
      {
        name: SHEET_TABS.SESSIONS,
        headers: [
          'session_id',
          'timestamp_iso',
          'student_id',
          'level_id',
          'phase_type',
          'step_id',
          'step_label',
          'wpm_net',
          'accuracy_pct',
          'errors',
          'total_presses',
          'barretines',
          'duration_sec',
        ],
      },
      {
        name: SHEET_TABS.KEY_STATS,
        headers: ['student_id', 'key_char', 'hits', 'errors', 'updated_iso'],
      },
      {
        name: SHEET_TABS.ACHIEVEMENTS,
        headers: ['student_id', 'step_id', 'level_id', 'best_barretines', 'best_wpm', 'updated_iso'],
      },
      {
        name: SHEET_TABS.TECH_LOGS,
        headers: ['timestamp_iso', 'context', 'message'],
      },
    ];

    for (const tab of schema) {
      let sh = ss.getSheetByName(tab.name);
      if (!sh) {
        sh = ss.insertSheet(tab.name);
        sh.appendRow(tab.headers);
        if (tab.seedRows) {
          for (const r of tab.seedRows) {
            sh.appendRow(r);
          }
        }
        created.push(tab.name);
      }
    }
  } catch {}
  return created;
}

function readConfigMap_(ss: GoogleAppsScript.Spreadsheet.Spreadsheet): Record<string, string> {
  const out: Record<string, string> = {};
  const sh = ss.getSheetByName(SHEET_TABS.CONFIG);
  if (!sh) return out;
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const k = String(rows[i][0] || '').trim();
    const v = String(rows[i][1] ?? '').trim();
    if (k) out[k] = v;
  }
  return out;
}

function writeConfigValue_(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  key: string,
  val: string
): void {
  const sh = ss.getSheetByName(SHEET_TABS.CONFIG);
  if (!sh) return;
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || '').trim() === key) {
      sh.getRange(i + 1, 2).setValue(val);
      return;
    }
  }
  sh.appendRow([key, val, 'Actualitzat des del Panell Docent']);
}

function logTechnicalError_(context: string, message: string): void {
  try {
    const ss = getSpreadsheet_();
    const sh = ss.getSheetByName(SHEET_TABS.TECH_LOGS);
    if (sh) {
      sh.appendRow([new Date().toISOString(), context, message]);
    }
  } catch {}
}
