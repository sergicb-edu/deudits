import { describe, expect, it } from 'vitest';
import levelsJson from '../content/levels.json';
import fingersJson from '../content/fingers.json';
import {
  validateFingersConfig,
  validateLevelsFile,
  validateSessionSummary,
} from '../contracts/validators';
import { LocalMockApiClient } from '../client/src/storage/apiClient';
import type { SessionSummary } from '../contracts/domain';

describe('Fase 0 — Contractes i Contingut Inicial (T0.3, T0.6)', () => {
  it('valida levels.json i comprova que L01 treballa f i j amb precisió >= 95% en 3 sessions', () => {
    const result = validateLevelsFile(levelsJson);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);

    const l01 = levelsJson.levels.find((l) => l.id === 'L01');
    expect(l01).toBeDefined();
    expect(l01?.newKeys).toEqual(['f', 'j']);
    expect(l01?.passCriteria.minAccuracy).toBe(0.95);
    expect(l01?.passCriteria.requiredSessions).toBe(3);
    expect(l01?.passCriteria.scoreSpeed).toBe(false);
  });

  it('valida fingers.json per al teclat català (F -> L-index, J -> R-index, Ç -> R-pinky)', () => {
    const result = validateFingersConfig(fingersJson);
    expect(result.valid).toBe(true);
    expect(fingersJson.keys.KeyF.finger).toBe('L-index');
    expect(fingersJson.keys.KeyJ.finger).toBe('R-index');
    expect(fingersJson.keys.Backslash.charNormal).toBe('ç');
    expect(fingersJson.keys.Backslash.finger).toBe('R-pinky');
  });
});

describe('Fase 0 — Adaptador API Mock Local, Idempotència i Rols (T0.5)', () => {
  const makeSampleSession = (id: string, accuracy = 0.96): SessionSummary => ({
    session_id: id,
    level_id: 'L01',
    started_at: '2026-11-13T09:30:00Z',
    duration_s: 180,
    mode: 'practice',
    chars_total: 40,
    errors_total: Math.round(40 * (1 - accuracy)),
    accuracy,
    wpm: 12,
    stars: accuracy >= 0.95 ? 3 : 2,
    completed: true,
    device_type: 'chromebook',
    app_version: '0.1.0',
    key_stats: [
      { key_code: 'KeyF', finger: 'L-index', presses: 20, errors: 1, avg_latency_ms: 650 },
      { key_code: 'KeyJ', finger: 'R-index', presses: 20, errors: 1, avg_latency_ms: 620 },
    ],
  });

  it('garanteix idempotència per session_id en reenviar la mateixa sessió (RF-20)', async () => {
    const api = new LocalMockApiClient('student');
    const session = makeSampleSession('uuid-session-0001');

    const first = await api.saveSession(session);
    expect(first.ok).toBe(true);
    expect(first.data?.deduplicated).toBe(false);
    expect(first.data?.updated_progress.sessions_count).toBe(1);

    const duplicate = await api.saveSession(session);
    expect(duplicate.ok).toBe(true);
    expect(duplicate.data?.deduplicated).toBe(true);
    expect(duplicate.data?.updated_progress.sessions_count).toBe(1);
  });

  it('desbloqueja L02 després de 3 sessions amb precisió >= 95% (RF-14)', async () => {
    const api = new LocalMockApiClient('student');

    await api.saveSession(makeSampleSession('uuid-session-0001', 0.96));
    await api.saveSession(makeSampleSession('uuid-session-0002', 0.95));
    const third = await api.saveSession(makeSampleSession('uuid-session-0003', 0.98));

    expect(third.ok).toBe(true);
    expect(third.data?.updated_progress.status).toBe('completed');
    expect(third.data?.unlocked_next_level_id).toBe('L02');
  });

  it('no desa dades quan el tutor previsualitza la vista d’alumne (RF-27)', async () => {
    const previewApi = new LocalMockApiClient('tutor', true);
    await previewApi.saveSession(makeSampleSession('uuid-preview-0001', 0.98));

    const progress = await previewApi.getMyProgress();
    expect(progress.data?.total_sessions).toBe(0);
  });

  it('impedeix que un alumne consulti endpoints de docent (RF-24, RF-28)', async () => {
    const studentApi = new LocalMockApiClient('student');
    const forbidden = await studentApi.getGroupSummary();
    expect(forbidden.ok).toBe(false);
    expect(forbidden.error?.code).toBe('FORBIDDEN');

    const validSessionCheck = validateSessionSummary(makeSampleSession('uuid-valid-1234'));
    expect(validSessionCheck.valid).toBe(true);
  });
});
