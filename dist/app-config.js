/**
 * Configuració central i client oficial Google Identity Services (OAuth 2.0)
 * + Google Drive API v3 + Google Sheets API v4 (100% navegador, sense servidors).
 *
 * Quan tinguis el nom definitiu de l'app i el Client ID de Google Cloud Console,
 * només cal editar aquestes dues línies i tota l'app (docent, alumne i Drive)
 * s'actualitzarà automàticament.
 */
window.MECANO_CONFIG = {
  APP_NAME: "DeuDits",
  DEFAULT_DRIVE_FOLDER: "DeuDits",
  // OAuth 2.0 Client ID de Google Cloud Console (públic per a Web Apps)
  GOOGLE_CLIENT_ID: "550312682163-3entl514uqqhbj7qrpil5q4uf3mds19n.apps.googleusercontent.com"
};

window.MecanoGoogleAuth = (function () {
  const LS_CLIENT_ID = "mecano_google_client_id";
  const LS_SHEET_ID = "mecano_google_sheet_id";
  const LS_SHEET_URL = "mecano_google_sheet_url";
  const LS_FOLDER_NAME = "mecano_google_folder_name";
  const LS_USER_INFO = "mecano_google_user_info";

  let accessToken = null;
  let tokenExpiresAt = 0;

  function getAppName() {
    return (window.MECANO_CONFIG && window.MECANO_CONFIG.APP_NAME) || "Mecano";
  }

  function getClientId() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = (params.get("cid") || "").trim();
    if (fromUrl) {
      localStorage.setItem(LS_CLIENT_ID, fromUrl);
      return fromUrl;
    }
    const fromStorage = (localStorage.getItem(LS_CLIENT_ID) || "").trim();
    if (fromStorage) return fromStorage;
    return ((window.MECANO_CONFIG && window.MECANO_CONFIG.GOOGLE_CLIENT_ID) || "").trim();
  }

  function setClientId(cid) {
    localStorage.setItem(LS_CLIENT_ID, (cid || "").trim());
  }

  function getSheetId() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = (params.get("sheet") || "").trim();
    if (fromUrl) {
      localStorage.setItem(LS_SHEET_ID, fromUrl);
      return fromUrl;
    }
    return (localStorage.getItem(LS_SHEET_ID) || "").trim();
  }

  function setSheetInfo(sheetId, sheetUrl, folderName) {
    if (sheetId) localStorage.setItem(LS_SHEET_ID, sheetId);
    if (sheetUrl) localStorage.setItem(LS_SHEET_URL, sheetUrl);
    if (folderName) localStorage.setItem(LS_FOLDER_NAME, folderName);
  }

  function getSavedSheetUrl() {
    const id = getSheetId();
    return localStorage.getItem(LS_SHEET_URL) || (id ? `https://docs.google.com/spreadsheets/d/${id}/edit` : "");
  }

  function getSavedUser() {
    try {
      return JSON.parse(localStorage.getItem(LS_USER_INFO) || "null");
    } catch {
      return null;
    }
  }

  function hasValidToken() {
    return Boolean(accessToken && Date.now() < tokenExpiresAt - 15000);
  }

  function requestAccessToken(scopes, promptMode = "consent") {
    return new Promise((resolve, reject) => {
      const clientId = getClientId();
      if (!clientId) {
        reject(new Error("Falta el Google Client ID. Configura'l a dist/app-config.js o a la configuració avançada del panell."));
        return;
      }
      if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
        reject(new Error("La llibreria de Google Sign-In encara s'està carregant o no hi ha connexió a internet."));
        return;
      }
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: scopes,
        callback: (resp) => {
          if (resp.error) {
            reject(new Error(resp.error_description || resp.error));
            return;
          }
          accessToken = resp.access_token;
          tokenExpiresAt = Date.now() + Number(resp.expires_in || 3500) * 1000;
          resolve(accessToken);
        }
      });
      tokenClient.requestAccessToken({ prompt: promptMode });
    });
  }

  async function apiFetch(url, options = {}) {
    if (!accessToken) throw new Error("Sessió de Google no iniciada.");
    const headers = Object.assign(
      { Authorization: `Bearer ${accessToken}` },
      options.headers || {}
    );
    const res = await fetch(url, Object.assign({}, options, { headers }));
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Error API Google (${res.status}): ${txt.slice(0, 220)}`);
    }
    return res.json();
  }

  async function fetchUserProfile() {
    const profile = await apiFetch("https://www.googleapis.com/oauth2/v3/userinfo");
    const user = {
      name: profile.name || profile.given_name || profile.email || "Usuari",
      givenName: profile.given_name || profile.name || "Alumne",
      email: profile.email || "",
      domain: profile.hd || "",
      picture: profile.picture || ""
    };
    localStorage.setItem(LS_USER_INFO, JSON.stringify(user));
    return user;
  }

  // --- DOCENT: Crea carpeta + Google Sheet + pestanyes + permís d'escriptura per als alumnes ---
  async function findOrCreateFolder(folderName) {
    const safeName = (folderName || getAppName()).replace(/'/g, "\\'");
    const q = encodeURIComponent(
      `name='${safeName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    );
    const search = await apiFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`);
    if (search.files && search.files.length > 0) {
      return search.files[0];
    }
    return apiFetch("https://www.googleapis.com/drive/v3/files?fields=id,name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: folderName || getAppName(),
        mimeType: "application/vnd.google-apps.folder"
      })
    });
  }

  async function findExistingSheetInFolder(folderId, sheetTitle) {
    const safeTitle = sheetTitle.replace(/'/g, "\\'");
    const q = encodeURIComponent(
      `'${folderId}' in parents and name='${safeTitle}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
    );
    const search = await apiFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)`);
    return (search.files && search.files.length > 0) ? search.files[0] : null;
  }

  async function createStructuredSheet(folderId, sheetTitle, userDomain) {
    const created = await apiFetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        properties: { title: sheetTitle, locale: "ca_ES" },
        sheets: [
          { properties: { title: "Sessions" } },
          { properties: { title: "Estadistiques_Tecles" } },
          { properties: { title: "Assoliments" } },
          { properties: { title: "Config" } }
        ]
      })
    });
    const sheetId = created.spreadsheetId;
    const sheetUrl = created.spreadsheetUrl;

    // 1. Escriu capçaleres a les 4 pestanyes
    await apiFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        valueInputOption: "RAW",
        data: [
          {
            range: "Sessions!A1:M1",
            values: [[
              "session_id", "timestamp_iso", "student", "level_id", "phase_type",
              "step_id", "step_label", "wpm_net", "accuracy_pct", "errors",
              "total_presses", "barretines", "duration_sec"
            ]]
          },
          {
            range: "Estadistiques_Tecles!A1:E1",
            values: [["student", "key_char", "hits", "errors", "updated_iso"]]
          },
          {
            range: "Assoliments!A1:F1",
            values: [["student", "step_id", "level_id", "barretines", "wpm_net", "updated_iso"]]
          },
          {
            range: "Config!A1:B4",
            values: [
              ["clau", "valor"],
              ["app_name", getAppName()],
              ["min_accuracy_pct", "88"],
              ["min_barretines_unlock", "3"]
            ]
          }
        ]
      })
    });

    // 2. Mou el full de càlcul dins la carpeta /NomApp del docent
    const fileMeta = await apiFetch(`https://www.googleapis.com/drive/v3/files/${sheetId}?fields=parents`);
    const prevParents = (fileMeta.parents || []).join(",");
    await apiFetch(
      `https://www.googleapis.com/drive/v3/files/${sheetId}?addParents=${encodeURIComponent(folderId)}&removeParents=${encodeURIComponent(prevParents)}&fields=id,parents`,
      { method: "PATCH" }
    );

    // 3. Permet que els alumnes amb l'enllaç del docent (fins i tot si el docent és @xtec.cat i els alumnes @escola.cat) puguin registrar partides
    try {
      await apiFetch(`https://www.googleapis.com/drive/v3/files/${sheetId}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "anyone", role: "writer" })
      });
    } catch {
      // Si el domini restringeix permisos automàtics, el docent el pot compartir manualment des del botó Obrir Sheet
    }

    return { id: sheetId, webViewLink: sheetUrl };
  }

  async function teacherConnectAndSetup(customFolderName) {
    const scopes = [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email"
    ].join(" ");

    await requestAccessToken(scopes, hasValidToken() ? "" : "consent");
    const user = await fetchUserProfile();

    const folderName = (customFolderName || localStorage.getItem(LS_FOLDER_NAME) || getAppName()).trim();
    const sheetTitle = `${getAppName()} — Seguiment d'Alumnes`;

    const folder = await findOrCreateFolder(folderName);
    let sheet = await findExistingSheetInFolder(folder.id, sheetTitle);
    let createdNew = false;

    if (!sheet) {
      sheet = await createStructuredSheet(folder.id, sheetTitle, user.domain);
      createdNew = true;
    }

    const sheetUrl = sheet.webViewLink || `https://docs.google.com/spreadsheets/d/${sheet.id}/edit`;
    setSheetInfo(sheet.id, sheetUrl, folderName);

    return {
      user,
      folderName: folder.name,
      sheetId: sheet.id,
      sheetUrl,
      createdNew
    };
  }

  async function teacherFetchDashboardData(sheetIdOverride) {
    const sheetId = sheetIdOverride || getSheetId();
    if (!sheetId) throw new Error("No hi ha cap Google Sheet vinculat.");
    if (!hasValidToken()) {
      await requestAccessToken(
        "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
        ""
      );
    }

    const resp = await apiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?ranges=Sessions!A2:M5000&ranges=Estadistiques_Tecles!A2:E5000&ranges=Assoliments!A2:F5000`
    );
    const vr = resp.valueRanges || [];
    const sessRows = (vr[0] && vr[0].values) || [];
    const keyRows = (vr[1] && vr[1].values) || [];
    const achRows = (vr[2] && vr[2].values) || [];

    const sessions = sessRows.map((r) => ({
      sessionId: r[0] || "",
      timestampIso: r[1] || "",
      studentName: r[2] || "Alumne",
      levelId: Number(r[3] || 1),
      phaseType: r[4] || "PRACTICE",
      stepId: r[5] || "",
      stepLabel: r[6] || "",
      wpmNet: Number(r[7] || 0),
      accuracyPct: Number(r[8] || 100),
      errors: Number(r[9] || 0),
      totalPresses: Number(r[10] || 0),
      barretines: Number(r[11] || 0),
      durationSec: Number(r[12] || 0)
    })).reverse();

    const keyStatsByStudent = {};
    const keyStatsAll = {};
    for (const r of keyRows) {
      const stu = r[0] || "Alumne";
      const ch = r[1];
      if (!ch) continue;
      const hits = Number(r[2] || 0);
      const errs = Number(r[3] || 0);
      if (!keyStatsAll[ch]) keyStatsAll[ch] = { hits: 0, errors: 0 };
      keyStatsAll[ch].hits += hits;
      keyStatsAll[ch].errors += errs;

      if (!keyStatsByStudent[stu]) keyStatsByStudent[stu] = {};
      if (!keyStatsByStudent[stu][ch]) keyStatsByStudent[stu][ch] = { hits: 0, errors: 0 };
      keyStatsByStudent[stu][ch].hits += hits;
      keyStatsByStudent[stu][ch].errors += errs;
    }

    const barretinesByStudent = {};
    const barretinesAll = {};
    for (const r of achRows) {
      const stu = r[0] || "Alumne";
      const stepId = r[1];
      const b = Number(r[3] || 0);
      if (!stepId) continue;
      barretinesAll[stepId] = Math.max(barretinesAll[stepId] || 0, b);
      if (!barretinesByStudent[stu]) barretinesByStudent[stu] = {};
      barretinesByStudent[stu][stepId] = Math.max(barretinesByStudent[stu][stepId] || 0, b);
    }

    const students = Array.from(new Set(sessions.map((s) => s.studentName).filter(Boolean))).sort();

    return {
      sessions,
      students,
      keyStatsAll,
      keyStatsByStudent,
      barretinesAll,
      barretinesByStudent
    };
  }

  // --- ALUMNE: Inicia sessió amb el compte Google escolar i desa sessions al Sheet del docent ---
  async function studentSignIn() {
    const scopes = [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/userinfo.profile"
    ].join(" ");
    await requestAccessToken(scopes, "");
    return fetchUserProfile();
  }

  async function studentAppendSession(sessionObj, keyStats) {
    const sheetId = getSheetId();
    if (!sheetId || !hasValidToken()) return false;
    const user = getSavedUser();
    const stuName = (user && (user.name || user.givenName)) || sessionObj.studentName || "Alumne";

    // 1. Sessions
    await apiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sessions!A:M:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values: [[
            sessionObj.sessionId,
            sessionObj.timestampIso,
            stuName,
            sessionObj.levelId,
            sessionObj.phaseType,
            sessionObj.stepId,
            sessionObj.stepLabel,
            sessionObj.wpmNet,
            sessionObj.accuracyPct,
            sessionObj.errors,
            sessionObj.totalPresses,
            sessionObj.barretines,
            sessionObj.durationSec
          ]]
        })
      }
    );

    // 2. Assoliments
    await apiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Assoliments!A:F:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values: [[
            stuName,
            sessionObj.stepId,
            sessionObj.levelId,
            sessionObj.barretines,
            sessionObj.wpmNet,
            sessionObj.timestampIso
          ]]
        })
      }
    );

    // 3. Estadistiques_Tecles
    if (keyStats && Object.keys(keyStats).length > 0) {
      const kRows = Object.entries(keyStats).map(([ch, st]) => [
        stuName,
        ch,
        Number(st.hits || 0),
        Number(st.errors || 0),
        sessionObj.timestampIso
      ]);
      await apiFetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Estadistiques_Tecles!A:E:append?valueInputOption=USER_ENTERED`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ values: kRows })
        }
      );
    }

    return true;
  }

  function buildStudentShareLink() {
    const sheetId = getSheetId();
    const cid = getClientId();
    const base = new URL("./student-intercalat.html", window.location.href);
    if (sheetId) base.searchParams.set("sheet", sheetId);
    if (cid && !(window.MECANO_CONFIG && window.MECANO_CONFIG.GOOGLE_CLIENT_ID)) {
      base.searchParams.set("cid", cid);
    }
    return base.toString();
  }

  return {
    getAppName,
    getClientId,
    setClientId,
    getSheetId,
    getSavedSheetUrl,
    getSavedUser,
    hasValidToken,
    teacherConnectAndSetup,
    teacherFetchDashboardData,
    studentSignIn,
    studentAppendSession,
    buildStudentShareLink
  };
})();
