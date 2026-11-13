# Especificacions tècniques — App de mecanografia gamificada («En Bit descobreix Catalunya»)

*Nom provisional del projecte: **Mecano**. Versió 0.3 — especificació actualitzada amb el fil conductor cultural d'en Bit, sistema d'avaluació amb les **5 Barretines**, estructura de **5 pantalles per nivell amb barra d'espai des de l'inici** i **Termòmetre de la Dita Catalana**.*

## 1. Context, objectius i fil conductor

Un alumne amb dificultats en l'escriptura manual pot escriure bé amb l'ordinador, però necessita aprendre **mecanografia**: escriure amb tots els dits de les dues mans de manera coordinada, incloent l'ús dels polzes per a la barra d'espai des del primer dia. L'aplicació ha de ser:

- **Didàctica i progressiva**: cada nivell comença amb una **pantalla interactiva de posició de les mans**, treballa primer **només les 2 tecles noves separades per espais** (en parelles i després en grups de 3-4 lletres), i només quan ja s'han practicat per separat les combina amb les lletres dels nivells anteriors.
- **Gamificada i amb identitat catalana**:
  - **Fil conductor («En Bit descobreix Catalunya»)**: El protagonista és **en Bit**, un petit robot explorador espacial (neutre, sense gènere) que aterra a Catalunya (al Montsec) i viatja per comarques, llocs emblemàtics i tradicions catalanes (fer un castell, ballar una sardana, saltar a la Patum, pilotar una avioneta de rescat als Pirineus, bussejar a les Illes Medes...).
  - **Les 5 Barretines**: en lloc d'estrelles genèriques, cada pantalla atorga d'**1 a 5 Barretines** segons la precisió. Calen almenys **3 Barretines** per desbloquejar la pantalla o nivell següent, però l'alumne sempre pot tornar enrere per aconseguir les **5 Barretines** i desbloquejar complements catalans per a en Bit (casc espacial del Montsec, faixa castellera, espardenyes, barretina, llanterna...).
  - **El Termòmetre de la Dita Catalana**: al final de cada nivell, l'alumne completa una **dita popular catalana** (adaptada sense signes complexos ni accents fins als nivells corresponents) utilitzant tot el teclat. Aquesta prova serveix de termòmetre personal per veure com millora la seva fluïdesa (paraules per minut i precisió) entre nivell i nivell, i inclou l'opció d'escoltar-la per veu (**mode dictat**).
- **Avaluable**: el docent recull evidències d'ús i de progrés d'un o diversos alumnes.
- **Multidispositiu i respectuosa amb la privacitat**: Chromebook de l'escola i dispositius de casa amb el compte de Google educatiu del centre; dades pseudonimitzades dins de Google Workspace del centre, sense tercers.

## 2. Abast

**Inclou (v1):** aplicació web (Apps Script + Svelte/TypeScript) amb 5 pantalles per nivell, pantalla prèvia de col·locació de dits, mans virtuals i teclat català en pantalla, escenari gamificat d'en Bit amb obstacles que es superen en completar cada bloc + `Espai`, sistema de 5 Barretines, Termòmetre de la Dita Catalana (amb opció de dictat per síntesi de veu), registre de mètriques, cua resilient amb persistència en cascada (`IndexedDB` → `localStorage` → `RAM`), backend a Google Apps Script i Google Sheets, i panell d'evidències per al tutor.

**No inclou (v1):** rànquings entre alumnes, xat o funcions socials, text lliure desat, aplicacions natives, PWA instal·lable, arrencada sense connexió, backend de tercers, suport per a teclats no QWERTY.

## 3. Usuaris i rols

| Rol | Descripció | Permisos |
| --- | --- | --- |
| **Alumne** | Usa l'app amb el seu compte educatiu. | Llegeix i escriu només les seves dades; només veu la interfície d'alumne. |
| **Tutor** (propietari de la instància) | Docent responsable d'un grup; desplega la instància amb el seu compte del centre. | Gestiona alumnes, nivells i configuració; llegeix totes les dades de la seva instància; exporta informes. |
| **Docent de suport** (opcional) | Especialista o cotutor que acompanya l'alumne. | Llegeix les dades dels alumnes de la instància; no gestiona ni desplega. |
| **Administrador** | Responsable tècnic (qui manté el codi). | Crea instàncies per a nous tutors, manté el codi i supervisa permisos i retenció. |

## 4. Requisits funcionals

