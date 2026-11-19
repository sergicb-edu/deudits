# Guia Ràpida: Publicar l'App com a Web App / PWA amb Google Drive (1 Clic)

Aquesta guia explica com posar en marxa la versió **100% Google Workspace Escolar** (sense servidors externs, sense Firebase i sense que els docents hagin de tocar Google Apps Script).

---

## Pas 1: Crear el Client ID gratuït a Google Cloud Console (només 1 vegada)

1. Entra a [Google Cloud Console](https://console.cloud.google.com/) amb el teu compte Google.
2. Crea un projecte nou (per exemple: **`Mecano Escola`**).
3. Al menú lateral, ves a **APIs i serveis → Biblioteca** i activa aquestes **2 APIs gratuïtes**:
   - **Google Drive API**
   - **Google Sheets API**
4. Ves a **APIs i serveis → Pantalla de consentiment OAuth**:
   - **Si vols provar-ho només dins la teva escola (Google Workspace):** tria **Intern** (funciona a l'instant per a tots els docents i alumnes del centre, sense cap verificació de Google!).
   - **Si vols provar-ho amb docents d'altres escoles (Pilot):** tria **Extern**, posa l'estat en **Proves (Testing)** i afegeix fins a **100 correus** d'usuaris de prova.
   - Afegeix el nom de l'app (el podràs canviar quan tinguis el definitiu) i els abastos (*scopes*):
     - `https://www.googleapis.com/auth/drive.file`
     - `https://www.googleapis.com/auth/spreadsheets`
     - `https://www.googleapis.com/auth/userinfo.profile`
     - `https://www.googleapis.com/auth/userinfo.email`
5. Ves a **APIs i serveis → Credencials → Crear credencials → ID de client OAuth**:
   - Tipus d'aplicació: **Aplicació web**.
   - **Orígens de JavaScript autoritzats** (afegeix les URLs on obriràs l'app):
     - `http://localhost:8080` (per provar-ho en local)
     - `https://<el-teu-usuari>.github.io` (quan ho publiquis a GitHub Pages)
   - Copia l'**ID de client** que et dona (acaba en `.apps.googleusercontent.com`).

---

## Pas 2: Posar el Client ID i el nom definitiu de l'App

Obre el fitxer [`dist/app-config.js`](../dist/app-config.js) i enganxa-hi el teu Client ID (i el nom definitiu quan el decideixis):

```js
window.MECANO_CONFIG = {
  APP_NAME: "Mecano",
  DEFAULT_DRIVE_FOLDER: "Mecano",
  GOOGLE_CLIENT_ID: "1234567890-xxxxxxx.apps.googleusercontent.com"
};
```

> **Consell:** També pots enganxar el Client ID directament des del Panell Docent (`⚙️ Configuració del Client ID`) per fer proves ràpides.

---

## Pas 3: Publicar gratis a GitHub Pages (perquè tots els Chromebooks hi accedeixin)

1. Puja la carpeta del projecte a un repositori de **GitHub**.
2. A **Settings → Pages** del repositori, selecciona la branca `main` i la carpeta `/dist` (o copia el contingut de `dist/` a la branca `gh-pages`).
3. En 1 minut tindràs la teva app publicada en HTTPS real (per exemple `https://<usuari>.github.io/mecano/`).
4. Els docents i alumnes fins i tot la podran **instal·lar com a icona d'app (PWA)** als Chromebooks des de la barra d'adreces de Chrome!

---

## Com funciona en el dia a dia?

### 👩‍🏫 Per a qualsevol docent (0 coneixements tècnics):
1. Obre l'app i entra a **Sóc Docent**.
2. Clica **«🔐 Iniciar sessió amb Google i crear Drive automàticament»**.
3. L'app crea automàticament la carpeta `/Mecano` (o el nom que triï) i el Google Sheet amb totes les pestanyes (`Sessions`, `Estadistiques_Tecles`, `Assoliments`, `Config`).
4. Clica **«🎓 Compartir a Classroom»** o **«🔗 Copiar enllaç per als alumnes»**.

### 🕹️ Per als alumnes (Chromebooks):
1. Obren l'enllaç de Classroom.
2. Cliquen el botó blau **«🔐 Entrar amb Google»** (1 clic amb el seu compte escolar).
3. Juguen amb normalitat: cada exercici i partida es desa automàticament al Google Sheet del docent amb el nom real de l'alumne!
