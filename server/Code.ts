/**
 * M6 Backend — Google Apps Script (Esquelet de Fase 0, Ap. 6.3 i 8).
 *
 * IMPORTANT (RF-28, Ap. 6.3):
 * - Tota funció pública exposada a google.script.run comença amb requireRole_().
 * - Les funcions acabades en '_' són privades i el client no les pot cridar directament.
 * - La identitat s'obté sempre de Session.getActiveUser().getEmail() al servidor.
 */

import type { ApiResponse, UserProfile } from '../contracts/api';
import type { UserRole } from '../contracts/domain';

/**
 * Punt d'entrada de l'aplicació web d'Apps Script (RF-25, RF-27, Ap. 6.3).
 * Retorna el paquet HTML d'alumne, el de tutor o la pàgina d'accés denegat.
 */
export function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.HTML.HtmlOutput {
  const identity = resolveCurrentUserIdentity_();
  const requestedView = e?.parameter?.vista;

  if (identity.role === 'unauthorized') {
    return HtmlService.createHtmlOutput(
      '<!DOCTYPE html><html lang="ca"><head><meta charset="utf-8"><title>Accés no autoritzat</title></head>' +
        '<body style="font-family:sans-serif;padding:2rem;"><h1>Accés denegat</h1>' +
        '<p>El teu compte no té accés a aquesta instància de Mecano.</p></body></html>'
    ).setTitle('Mecano — Accés no autoritzat');
  }

  // El tutor pot previsualitzar la vista d'alumne amb ?vista=alumne (RF-27)
  if (
    (identity.role === 'tutor' || identity.role === 'support_teacher') &&
    requestedView !== 'alumne'
  ) {
    return HtmlService.createHtmlOutputFromFile('admin')
      .setTitle('Mecano — Panell del docent')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  }

  return HtmlService.createHtmlOutputFromFile('student')
    .setTitle('Mecano')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/**
 * Endpoint públic: retorna el perfil de l'usuari autenticat (Ap. 8).
 */
export function getProfile(): ApiResponse<UserProfile> {
  const auth = requireRole_(['student', 'tutor', 'support_teacher', 'admin']);
  if (!auth.ok || !auth.identity) {
    return {
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Usuari sense rol autoritzat a aquesta instància' },
    };
  }

  return {
    ok: true,
    data: {
      role: auth.identity.role,
      student_id: auth.identity.studentId,
      group: auth.identity.group,
      current_level: auth.identity.currentLevel ?? 'L01',
      settings: {
        fontSizeScale: 1,
        highContrast: false,
        dyslexiaFriendlyFont: false,
        reducedMotion: false,
        soundEnabled: false,
      },
      is_preview_mode: auth.identity.role !== 'student',
    },
  };
}

// ============================================================================
// Funcions privades de servidor (acabades en '_' — inaccessibles des del client)
// ============================================================================

interface ResolvedIdentity {
  email: string;
  role: UserRole;
  studentId?: string;
  group?: string;
  currentLevel?: string;
}

function requireRole_(allowedRoles: UserRole[]): { ok: boolean; identity?: ResolvedIdentity } {
  const identity = resolveCurrentUserIdentity_();
  if (!allowedRoles.includes(identity.role)) {
    return { ok: false };
  }
  return { ok: true, identity };
}

function resolveCurrentUserIdentity_(): ResolvedIdentity {
  const email = (Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (!email) {
    return { email: '', role: 'unauthorized' };
  }

  const props = PropertiesService.getScriptProperties();
  const tutorEmail = (props.getProperty('TUTOR_EMAIL') || '').trim().toLowerCase();

  if (tutorEmail && email === tutorEmail) {
    return { email, role: 'tutor', currentLevel: 'L01' };
  }

  // A M6 (Fase 2) es completarà la lectura de Config i Roster al llibre de Google Sheets
  return { email, role: 'unauthorized' };
}