### 4.1 Accés i identitat
- **RF-01.** Accés amb el compte de Google del domini del centre.
- **RF-02.** Pseudonimització: traducció del correu a `student_id` (p. ex. `A01`) a la taula restringida `Roster`.
- **RF-03.** Rols determinats per les taules `Config` i `Roster`.

### 4.2 Motor d'exercicis i estructura de cada Nivell en 3 Fases + Banner d'Engegar Motors
- **RF-04.** Els nivells, subnivells d'entrenament, onades arcade i dites catalanes es defineixen a `content/levels.json`.
- **RF-05.** Cada nivell s'estructura en **un Banner d'Arrencada de Motors** seguit de **3 Fases ben diferenciades**:
  - **Banner d'Engegar Motors (a l'inici de cada nivell):** Abans de començar qualsevol nivell, s'obre un banner on l'alumne ha de prémer físicament les **2 tecles protagonistes del nivell + la barra d'Espai** per activar els motors d'en Bit.
  - **FASE 1 — Pràctica i Entrenament de Lletres (Tira de lletres amb Espai):**
    - **1A (Parelles aïllades):** Treballa **exclusivament les 2 tecles noves** en grups de 2 lletres separats per espai (`ff jj fj jf`, o al Nivell 2 `dd kk dk kd` sense barrejar encara `f` i `j`).
    - **1B (Grups de 3-4 lletres aïllades):** Continua **només amb les 2 tecles noves** allargant les "paraules" a 3 i 4 lletres separades per espai (`fjf jfj fjjf`, `dkd kdk dkkd`).
    - **1C (Barreja amb les anteriors, a partir de L02):** Combina les 2 tecles noves amb les tecles dels nivells anteriors en grups de 3 a 4 lletres separats per espai.
  - **FASE 2 — Joc Arcade Gamificat en Estètica 8-Bits (Acció en temps real):**
    - Videojoc en moviment (`<canvas>` Pixel-Art de 8-bits) on la nau o personatge d'**en Bit** vola/actua a l'esquerra de la pantalla i van apareixent **obstacles en moviment** (meteorits al Montsec, blocs castellers a Vilafranca, compassos de sardana a Girona, boles de foc de la Patum a Berga) que avancen cap a ell a velocitat progressiva segons l'onada/nivell.
    - Cada obstacle porta escrit el seu codi de lletres + `Espai`. Quan l'alumne les prem, la nau dispara un raig làser i **l'obstacle explota en píxels de 8-bits**.
    - **Les 5 Barretines com a Vides/Escut a l'Arcade:** La nau comença amb **5 Barretines**. Si un obstacle arriba a tocar la nau d'en Bit, perds **1 Barretina**. Si perds les 5 Barretines, la nau explota i cal reintentar l'onada; si destrueixes l'onada conservant ≥ 3 Barretines, superes la Fase 2!
  - **FASE 3 — Repte de la Dita Catalana (Termòmetre per passar al següent nivell):**
    - Prova final de velocitat i precisió amb **tot el teclat** escrivint una **dita popular catalana** (amb suport visual i opció de mode dictat per veu) per veure l'evolució entre nivells i desbloquejar el nivell següent.
- **RF-06.** Tipus d'exercici: (a) parelles aïllades amb espai, (b) grups de 3-4 lletres amb espai, (c) aventura amb combinacions i paraules catalanes, (d) dites populars catalanes (termòmetre de progrés i dictat).
- **RF-07.** Generació reproduïble amb llavor (`seed`).
- **RF-08.** Avaluació per pulsació: tecla esperada, tecla escrita, dit esperat, encert i latència `t`.
- **RF-09.** Una errada **no bloqueja** l'avanç: dona feedback suau i continua.

