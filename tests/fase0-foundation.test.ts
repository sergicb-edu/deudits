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

describe('Fase 0 — Contractes i Contingut Inicial (Versió 0.3)', () => {
  it('valida levels.json i comprova que cada nivell té 5 pantalles (sublevels), dita catalana i 3 barretines mínimes', () => {
    const result = validateLevelsFile(levelsJson);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);

    const l01 = levelsJson.levels.find((l) => l.id === 'L01');
    expect(l01).toBeDefined();
    expect(l01?.newKeys).toEqual(['f', 'j']);
    expect(l01?.sublevels?.length).toBe(5);
    expect(l01?.passCriteria.minBarretinesToUnlockNext).toBe(3);
    expect(l01?.theme?.proverbCa).toBe('qui dia passa any empeny');
  });

  it('valida fingers.json per al teclat català (F -> L-index, J -> R-index, Ç -> R-pinky, Space -> thumb)', () => {
    const result = validateFingersConfig(fingersJson);
    expect(result.valid).toBe(true);
    expect(fingersJson.keys.KeyF.finger).toBe('L-index');
    expect(fingersJson.keys.KeyJ.finger).toBe('R-index');
    expect(fingersJson.keys.Backslash.charNormal).toBe('ç');
    expect(fingersJson.keys.Backslash.finger).toBe('R-pinky');
    expect(fingersJson.keys.Space.finger).toBe('thumb');
  });
});

describe('Fase 0 — Adaptador API Mock Local, Idempotència i Rols (T0.5)', () => {
  const makeSampleSession = (id: string, accuracy = 0.96): SessionSummary => ({
    session_id: id,
    level_id: 'L01',
    sublevel_id: 'L01.1',
    started_at: '2026-11-13T09:30:00Z',
    duration_s: 120,
    mode: 'practice',
    chars_total: 30,
    errors_total: Math.round(30 * (1 - accuracy)),
    accuracy,
    wpm: 12,
    stars: accuracy >= 0.95 ? 3 : 2,
    barretines: accuracy >= 0.98 ? 5 : accuracy >= 0.94 ? 4 : 3,
    completed: true,
    device_type: 'chromebook',
    app_version: '0.3.0',
    key_stats: [
      { key_code: 'KeyF', finger: 'L-index', presses: 10, errors: 0, avg_latency_ms: 650 },
      { key_code: 'KeyJ', finger: 'R-index', presses: 10, errors: 1, avg_latency_ms: 620 },
      { key_code: 'Space', finger: 'thumb', presses: 10, errors: 0, avg_latency_ms: 500 },
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

  it('desbloqueja L02 després de 3 sessions qualificades (RF-14)', async () => {
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
