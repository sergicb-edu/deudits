/**
 * MECANO — Servidor Google Apps Script (Fase 4 — Tot en 1 al teu Google Drive!).
 *
 * Quan decideixis el nom definitiu de l'app, només has de canviar aquesta primera línia:
 */
var NOM_APP = 'Mecano';

var SHEET_TABS = {
  CONFIG: 'Config',
  STUDENTS: 'Alumnes',
  SESSIONS: 'Sessions',
  KEY_STATS: 'Estadistiques_Tecles',
  ACHIEVEMENTS: 'Assoliments'
};

/**
 * Crea el menú «MECANO ESCOLA» automàticament dins del Google Sheet.
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🪄 ' + NOM_APP.toUpperCase())
      .addItem('🚀 1. Preparar carpeta a Drive i pestanyes (1 clic)', 'menuSetupAll')
      .addItem('📁 2. Moure a una carpeta personalitzada...', 'menuChooseFolder')
      .addToUi();
  } catch (e) {}
}

function menuSetupAll() {
  var info = setupDriveAndSheets_(NOM_APP);
  SpreadsheetApp.getUi().alert(
    '✅ ' + NOM_APP + ' preparat!',
    'Document anomenat: «' + info.sheetName + '»\n' +
    'Guardat dins la carpeta de La meva unitat: /' + info.folderName + '\n' +
    'Pestanyes a punt: Sessions, Estadistiques_Tecles, Assoliments i Config.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function menuChooseFolder() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.prompt(
    '📁 Carpeta de Google Drive',
    'Escriu el nom de la carpeta a «La meva unitat» on vols guardar el document (per defecte: ' + NOM_APP + '):',
    ui.ButtonSet.OK_CANCEL
  );
  if (resp.getSelectedButton() === ui.Button.OK) {
    var folderName = (resp.getResponseText() || NOM_APP).trim() || NOM_APP;
    var info = setupDriveAndSheets_(folderName);
    ui.alert('✅ Guardat dins /' + info.folderName + ' amb el nom «' + info.sheetName + '»!');
  }
}

/**
 * Serveix la web de l'alumne (URL normal) i el Panell del Docent (afegint ?vista=admin).
 */
function doGet(e) {
  ensureTabs_();
  var view = (e && e.parameter && (e.parameter.vista || e.parameter.view)) || 'student';

  try {
    if (view === 'admin' || view === 'docent') {
      return HtmlService.createHtmlOutputFromFile('admin')
        .setTitle(NOM_APP + ' — Panell del Docent')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
    }
    return HtmlService.createHtmlOutputFromFile('student')
      .setTitle(NOM_APP + ' — Aventura a Catalunya')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  } catch (err) {
    return ContentService.createTextOutput(
      '✅ Servidor ' + NOM_APP + ' actiu! Per obrir el joc des d’aquesta URL, afegeix els fitxers HTML «student» i «admin» a Apps Script.'
    );
  }
}

/**
 * Rep sessions des de qualsevol navegador (mode local o web externa).
 */
