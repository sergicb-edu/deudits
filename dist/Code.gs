/**
 * MECANO — Servidor Google Apps Script amb Menú Màgic per a Docents (Fase 4).
 *
 * Incorporem:
 * 1. onOpen(): Crea automàticament el menú «🪄 MECANO ESCOLA» a la barra superior del Google Sheet
 *    perquè el docent pugui crear totes les pestanyes amb 1 sol clic sense tocar codi!
 * 2. doPost(e): Permet que student.html i admin.html enviïn les partides al Google Sheet
 *    fins i tot quan s'obren des d'un Chromebook en local o des de Google Drive/Classroom!
 * 3. doGet(e): Serveix tant l'aplicació web com el resum JSON per al Panell Docent.
 */

var SHEET_TABS = {
  CONFIG: 'Config',
  STUDENTS: 'Alumnes',
  SESSIONS: 'Sessions',
  KEY_STATS: 'Estadistiques_Tecles',
  ACHIEVEMENTS: 'Assoliments',
  TECH_LOGS: 'Logs_Tecnics'
};

/**
 * Crea el menú «🪄 MECANO ESCOLA» automàticament quan el docent obre el Google Sheet.
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🪄 MECANO ESCOLA')
      .addItem('🚀 1. Preparar les 6 pestanyes automàticament (1 clic)', 'menuSetupSheets')
      .addSeparator()
      .addItem('📊 2. Com connectar amb el Panell Docent', 'menuShowHelp')
      .addToUi();
  } catch (e) {}
}

function menuSetupSheets() {
  var created = ensureSpreadsheetStructure_();
  var msg = created.length > 0
    ? 'S’han creat les pestanyes: ' + created.join(', ') + '. Ja ho tens tot a punt!'
    : 'Totes les 6 pestanyes de Mecano ja estan creades i a punt!';
  SpreadsheetApp.getUi().alert('✅ Mecano configurat!', msg, SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuShowHelp() {
  SpreadsheetApp.getUi().alert(
    '☁️ Com connectar aquest full amb Mecano',
    '1. Ves a dalt a la dreta: Implementa -> Nova implementació -> Aplicació web.\n' +
    '2. Tria Executar com a: «Jo» i Qui hi té accés: «Qualsevol persona» (o domini escolar).\n' +
    '3. Copia l’URL que et donarà i enganxa-la al botó «☁️ Connectar amb Google Drive» del Panell del Docent!',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Rep les sessions enviades automàticament des de student.html o des del botó Sincronitzar d'admin.html.
 */
function doPost(e) {
  try {
    var body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    if (body.action === 'sync_batch' && Array.isArray(body.sessions)) {
      for (var i = 0; i < body.sessions.length; i++) {
        apiSaveSession(body.sessions[i]);
      }
      return ContentService.createTextOutput(JSON.stringify({ ok: true, count: body.sessions.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var res = apiSaveSession(body);
    return ContentService.createTextOutput(JSON.stringify(res))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  ensureSpreadsheetStructure_();
  var view = (e && e.parameter && (e.parameter.vista || e.parameter.view)) || 'student';

  if (view === 'json') {
    return ContentService.createTextOutput(JSON.stringify({ ok: true, status: 'Mecano Cloud Ready' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    if (view === 'admin' || view === 'docent') {
      return HtmlService.createHtmlOutputFromFile('admin')
        .setTitle('Mecano — Panell del Docent (Pilot)')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
    }
    return HtmlService.createHtmlOutputFromFile('student')
      .setTitle('Mecano — En Bit descobreix Catalunya (Pilot)')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  } catch (err) {
    return ContentService.createTextOutput(
      '✅ Servidor Mecano actiu i connectat al Google Sheet! Ja pots enganxar aquesta URL al botó «☁️ Connectar amb Google Drive» del Panell Docent.'
    );
  }
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
    var studentName = payload.studentName || payload.studentId || 'ALU-01';

    var shSessions = ss.getSheetByName(SHEET_TABS.SESSIONS);
    if (shSessions) {
      shSessions.appendRow([
        payload.sessionId || ('S-' + new Date().getTime()),
        payload.timestampIso || new Date().toISOString(),
        studentName,
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
        studentName,
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
            studentName,
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
      headers: ['student_name', 'grup', 'nivell_actual', 'creat_iso']
    },
    {
      name: SHEET_TABS.SESSIONS,
      headers: [
        'session_id', 'timestamp_iso', 'student_name', 'level_id', 'phase_type',
        'step_id', 'step_label', 'wpm_net', 'accuracy_pct', 'errors',
        'total_presses', 'barretines', 'duration_sec'
      ]
    },
    {
      name: SHEET_TABS.KEY_STATS,
      headers: ['student_name', 'key_char', 'hits', 'errors', 'updated_iso']
    },
    {
      name: SHEET_TABS.ACHIEVEMENTS,
      headers: ['student_name', 'step_id', 'level_id', 'barretines', 'wpm_net', 'updated_iso']
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
