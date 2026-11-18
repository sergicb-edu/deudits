import { describe, expect, it } from 'vitest';
import levelsCatalog from '../content/levels.json';

describe('Fase 4 — Validació del Pilot NESE i Desplegament', () => {
  it('verifica que els nivells 1 i 2 del Pilot tenen les dites catalanes sense faltes ortogràfiques', () => {
    const l01 = levelsCatalog.levels.find((l) => l.id === 'L01');
    const l02 = levelsCatalog.levels.find((l) => l.id === 'L02');
    expect(l01?.theme.proverbCa).toBe('qui dia passa any empeny');
    expect(l02?.theme.proverbCa).toBe('cada ovella al seu corral');
  });
});
