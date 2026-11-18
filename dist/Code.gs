/**
 * MECANO — Codi de Servidor Google Apps Script (Fase 4 — Llest per enganxar a Extensions > Apps Script).
 *
 * Com instal·lar-ho en 3 minuts a qualsevol Google Sheet del teu Google Drive escolar:
 * 1. Crea un full de càlcul nou a Google Sheets i posa-li de nom «Mecano - Pilot».
 * 2. Ves al menú superior: Extensions -> Apps Script.
 * 3. Esborra el contingut de Code.gs i enganxa tot aquest fitxer.
 * 4. Clica el botó «+» al costat de Fitxers -> HTML, posa-li de nom «student» (sense .html) i enganxa-hi el contingut de dist/student.html.
 * 5. Clica el botó «+» -> HTML, posa-li de nom «admin» (sense .html) i enganxa-hi el contingut de dist/admin.html.
 * 6. Executa un cop la funció setupMecanoSpreadsheet() des de la barra superior per crear les 6 pestanyes automàtiques.
 * 7. Clica «Implementa» -> «Nova implementació» -> «Aplicació web» -> Executar com a «Jo» -> Qui té accés: «Qualsevol usuari del domini de l'escola».
 */

var SHEET_TABS = {
  CONFIG: 'Config',
  STUDENTS: 'Alumnes',
  SESSIONS: 'Sessions',
  KEY_STATS: 'Estadistiques_Tecles',
  ACHIEVEMENTS: 'Assoliments',
  TECH_LOGS: 'Logs_Tecnics'
};

function doGet(e) {
  ensureSpreadsheetStructure_();
  var view = (e && e.parameter && (e.parameter.vista || e.parameter.view)) || 'student';

  if (view === 'admin' || view === 'docent') {
    return HtmlService.createHtmlOutputFromFile('admin')
      .setTitle('Mecano — Panell del Docent (Pilot)')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  }

  return HtmlService.createHtmlOutputFromFile('student')
    .setTitle('Mecano — En Bit descobreix Catalunya (Pilot)')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function setupMecanoSpreadsheet() {
  var created = ensureSpreadsheetStructure_();
  return { ok: true, createdTabs: created };
}

function apiSaveSession(payload) {
  var lock = LockService.getDocumentLock();
  try {
    lock.waitLock(10000);
    ensureSpreadsheetStructure_();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var email = '';
    try {
      email = Session.getActiveUser().getEmail() || 'alumne@escola.cat';
    } catch (e) {
      email = 'alumne@escola.cat';
    }

    var shSessions = ss.getSheetByName(SHEET_TABS.SESSIONS);
    if (shSessions) {
      shSessions.appendRow([
        payload.sessionId || ('S-' + new Date().getTime()),
        payload.timestampIso || new Date().toISOString(),
        email,
        payload.levelId || 'L01',
        payload.phaseType || 'drill',
        payload.stepId || '',
        payload.stepLabel || '',
        Number(payload.wpmNet || 0),
        Number(payload.accuracyPct || 100),
        Number(payload.errors || 0),
        Number(payload.totalPresses || 0),
        Number(payload.barretines || 0),
        Number(payload.durationSec || 0)
      ]);
    }

    var shAch = ss.getSheetByName(SHEET_TABS.ACHIEVEMENTS);
    if (shAch) {
      shAch.appendRow([
        email,
        payload.stepId || '',
        payload.levelId || 'L01',
        Number(payload.barretines || 0),
        Number(payload.wpmNet || 0),
        payload.timestampIso || new Date().toISOString()
      ]);
    }

    if (payload.keyStats) {
      var shKeys = ss.getSheetByName(SHEET_TABS.KEY_STATS);
      if (shKeys) {
        var keys = Object.keys(payload.keyStats);
        for (var i = 0; i < keys.length; i++) {
          var k = keys[i];
          var st = payload.keyStats[k];
          shKeys.appendRow([
            email,
            k,
            Number(st.hits || 0),
            Number(st.errors || 0),
            payload.timestampIso || new Date().toISOString()
          ]);
        }
      }
    }

    return { ok: true, saved: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function apiSaveTeacherConfig(config) {
  ensureSpreadsheetStructure_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_TABS.CONFIG);
  if (sh) {
    sh.appendRow([
      'TEACHER_CONFIG_UPDATE',
      JSON.stringify(config),
      new Date().toISOString()
    ]);
  }
  return { ok: true };
}

function ensureSpreadsheetStructure_() {
  var created = [];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return created;

  var schema = [
    {
      name: SHEET_TABS.CONFIG,
      headers: ['clau', 'valor', 'descripcio'],
      seed: [
        ['SCHEMA_VERSION', '2.0.0-PILOT-NESE', 'Versió Pilot NESE (Nivells 1 i 2)'],
        ['MIN_ACCURACY_PCT', '88', 'Precisió mínima per obtenir 3 Barretines'],
        ['MIN_BARRETINES', '3', 'Barretines mínimes (sobre 5) per desbloquejar el següent repte']
      ]
    },
    {
      name: SHEET_TABS.STUDENTS,
      headers: ['student_email', 'grup', 'nivell_actual', 'creat_iso']
    },
    {
      name: SHEET_TABS.SESSIONS,
      headers: [
        'session_id', 'timestamp_iso', 'student_email', 'level_id', 'phase_type',
        'step_id', 'step_label', 'wpm_net', 'accuracy_pct', 'errors',
        'total_presses', 'barretines', 'duration_sec'
      ]
    },
    {
      name: SHEET_TABS.KEY_STATS,
      headers: ['student_email', 'key_char', 'hits', 'errors', 'updated_iso']
    },
    {
      name: SHEET_TABS.ACHIEVEMENTS,
      headers: ['student_email', 'step_id', 'level_id', 'barretines', 'wpm_net', 'updated_iso']
    },
    {
      name: SHEET_TABS.TECH_LOGS,
      headers: ['timestamp_iso', 'context', 'message']
    }
  ];

  for (var i = 0; i < schema.length; i++) {
    var tab = schema[i];
    var sh = ss.getSheetByName(tab.name);
    if (!sh) {
      sh = ss.insertSheet(tab.name);
      sh.appendRow(tab.headers);
      if (tab.seed) {
        for (var r = 0; r < tab.seed.length; r++) {
          sh.appendRow(tab.seed[r]);
        }
      }
      created.push(tab.name);
    }
  }
  return created;
}
