# Mecano — App de mecanografia gamificada en català

Projecte d'ordinografia/mecanografia educativa per a Google Workspace (Apps Script + Google Sheets) amb client web lleuger en **TypeScript + Svelte + Vite**.

## Estructura del repositori

- `contracts/` — Tipus TypeScript compartits i validadors (`domain.ts`, `api.ts`, `validators.ts`).
- `content/` — Dades pedagògiques editables sense programar (`levels.json`, `fingers.json`, `words_ca.json`).
- `client/src/` — Codi del client dividit en `core/` (M1/M2), `game/` (M4), `storage/` (M5), `ui/` (M3), `student/` (vista alumne) i `admin/` (M7 vista tutor).
- `server/` — Codi de Google Apps Script (M6: `Code.ts`, `appsscript.json`).
- `docs/briefings/` — Fitxes de treball per mòdul (`M1.md` .. `M9.md`).
- `tests/` — Proves automàtiques amb Vitest.
- `scripts/` — Eines de construcció i desplegament per instància amb `clasp`.
