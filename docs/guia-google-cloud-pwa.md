# Guia Ràpida: Publicar **DeuDits** com a Web App / PWA amb Google Drive (Compte Personal)

Aquesta guia explica pas a pas com configurar **DeuDits** des del teu **compte personal de Google (`@gmail.com`)** perquè qualsevol docent o alumne hi pugui entrar amb el seu compte escolar (`@xtec.cat` o domini del centre), sense servidors externs i amb 1 sol clic.

---

## Pas 1: Crear el projecte a Google Cloud Console (amb compte `@gmail.com`)

1. Entra a [Google Cloud Console](https://console.cloud.google.com/) amb el teu **compte personal (`@gmail.com`)**.
   > **Per què personal i no XTEC?** Perquè amb el compte personal tens control total i gratuït del projecte, sense bloquejos d'administrador del Departament. Igualment, tots els docents i alumnes podran iniciar sessió a **DeuDits** amb els seus comptes escolars o `@xtec.cat`.
2. Clica el selector de projectes (dalt a l'esquerra) → **Projecte nou**:
   - **Nom del projecte:** `DeuDits`
   - **Organització / Ubicació (Recurs superior):** deixa-ho en **Sense organització** (*No organization / Sin organización*).
   - Clica **Crear**.

---

## Pas 2: Activar les 2 APIs gratuïtes

Al menú lateral (☰) → **APIs i serveis → Biblioteca**:
1. Cerca **Google Drive API** → entra-hi → clica **Habilita (Enable)**.
2. Torna a la Biblioteca, cerca **Google Sheets API** → entra-hi → clica **Habilita (Enable)**.

---

## Pas 3: Configurar la Pantalla de consentiment OAuth (Mode Pilot)

Al menú lateral → **APIs i serveis → Pantalla de consentiment OAuth** *(o **Google Auth Platform → Visió general / Primers passos** si veus la interfície nova)*:

1. **Nom de l'aplicació:** `DeuDits`
2. **Correu d'assistència:** el teu `@gmail.com`.
3. **Públic (Audience / Tipus d'usuari):** selecciona **Extern** *(External)*.
4. **Dades de contacte del desenvolupador:** el teu `@gmail.com`.
5. **Abastos (*Scopes* / Accés a dades):** afegeix aquests 4 abastos:
   - `https://www.googleapis.com/auth/drive.file` *(permet crear només la carpeta i el full de DeuDits)*
   - `https://www.googleapis.com/auth/spreadsheets` *(permet desar i llegir les partides del full de DeuDits)*
   - `https://www.googleapis.com/auth/userinfo.profile` *(nom de l'usuari)*
   - `https://www.googleapis.com/auth/userinfo.email` *(correu per detectar el domini escolar)*
6. **Usuaris de prova (*Test users*):**
   - Deixa l'estat de publicació en **Proves (*Testing*)** durant tot el pilot!
   - Clica **+ Afegir usuaris** i posa-hi:
     - El teu correu personal i/o `@xtec.cat`.
     - Els correus dels docents i alumnes que faran el pilot (en caben fins a **100 gratuïts** i funciona **a l'instant**, sense haver d'esperar la revisió de Google).
   - *(Quan acabis el pilot i vulguis obrir DeuDits a qualsevol escola sense llista de correus, només caldrà clicar «Publicar aplicació» en aquesta mateixa pantalla.)*

---

## Pas 4: Crear l'ID de client OAuth

Al menú lateral → **APIs i serveis → Credencials** *(o **Google Auth Platform → Clients**)* → **+ Crear credencials → ID de client OAuth**:

1. **Tipus d'aplicació:** **Aplicació web**.
2. **Nom:** `DeuDits Web`
3. **Orígens de JavaScript autoritzats** *(clica «+ Afegir URI»)*:
   - `http://localhost:8080` *(per fer proves des del teu ordinador)*
   - `https://<el-teu-usuari>.github.io` *(la teva URL de GitHub Pages quan la publiquis — sense barra `/` al final!)*
   - *(No cal posar res a «URIs de redirecció autoritzats».)*
4. Clica **Crear** i copia l'**ID de client** (acaba en `.apps.googleusercontent.com`).

---

## Pas 5: Enganxar l'ID de client a DeuDits

Obre [`dist/app-config.js`](../dist/app-config.js) i enganxa-hi el teu Client ID:

```js
window.MECANO_CONFIG = {
  APP_NAME: "DeuDits",
  DEFAULT_DRIVE_FOLDER: "DeuDits",
  GOOGLE_CLIENT_ID: "1234567890-xxxxxxx.apps.googleusercontent.com"
};
```

> **Consell:** També el pots enganxar directament des del Panell Docent (`⚙️ Configuració del Client ID`) per provar-ho ràpidament abans de pujar-ho.

---

## Pas 6: Publicar gratis a GitHub Pages (URL HTTPS per als Chromebooks)

1. Puja la carpeta del projecte a un repositori públic de **GitHub** (per exemple `deudits`).
2. A **Settings → Pages** del repositori, activa GitHub Pages des de la carpeta publicada.
3. En 1 minut tindràs la teva URL HTTPS real (ex. `https://<usuari>.github.io/deudits/`).
4. Recorda que aquesta URL (`https://<usuari>.github.io`, **sense** `/deudits/` al final) ha d'estar afegida als **Orígens de JavaScript autoritzats** del Pas 4.

---

## Com ho viuran docents i alumnes?

- **👩‍🏫 Docent:** Obre `admin.html` → clica **«🔐 Iniciar sessió amb Google i crear Drive automàticament»** → en 2 segons té la carpeta `/DeuDits` i el Google Sheet creats al seu Drive + el botó **«🎓 Compartir a Classroom»**.
- **🕹️ Alumne (Chromebook):** Obre l'enllaç de Classroom → clica **«🔐 Entrar amb Google»** (1 clic amb el compte escolar) → juga tranquil·lament i totes les seves partides i barretines apareixen al Google Sheet del docent.