### 4.3 Mans virtuals i ajudes
- **RF-10.** Teclat català i mans virtuals en pantalla que ressalten la tecla i el dit que toca (incloent els polzes per a l'espai).
- **RF-11.** Mapa tecla→dit configurable (`fingers.json`) amb color i etiqueta/patró per dit.
- **RF-12.** Feedback visual i efectes de so sintètics opcionals (Web Audio API, sense fitxers externs ni parpelleigs bruscos).

### 4.4 Progressió i gamificació (Les 5 Barretines i en Bit)
- **RF-13.** Cada pantalla atorga de **1 a 5 Barretines** segons la precisió:
  - 1 Barretina (< 80%), 2 Barretines (80-87%), **3 Barretines (88-93%, mínim per avançar)**, 4 Barretines (94-97%), **5 Barretines (≥ 98%, perfecció)**.
- **RF-14.** Un subnivell desbloqueja el següent en obtenir **≥ 3 Barretines**. Un nivell es considera completat en superar les seves 5 pantalles amb ≥ 3 Barretines cadascuna. L'alumne sempre pot repetir qualsevol pantalla per assolir les **5 Barretines**.
- **RF-15.** Superar nivells i aconseguir Barretines desbloqueja **complements catalans per a en Bit** (casc del Montsec, faixa castellera, espardenyes, barretina, llanterna dels Pirineus...) i dites al seu quadern de viatge. Sense rànquings entre alumnes.
- **RF-16.** Pantalles curtes (1-2 min cadascuna) perquè es puguin repetir moltes vegades amb agilitat.
- **RF-17.** El docent pot fixar manualment el nivell d'un alumne.

### 4.5 Registre d'evidències i resiliència
- **RF-18.** Al final de cada pantalla s'envia un resum de sessió (`SessionSummary`), indicant el nivell, subnivell (`sublevel_id`), barretines obtingudes i si és una prova de dita catalana (`mode: 'proverb'`).
- **RF-19.** Mètriques per tecla i dit (`key_stats`).
- **RF-20.** Cua d'enviament amb persistència en cascada (`IndexedDB` → `localStorage` → `Memòria RAM`) i reintent exponencial amb jitter, sense duplicats (`session_id`).

### 4.6 Panell del docent i 4.7 Interfícies i instàncies
- **RF-21..RF-30.** Vista per alumne (incloent l'evolució al Termòmetre de les Dites Catalanes i el mapa de calor d'errors), vista de grup, exportació CSV/PDF, mode previsualització (`?vista=alumne`), comprovació `requireRole_()` i límits per instància (`MAX_ACTIVE_STUDENTS`, `MAX_SAVES_PER_DAY`).

## 5. Disseny pedagògic, navegació per pantalles i 4 jocs 8-bits diferenciats

**Navegació neta per a pantalles de Chromebook (1024×600):**
1. **Capçalera minimalista:** Títol, botó `⬅️ Enrere` i botó d'icona **`⚙️` (Configuració)** a la dreta que desplega les ajudes (sons, mans guia, mida de lletra, alt contrast, lletra espaiada i desbloqueig de prova).
2. **Pantalla Principal (Mapa de Nivells):** Mostra les targetes dels nivells amb la seva il·lustració 8-bits. D'entrada **només el Nivell 1 està obert** i la resta tenen un candau 🔒 fins que se supera la Fase 3 del nivell anterior.
3. **Pantalla de les 3 Fases:** En clicar un nivell obert, es mostren únicament les 3 targetes de les fases d'aquell nivell (Fase 1 Pràctica, Fase 2 Joc 8-Bits, Fase 3 Dita Catalana).
4. **Pantalla d'Engegada de Motors:** En clicar qualsevol fase, s'obre la comprovació de tecles del nivell + `Espai` i tot seguit s'entra a la pantalla de joc neta (on només es veu l'activitat actual + el teclat/mans de suport a sota).

**Progressió i penalització dins dels jocs (Fase 2):**
- Dins de cada joc, les combinacions de lletres **es van fent cada cop més llargues** (comencen de 2 lletres, passen a 3, 4 i 5 lletres).
- **Barra d'Energia i 5 Barretines:** Equivocar-se de tecla resta un **25% d'Energia** i apropa el perill; si l'Energia arriba a 0% (o si el temps/obstacle s'esgota), es perd **1 Barretina**.

**Jocs 8-Bits específics i dites 100% correctes ortogràficament (sense faltes):**

