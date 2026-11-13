/**
 * Validació lleugera d'esquemes sense dependències pesades per poder usar-se tant al Client com a Apps Script (M6/M8).
 */

import type { FingersConfig, LevelsFile, SessionSummary } from './domain';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateLevelsFile(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['levels.json ha de ser un objecte JSON'] };
  }
  const obj = data as Partial<LevelsFile>;
  if (typeof obj.schemaVersion !== 'string') {
    errors.push('Falta schemaVersion a levels.json');
  }
  if (!Array.isArray(obj.levels) || obj.levels.length === 0) {
    errors.push('levels.json ha de contenir una llista no buida de nivells');
  } else {
    const seenIds = new Set<string>();
    for (const level of obj.levels) {
      if (!level.id || typeof level.id !== 'string') {
        errors.push('Cada nivell ha de tenir un id string');
      } else if (seenIds.has(level.id)) {
        errors.push(`ID de nivell duplicat: ${level.id}`);
      } else {
        seenIds.add(level.id);
      }
      if (!Array.isArray(level.newKeys) || level.newKeys.length === 0) {
        errors.push(`El nivell ${level.id} ha de declarar almenys una tecla a newKeys`);
      }
      if (typeof level.targetLengthChars !== 'number' || level.targetLengthChars < 10) {
        errors.push(`El nivell ${level.id} ha de tenir targetLengthChars >= 10`);
      }
      if (
        !level.passCriteria ||
        level.passCriteria.minAccuracy <= 0 ||
        level.passCriteria.minAccuracy > 1
      ) {
        errors.push(`El nivell ${level.id} té un minAccuracy invàlid (ha d'estar entre 0 i 1)`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateFingersConfig(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['fingers.json ha de ser un objecte JSON'] };
  }
  const obj = data as Partial<FingersConfig>;
  if (typeof obj.schemaVersion !== 'string') {
    errors.push('Falta schemaVersion a fingers.json');
  }
  if (!obj.fingers || typeof obj.fingers !== 'object') {
    errors.push('Falta el mapa fingers a fingers.json');
  }
  if (!obj.keys || typeof obj.keys !== 'object' || Object.keys(obj.keys).length === 0) {
    errors.push('Falta el mapa keys a fingers.json');
  }
  return { valid: errors.length === 0, errors };
}

export function validateSessionSummary(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['SessionSummary ha de ser un objecte'] };
  }
  const s = data as Partial<SessionSummary>;
  if (!s.session_id || typeof s.session_id !== 'string' || s.session_id.length < 8) {
    errors.push('session_id invàlid');
  }
  if (!s.level_id || typeof s.level_id !== 'string') {
    errors.push('level_id obligatori');
  }
  if (typeof s.chars_total !== 'number' || s.chars_total < 0 || s.chars_total > 10000) {
    errors.push('chars_total fora de rang (0..10000)');
  }
  if (typeof s.errors_total !== 'number' || s.errors_total < 0) {
    errors.push('errors_total no pot ser negatiu');
  }
  if (typeof s.accuracy !== 'number' || s.accuracy < 0 || s.accuracy > 1) {
    errors.push('accuracy fora de rang (0..1)');
  }
  if (!Array.isArray(s.key_stats) || s.key_stats.length > 100) {
    errors.push('key_stats ha de ser un array (màx 100 entrades)');
  }
  return { valid: errors.length === 0, errors };
}
