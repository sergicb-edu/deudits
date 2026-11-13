/**
 * M1 — Captura i normalització d'entrada de teclat (RF-08, RF-11, Ap. 9 i 12).
 * Pur TypeScript sense dependència directa del DOM perquè es pugui provar en Node/Vitest.
 */

import type { FingerId, FingersConfig, KeyEventPayload, KeyMapping } from '@contracts/domain';

const IGNORED_CODES = new Set([
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
  'CapsLock',
  'Tab',
  'Escape',
]);

export interface RawKeyboardEventLike {
  code: string;
  key: string;
  timeStamp: number;
  repeat?: boolean;
}

/**
 * Troba la tecla física (KeyMapping) i el dit que corresponen a un caràcter objectiu
 * segons el mapa fingers.json (incloent majúscules, espai i ç).
 */
export function resolveFingerForChar(
  targetChar: string,
  fingersConfig: FingersConfig
): { code: string; finger: FingerId; requiresShift: boolean } | null {
  for (const mapping of Object.values(fingersConfig.keys)) {
    if (mapping.charNormal === targetChar) {
      return { code: mapping.code, finger: mapping.finger, requiresShift: false };
    }
    if (mapping.charShift && mapping.charShift === targetChar) {
      return { code: mapping.code, finger: mapping.finger, requiresShift: true };
    }
    if (mapping.charAltGr && mapping.charAltGr === targetChar) {
      return { code: mapping.code, finger: mapping.finger, requiresShift: false };
    }
  }

  // Caràcters amb accent en català (à, è, é, í, ò, ó, ú, ï, ü) -> associem el dit de la vocal base
  const baseVowelMap: Record<string, string> = {
    à: 'a', À: 'A',
    è: 'e', È: 'E', é: 'e', É: 'E',
    í: 'i', Í: 'I', ï: 'i', Ï: 'I',
    ò: 'o', Ò: 'O', ó: 'o', Ó: 'O',
    ú: 'u', Ú: 'U', ü: 'u', Ü: 'U',
  };
  const baseChar = baseVowelMap[targetChar];
  if (baseChar) {
    return resolveFingerForChar(baseChar, fingersConfig);
  }

  return null;
}

/**
 * Retorna la definició de tecla física per event.code
 */
export function getKeyMappingByCode(
  code: string,
  fingersConfig: FingersConfig
): KeyMapping | undefined {
  return fingersConfig.keys[code];
}

/**
 * Converteix un esdeveniment de teclat del navegador en el contracte KeyEventPayload (M1 -> M2).
 * Retorna null si és una tecla modificadora aïllada, una tecla morta d'accent en espera ('Dead'),
 * o una repetició automàtica per mantenir premuda la tecla.
 */
export function normalizeKeyboardInput(
  rawEvent: RawKeyboardEventLike,
  expectedChar: string,
  stimulusTimestamp: number,
  fingersConfig: FingersConfig
): KeyEventPayload | null {
  if (rawEvent.repeat) {
    return null;
  }
  if (IGNORED_CODES.has(rawEvent.code)) {
    return null;
  }
  if (rawEvent.key === 'Dead' || rawEvent.key === 'Process' || rawEvent.key === 'Unidentified') {
    return null;
  }

  // Només processem caràcters imprimibles d'1 caràcter (o Space)
  if (rawEvent.key.length !== 1) {
    return null;
  }

  const resolvedExpected = resolveFingerForChar(expectedChar, fingersConfig);
  const expectedFinger: FingerId = resolvedExpected?.finger ?? 'L-index';
  const latencyMs = Math.max(0, Math.round(rawEvent.timeStamp - stimulusTimestamp));

  return {
    expected: expectedChar,
    typed: rawEvent.key,
    code: rawEvent.code,
    finger: expectedFinger,
    t: latencyMs,
  };
}
