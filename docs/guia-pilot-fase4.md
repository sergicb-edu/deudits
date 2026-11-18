# Guia Operativa de la Fase 4 — Desplegament i Pilot amb Alumnes (NESE)

Aquesta guia explica com posar en marxa el **Pilot de Mecano (Nivells 1 i 2)** a l'aula tant en mode local (Chromebook directe) com publicat dins de **Google Workspace (Google Sheets + Apps Script)**.

---

## 1. Resum d'Adaptacions per a Alumnes amb NESE incloses al Pilot

1. **Interfície Simplificada (2 passos visibles per nivell):**
   - L'alumne només veu **Pas 1: Practicar les Lletres** i **Pas 2: Jugar l'Aventura**.
   - **La Fase 3 (La Dita Catalana) no apareix com una tercera columna**, per reduir la càrrega visual: només apareix com a **🔑 Repte per passar al següent nivell** un cop l'alumne ha completat els jocs obligatoris del nivell.
2. **Bloqueig Seqüencial Estricte (`🔒`):**
   - Inicialment només està obert el **Nivell 1 → Exercici 1A**.
   - Cal obtenir **mínim 3 Barretines (≥ 88% de precisió)** a cada pas per desbloquejar el següent. Si treu 1 o 2 Barretines, el botó «Següent repte» queda bloquejat i convida a repetir-lo.
3. **Teclat amb Colors Estàndard Clevy:**
   - **Vocals (`A, E, I, O, U`):** Blau clar (`#38bdf8`).
   - **Consonants:** Blau fosc (`#1e3a8a` amb lletra blanca).
   - **Puntuació (`, . -`):** Taronja (`#f97316`).
   - **Barra d'Espai:** Verd (`#16a34a`).
4. **Pràctica sense avançar en cas d'error:**
   - A la tira de lletres, si l'alumne prem una tecla errònia, sona un avís i la lletra es marca en vermell però **no avança fins que prem la tecla correcta** (i l'error es té en compte per a les Barretines i el Mapa de Calor).
5. **Joc Pacífic al Pedraforca + Joc Extra Opcional de Velocitat:**
   - **J1:** Esquivar asteroides per arribar a la Terra (velocitat suau).
   - **J2:** Descens vertical per l'atmosfera esquivant ocells (velocitat suau i constant; només s'allarguen les paraules) fins a aterrar als peus de la forca del **Pedraforca**.
   - **⭐ EXTRA (Opcional):** Joc extra on la velocitat va pujant progressivament, pensat per a qui vulgui més repte **sense condicionar passar de nivell**.

---

## 2. Com publicar-ho a Google Workspace (Google Sheets) en 3 minuts

Tens els 3 fitxers llestos per copiar i enganxar a la carpeta `dist/`:
- [Code.gs](file:///C:/Users/scalvo21/.gemini/antigravity/scratch/mecano/dist/Code.gs)
- [student.html](file:///C:/Users/scalvo21/.gemini/antigravity/scratch/mecano/dist/student.html)
- [admin.html](file:///C:/Users/scalvo21/.gemini/antigravity/scratch/mecano/dist/admin.html)

### Passos dins del teu compte de Google Drive escolar:
1. Obre **Google Drive** i crea un **Full de càlcul de Google (Google Sheets)** nou amb el nom `Mecano - Pilot Alumnes`.
2. Al menú superior del full de càlcul, entra a **Extensions → Apps Script**.
3. Al fitxer `Code.gs` que s'obre per defecte, esborra tot el que hi ha i enganxa-hi el contingut de [dist/Code.gs](file:///C:/Users/scalvo21/.gemini/antigravity/scratch/mecano/dist/Code.gs).
4. A la columna esquerra (**Fitxers**), fes clic al botó **`+` → HTML**, escriu de nom exactament `student` (sense `.html`) i enganxa-hi tot el contingut de [dist/student.html](file:///C:/Users/scalvo21/.gemini/antigravity/scratch/mecano/dist/student.html).
5. Torna a fer clic al botó **`+` → HTML**, escriu de nom exactament `admin` (sense `.html`) i enganxa-hi tot el contingut de [dist/admin.html](file:///C:/Users/scalvo21/.gemini/antigravity/scratch/mecano/dist/admin.html).
6. Fes clic a la icona del disquet (**Desa el projecte**), selecciona la funció `setupMecanoSpreadsheet` al desplegable superior i prem **Executa**: això crearà automàticament les **6 pestanyes** (`Config`, `Alumnes`, `Sessions`, `Estadistiques_Tecles`, `Assoliments`, `Logs_Tecnics`) al teu Google Sheet!
7. Finalment, prem el botó blau **Implementa (Deploy) → Nova implementació**:
   - Tipus: **Aplicació web (Web App)**.
   - Executa com a: **Jo (el teu compte docent)**.
   - Qui hi té accés: **Qualsevol usuari del domini de l'escola** (o Qualsevol persona).
8. Copia l'enllaç de l'aplicació web:
   - L'enllaç normal obrirà la **Vista de l'Alumne (`student`)**.
   - Afegint `?vista=admin` al final de l'enllaç (o consultant directament les pestanyes del Google Sheet) tindràs el **Panell del Docent (`admin`)**!
