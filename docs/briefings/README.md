# M4..M9 — Resum de Briefings de la resta de mòduls

Aquest directori conté els briefings modulars definits a l'apartat 12.1 de l'especificació tècnica:

- **M1 (`M1.md`)**: Teclat i normalització d'entrada (`/client/src/core/keyboard.ts`).
- **M2 (`M2.md`)**: Motor d'exercicis amb llavor i avaluació (`/client/src/core/engine.ts`).
- **M3 (`M3.md`)**: UI d'alumne, mans virtuals i accessibilitat (`/client/src/ui/`, `/client/src/student/`).
- **M4 (`M4-gamification`)**: Regles d'estrelles, superació de nivell (3 sessions >= 95%) i insígnies (`/client/src/game/progress.ts`).
- **M5 (`M5-storage`)**: Cua resilient d'enviaments fallits amb reintent exponencial + jitter i adaptador API (`/client/src/storage/`).
- **M6 (`M6-backend`)**: Google Apps Script (`doGet`, `requireRole_`, lectura/escriptura amb `LockService` a Google Sheets) (`/server/`).
- **M7 (`M7-tutor-view`)**: Panell d'evidències, mapa de calor d'errors, alta/baixa d'alumnes pseudonimitzats i exportació CSV/PDF (`/client/src/admin/`).
- **M8 (`M8-content`)**: Currículum `levels.json` (L01-L15), `fingers.json` i `words_ca.json` (`/content/`).
- **M9 (`M9-qa-deploy`)**: Proves unitàries, proves de privacitat/rols i script `clasp` per instància (`/tests/`, `/scripts/`).