| Nivell | Tecles noves (sempre + `Espai`) | Joc 8-Bits de la Fase 2 (Mecànica pròpia) | Dita catalana normativa (Fase 3, zero faltes d'ortografia) |
| --- | --- | --- | --- |
| **L01** | **f, j** + `Espai` | **1. Nau Espacial i Meteorits al Montsec:** La nau d'en Bit dispara làsers als meteorits que s'acosten. | *"qui dia passa any empeny"* |
| **L02** | **d, k** + `Espai` | **2. Construcció d'un Castell a Vilafranca:** Els castellers caminen cap a la pinya i van pujant pisos reals del castell (Baixos, Segons, Terços, Dosos, Acotxador i Enxaneta). | *"cada ovella al seu corral"* |
| **L03** | **s, l** + `Espai` | **3. Ballar la Sardana a Girona:** Rotllana de 8 dansaires agafats de les mans que giren en cercle fent passos curts i llargs al compàs de la cobla. | *"al maig cada dia un raig"* |
| **L04** | **a, ç** + `Espai` | **4. La Patum de Berga:** La Guita Grossa i la comparsa ballen per la plaça mentre es consumeix la metxa dels fuets amb paraules que inclouen la `ç`. | *"al juny la falç al puny"* |
| **L05** | **g, h** + `Espai` | **5. Avioneta de Rescat als Pirineus:** L'avioneta d'en Bit esquiva avets i núvols fins al refugi d'Aigüestortes. | *"abril plujos maig ventos"* *(amb accents al nivell d'accents)* |
| **L06** | **e, i** (fila sup.) | **6. Submarí a les Illes Medes** | El submarí obre **petxines i retira xarxes** al fons marí de l'Estartit. | *"abril plujos maig ventos"* |
| **L07** | **r, u, t, y** | **7. El Cremallera de la Vall de Núria** | Construeix un **tram de via i pont** cap al santuari. | *"qui matina fa farina"* |
| **L08** | **w, o, q, p** | **8. La Festa del Tió i la Calçotada** | En Bit fa **cagar el Tió** a cops de bastó rítmics. | *"per nadal cada ovella al seu corral"* |
| **L09-L11** | Fila inferior (`z..m`, `,`, `.`) | **9-11. Sant Jordi a Montblanc, Delta de l'Ebre i Pedraforca** | Llança **roses i llibres al Drac**, guia els **flamencs** i escala el **Pedraforca**. | *"al pot petit hi ha la bona confitura"* |
| **L12-L14** | `Shift`, accents i `l·l` | **12-14. El Taller de l'IEC** | Textos i dites amb majúscules, accents oberts/tancats i ela geminada (`l·l`). | Dites completes amb accents i puntuació. |

## 6. Pla de treball i fases d'implementació actualitzat

### Fase 0 — Fonaments (Completada)
- **T0.1..T0.8:** Estructura de repositori Git, contractes TypeScript (`/contracts`), adaptador API amb Mock Local + `getBootstrapData()`, mapa de dits català (`fingers.json`), i briefings modulars (`M1..M9`).

### Fase 1 — Experiència de joc d'Alumne, 5 Pantalles per Nivell, 5 Barretines i Dita Catalana (Completada per a L01-L04)
- **T1.1 (M1):** Captura i normalització de teclat català (`f`, `j`, `d`, `k`, `s`, `l`, `a`, `ç`, `Espai` i tot el teclat per a les dites).
- **T1.2 (M2):** Motor d'exercicis per subnivells (`P1` parelles noves + espai, `P2` grups 3-4 tecles noves + espai, `P3` aventura noves, `P4` aventura barrejada amb anteriors, `P5` consolidació + Dita Catalana).
- **T1.3 (M3):** Pantalla interactiva **Pas 0 (Posició de mans)**, escenari gamificat d'**en Bit per Catalunya** amb obstacles animats, teclat català visual i mans guia.
- **T1.4 (M4):** Sistema de **5 Barretines** (mínim 3 per avançar, rejugable fins a 5), col·lecció de complements catalans d'en Bit i **Termòmetre de la Dita Catalana** (amb comparativa de WPM/precisió i mode dictat per veu).
- **T1.5 (M5):** Cua de persistència en cascada (`localStorage` → `RAM`) i desat de progrés per subnivell i dites.
- **T1.6 (M3/M9):** Barra d'accessibilitat (mida de lletra, alt contrast, lletra espaiada, efectes de so Web Audio API activables/desactivables).

### Fase 2 — Backend Google Apps Script, Google Sheets i Panell del Tutor
- **T2.1..T2.8:** Enrutament de vistes (`doGet`), `requireRole_`, escriptura idempotent amb `LockService` als fulls `Sessions`, `KeyStats` i `Progress`, vista del tutor amb evolució de Barretines, gràfica del Termòmetre de Dites Catalanes i mapa de calor d'errors.

### Fase 3 — Currículum complet L05-L14 i mode Dictat avançat
- **T3.1..T3.6:** Completar les missions d'en Bit per als nivells L05 a L14 (Pirineus, Illes Medes, Núria, Tió, Sant Jordi, Majúscules i Accents/Ela geminada) i ajustos personalitzables pel docent.

### Fase 4 i Fase 5 — Pilot a l'escola, Informes PDF/CSV i Versió 1.0
- **T4.1..T5.4:** Prova real amb l'alumne al Chromebook i a casa, ajust de llindars, exportació d'informes i tancament de la v1.0.
