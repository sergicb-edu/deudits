import { describe, expect, it } from 'vitest';
import levelsCatalog from '../content/levels.json';

describe('Fase 3 — Currículum Pilot Ampliat (Nivells 1 i 2)', () => {
  it('el Nivell 2 (D, K + F, J) té els 8 subnivells ampliats per assimilar les 4 lletres', () => {
    const l02 = levelsCatalog.levels.find((l) => l.id === 'L02');
    expect(l02).toBeDefined();
    expect(l02!.sublevels.length).toBe(8);
    expect(l02!.sublevels.map((s) => s.id)).toEqual([
      'L02.D1',
      'L02.D2',
      'L02.D3',
      'L02.D4',
      'L02.D5',
      'L02.G1',
      'L02.G2',
      'L02.G3',
    ]);
  });
});
