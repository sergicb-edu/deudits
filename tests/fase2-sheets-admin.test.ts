import { describe, expect, it } from 'vitest';
import { SHEET_TABS } from '../server/Code';

describe('Fase 2 — Model de dades Google Sheets (M6) i Panell Docent (M7)', () => {
  it('defineix les 6 pestanyes canòniques del llibre de Google Sheets', () => {
    expect(SHEET_TABS.CONFIG).toBe('Config');
    expect(SHEET_TABS.STUDENTS).toBe('Alumnes');
    expect(SHEET_TABS.SESSIONS).toBe('Sessions');
    expect(SHEET_TABS.KEY_STATS).toBe('Estadistiques_Tecles');
    expect(SHEET_TABS.ACHIEVEMENTS).toBe('Assoliments');
    expect(SHEET_TABS.TECH_LOGS).toBe('Logs_Tecnics');
  });
});