function doPost(e) {
  try {
    ensureTabs_();
    var b = JSON.parse(e.postData.contents);
    var list = b.action === 'sync_batch' && Array.isArray(b.sessions) ? b.sessions : [b];
    for (var i = 0; i < list.length; i++) {
      apiSaveSession(list[i]);
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: true, count: list.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Desa una sessió completada (cridat directament per student.html via google.script.run o doPost).
 */
function apiSaveSession(s) {
  var lock = LockService.getDocumentLock();
  try {
    lock.waitLock(10000);
    ensureTabs_();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var stu = s.studentName || '';
    if (!stu) {
      try { stu = Session.getActiveUser().getEmail() || 'ALU-01'; } catch (e) { stu = 'ALU-01'; }
    }

    var sh = ss.getSheetByName(SHEET_TABS.SESSIONS);
    if (sh) {
      sh.appendRow([
        s.sessionId || ('S-' + new Date().getTime()),
        s.timestampIso || new Date().toISOString(),
        stu,
        s.levelId || 'L01',
        s.phaseType || 'drill',
        s.stepId || '',
        s.stepLabel || '',
        Number(s.wpmNet || 0),
        Number(s.accuracyPct || 100),
        Number(s.errors || 0),
        Number(s.totalPresses || 0),
        Number(s.barretines || 0),
        Number(s.durationSec || 0)
      ]);
    }

    var shAch = ss.getSheetByName(SHEET_TABS.ACHIEVEMENTS);
    if (shAch) {
      shAch.appendRow([stu, s.stepId || '', s.levelId || 'L01', Number(s.barretines || 0), Number(s.wpmNet || 0), s.timestampIso || new Date().toISOString()]);
    }

    var shKeys = ss.getSheetByName(SHEET_TABS.KEY_STATS);
    if (shKeys && s.keyStats) {
      var ks = Object.keys(s.keyStats);
      for (var k = 0; k < ks.length; k++) {
        var ch = ks[k];
        shKeys.appendRow([stu, ch, Number(s.keyStats[ch].hits || 0), Number(s.keyStats[ch].errors || 0), s.timestampIso || new Date().toISOString()]);
      }
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * Retorna totes les dades del Google Sheet al Panell del Docent (admin.html) quan s'obre des de Google Workspace.
 */
function apiGetCloudDashboard() {
  ensureTabs_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var shS = ss.getSheetByName(SHEET_TABS.SESSIONS);
  var sRows = shS ? shS.getDataRange().getValues().slice(1) : [];
  var sessions = sRows.map(function(r) {
    return {
      sessionId: String(r[0] || ''),
      timestampIso: String(r[1] || ''),
      studentName: String(r[2] || 'ALU-01'),
      levelId: String(r[3] || 'L01'),
      phaseType: String(r[4] || 'drill'),
      stepId: String(r[5] || ''),
      stepLabel: String(r[6] || ''),
      wpmNet: Number(r[7] || 0),
      accuracyPct: Number(r[8] || 100),
      errors: Number(r[9] || 0),
      totalPresses: Number(r[10] || 0),
      barretines: Number(r[11] || 0),
      durationSec: Number(r[12] || 0)
    };
  }).reverse();

  var stepBarretines = {};
  for (var i = 0; i < sessions.length; i++) {
    var st = sessions[i];
    if (st.stepId) {
      stepBarretines[st.stepId] = Math.max(stepBarretines[st.stepId] || 0, st.barretines);
    }
  }

  var shK = ss.getSheetByName(SHEET_TABS.KEY_STATS);
  var kRows = shK ? shK.getDataRange().getValues().slice(1) : [];
  var keyStats = {};
  for (var j = 0; j < kRows.length; j++) {
    var ch = String(kRows[j][1] || '');
    if (!ch) continue;
    if (!keyStats[ch]) keyStats[ch] = { hits: 0, errors: 0 };
    keyStats[ch].hits += Number(kRows[j][2] || 0);
    keyStats[ch].errors += Number(kRows[j][3] || 0);
  }

  return { sessions: sessions, stepBarretines: stepBarretines, keyStats: keyStats };
}

/**
 * Reanomena el full de càlcul amb NOM_APP, crea la carpeta a La meva unitat i hi mou el document!
 */
function setupDriveAndSheets_(folderName) {
  ensureTabs_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var targetSheetName = NOM_APP + ' - Dades Pilot';
  ss.rename(targetSheetName);

  var targetFolderName = folderName || NOM_APP;
  try {
    var root = DriveApp.getRootFolder();
    var folders = root.getFoldersByName(targetFolderName);
    var folder = folders.hasNext() ? folders.next() : root.createFolder(targetFolderName);
    var file = DriveApp.getFileById(ss.getId());
    file.moveTo(folder);
  } catch (e) {}

  return { sheetName: targetSheetName, folderName: targetFolderName };
}

function ensureTabs_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;
  if (!ss.getSheetByName(SHEET_TABS.SESSIONS)) {
    var sh = ss.insertSheet(SHEET_TABS.SESSIONS);
    sh.appendRow(['session_id','timestamp_iso','student','level_id','phase_type','step_id','step_label','wpm_net','accuracy_pct','errors','total_presses','barretines','duration_sec']);
  }
  if (!ss.getSheetByName(SHEET_TABS.KEY_STATS)) {
    var shK = ss.insertSheet(SHEET_TABS.KEY_STATS);
    shK.appendRow(['student','key_char','hits','errors','updated_iso']);
  }
  if (!ss.getSheetByName(SHEET_TABS.ACHIEVEMENTS)) {
    var shA = ss.insertSheet(SHEET_TABS.ACHIEVEMENTS);
    shA.appendRow(['student','step_id','level_id','barretines','wpm_net','updated_iso']);
  }
  if (!ss.getSheetByName(SHEET_TABS.CONFIG)) {
    var shC = ss.insertSheet(SHEET_TABS.CONFIG);
    shC.appendRow(['clau','valor','descripcio']);
    shC.appendRow(['APP_NAME', NOM_APP, 'Nom definitiu de l’aplicació']);
    shC.appendRow(['MIN_BARRETINES', '3', 'Mínim de Barretines per passar al següent repte']);
  }
}
