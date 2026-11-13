<script lang="ts">
  /**
   * M3 — Aplicació principal de l'Alumne (Fase 1 MVP: T1.1..T1.6).
   * Integra M1 (Teclat), M2 (Motor amb llavor), M3 (Teclat + Mans virtuals),
   * M4 (Estrelles i superació de nivell) i M5 (Persistència local i cua de sincronització).
   */
  import { onMount } from 'svelte';
  import type {
    FingersConfig,
    KeyEvaluation,
    LevelConfig,
    LevelProgressRecord,
    SessionSummary,
    StudentSettings,
  } from '@contracts/domain';
  import { normalizeKeyboardInput, resolveFingerForChar } from '@client/core/keyboard';
  import { ExerciseSession } from '@client/core/engine';
  import { applySessionToProgress, BADGE_CATALOG } from '@client/game/progress';
  import { createApiClient } from '@client/storage/apiClient';
  import { SessionSyncQueue } from '@client/storage/syncQueue';
  import VirtualKeyboard from '@client/ui/VirtualKeyboard.svelte';
  import VirtualHands from '@client/ui/VirtualHands.svelte';
  import AccessibilityBar from '@client/ui/AccessibilityBar.svelte';
  import levelsFileJson from '@content/levels.json';
  import fingersConfigJson from '@content/fingers.json';

  const api = createApiClient();
  const syncQueue = new SessionSyncQueue(api);

  let levels: LevelConfig[] = levelsFileJson.levels as unknown as LevelConfig[];
  let fingersConfig: FingersConfig = fingersConfigJson as unknown as FingersConfig;

  let currentLevelId = 'L01';
  let currentSeed = 20261113;
  let sessionObj: ExerciseSession | null = null;
  let sequence = '';
  let cursor = 0;
  let evaluations: KeyEvaluation[] = [];
  let startedAtMs = 0;
  let stimulusMs = 0;

  let lastPressedCode: string | null = null;
  let lastPressCorrect: boolean | null = null;
  let lastSummary: SessionSummary | null = null;
  let encouragementMsg = '';
  let unlockedBadges: string[] = [];

  let progressByLevel: Record<string, LevelProgressRecord> = {};
  let settings: StudentSettings = {
    fontSizeScale: 1,
    highContrast: false,
    dyslexiaFriendlyFont: false,
    reducedMotion: true,
    soundEnabled: false,
  };
  let showHands = true;

  $: currentLevel = levels.find((l) => l.id === currentLevelId) ?? levels[0]!;
  $: expectedChar = cursor < sequence.length ? sequence[cursor]! : null;
  $: expectedResolved = expectedChar
    ? resolveFingerForChar(expectedChar, fingersConfig)
    : null;
  $: currentLevelProgress = progressByLevel[currentLevelId];

  function startNewExercise(levelId = currentLevelId, seed = Date.now() & 0xfffffff) {
    currentLevelId = levelId;
    currentSeed = seed;
    const lvl = levels.find((l) => l.id === levelId) ?? levels[0]!;
    sessionObj = new ExerciseSession(lvl, fingersConfig, seed);
    sequence = sessionObj.getSequence();
    cursor = 0;
    evaluations = [];
    lastPressedCode = null;
    lastPressCorrect = null;
    lastSummary = null;
    encouragementMsg = '';
    startedAtMs = performance.now();
    stimulusMs = startedAtMs;
  }

  async function handleKeydown(ev: KeyboardEvent) {
    if (!sessionObj || sessionObj.isCompleted() || !expectedChar) return;
    if (ev.key === ' ') {
      ev.preventDefault();
    }

    const payload = normalizeKeyboardInput(
      {
        code: ev.code,
        key: ev.key,
        timeStamp: performance.now(),
        repeat: ev.repeat,
      },
      expectedChar,
      stimulusMs,
      fingersConfig
    );

    if (!payload) return;

    const evalResult = sessionObj.evaluate(payload);
    evaluations = [...sessionObj.getEvaluations()];
    cursor = sessionObj.getCursorIndex();
    lastPressedCode = ev.code;
    lastPressCorrect = evalResult.correct;
    stimulusMs = performance.now();

    if (sessionObj.isCompleted()) {
      await finishExercise();
    }
  }

  async function finishExercise() {
    if (!sessionObj) return;
    const durationSeconds = Math.max(1, (performance.now() - startedAtMs) / 1000);
    const summary = sessionObj.summary({
      sessionId: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      startedAtIso: new Date().toISOString(),
      durationSeconds,
      mode: 'practice',
      deviceType: 'chromebook',
      appVersion: '0.1.0',
    });

    lastSummary = summary;

    const prevRecord = progressByLevel[currentLevel.id];
    const totalBefore = Object.values(progressByLevel).reduce(
      (acc, r) => acc + r.sessions_count,
      0
    );

    const applied = applySessionToProgress(
      summary,
      currentLevel,
      levels,
      prevRecord,
      totalBefore,
      unlockedBadges
    );

    progressByLevel = {
      ...progressByLevel,
      [currentLevel.id]: applied.updatedLevelProgress,
    };

    if (applied.newlyUnlockedLevelId && !progressByLevel[applied.newlyUnlockedLevelId]) {
      progressByLevel[applied.newlyUnlockedLevelId] = {
        student_id: prevRecord?.student_id ?? 'A01',
        level_id: applied.newlyUnlockedLevelId,
        status: 'unlocked',
        best_accuracy: 0,
        best_stars: 0,
        qualifying_sessions_count: 0,
        sessions_count: 0,
      };
    }

    if (applied.newlyUnlockedBadges.length > 0) {
      unlockedBadges = [
        ...unlockedBadges,
        ...applied.newlyUnlockedBadges.map((b) => b.id),
      ];
    }

    encouragementMsg = applied.encouragementMessageCa;
    syncQueue.saveLocalProgressSnapshot(progressByLevel);
    await syncQueue.enqueueAndFlush(summary);
  }

  function handleSettingsChange(updated: StudentSettings, handsVisible: boolean) {
    settings = updated;
    showHands = handsVisible;
    syncQueue.saveLocalSettings(updated);
  }

  onMount(async () => {
    const savedSettings = syncQueue.loadLocalSettings();
    if (savedSettings) settings = savedSettings;

    const savedProgress = syncQueue.loadLocalProgressSnapshot();
    if (savedProgress) {
      progressByLevel = savedProgress;
    } else {
      const boot = await api.getBootstrapData();
      if (boot.ok && boot.data) {
        progressByLevel = boot.data.progress.levels;
        currentLevelId = boot.data.profile.current_level;
      }
    }

    startNewExercise(currentLevelId, 20261113);
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<main
  class="app-shell {settings.highContrast ? 'high-contrast' : ''} {settings.dyslexiaFriendlyFont ? 'dyslexia-font' : ''}"
  style="--font-scale: {settings.fontSizeScale}"
>
  <header class="topbar">
    <div>
      <h1 class="app-title">Mecano</h1>
      <p class="subtitle">{currentLevel.titleCa}</p>
    </div>

    <div class="level-selector" role="group" aria-label="Selector de nivell">
      {#each levels as lvl}
        {@const st = progressByLevel[lvl.id]?.status ?? (lvl.order === 1 ? 'unlocked' : 'locked')}
        <button
          type="button"
          class="lvl-pill {lvl.id === currentLevelId ? 'active' : ''}"
          on:click={() => startNewExercise(lvl.id)}
        >
          {lvl.id}
          {#if st === 'completed'}★{:else if st === 'unlocked' || st === 'in_progress'}•{/if}
        </button>
      {/each}
    </div>

    <AccessibilityBar {settings} {showHands} onChange={handleSettingsChange} />
  </header>

  <section class="exercise-card" aria-label="Seqüència d'exercici">
    <p class="pedagogical-hint">{currentLevel.descriptionCa}</p>

    <div class="prompt-tape" aria-live="off">
      {#each sequence.split('') as char, idx}
        {@const ev = evaluations[idx]}
        {@const stateClass =
          idx < cursor
            ? ev?.correct
              ? 'char-ok'
              : 'char-err'
            : idx === cursor
              ? 'char-current'
              : 'char-pending'}
        <span class="prompt-char {stateClass}">
          {char === ' ' ? '␣' : char}
        </span>
      {/each}
    </div>

    <div class="status-strip">
      <span>Pas: <strong>{cursor} / {sequence.length}</strong></span>
      <span>
        Sessions superades (≥95%):
        <strong>{currentLevelProgress?.qualifying_sessions_count ?? 0} / {currentLevel.passCriteria.requiredSessions}</strong>
      </span>
      <button type="button" class="secondary-btn" on:click={() => startNewExercise(currentLevelId)}>
        Reiniciar exercici
      </button>
    </div>
  </section>

  {#if lastSummary}
    <section class="summary-banner" role="status" aria-live="polite">
      <h2>
        Exercici completat! {'★'.repeat(lastSummary.stars)}{'☆'.repeat(3 - lastSummary.stars)}
      </h2>
      <p>{encouragementMsg}</p>
      <div class="metrics-row">
        <span>Precisió: <strong>{Math.round(lastSummary.accuracy * 100)}%</strong></span>
        <span>Errors: <strong>{lastSummary.errors_total}</strong></span>
        <span>Temps: <strong>{lastSummary.duration_s}s</strong></span>
      </div>
      {#if unlockedBadges.length > 0}
        <div class="badges-row">
          {#each unlockedBadges as badgeId}
            {@const b = BADGE_CATALOG[badgeId]}
            {#if b}
              <span class="badge-chip">{b.iconSymbol} {b.titleCa}</span>
            {/if}
          {/each}
        </div>
      {/if}
      <button type="button" class="primary-btn" on:click={() => startNewExercise(currentLevelId)}>
        Practicar una altra vegada (Espai o clic)
      </button>
    </section>
  {/if}

  <VirtualKeyboard
    {fingersConfig}
    targetKeyCode={expectedResolved?.code ?? null}
    highlightTargetKey={currentLevel.defaultAids.highlightTargetKey}
    highlightFingerColor={currentLevel.defaultAids.highlightFingerColor}
    {lastPressedCode}
    {lastPressCorrect}
  />

  {#if showHands}
    <VirtualHands {fingersConfig} activeFinger={expectedResolved?.finger ?? null} />
  {/if}
</main>

<style>
  .app-shell {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: calc(16px * var(--font-scale, 1));
    color: #0f172a;
    background: #f8fafc;
    min-height: 100vh;
    padding: 1rem 1.5rem;
    box-sizing: border-box;
  }
  .app-shell.high-contrast {
    background: #000000;
    color: #ffffff;
  }
  .app-shell.dyslexia-font {
    letter-spacing: 0.08em;
    word-spacing: 0.16em;
  }
  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .app-title {
    margin: 0;
    font-size: 1.5rem;
  }
  .subtitle {
    margin: 0.15rem 0 0;
    color: #475569;
  }
  .level-selector {
    display: flex;
    gap: 0.4rem;
  }
  .lvl-pill {
    padding: 0.4rem 0.8rem;
    border-radius: 999px;
    border: 2px solid #334155;
    background: #ffffff;
    font-weight: 700;
    cursor: pointer;
  }
  .lvl-pill.active {
    background: #1d4ed8;
    color: #ffffff;
    border-color: #1e3a8a;
  }
  .exercise-card {
    background: #ffffff;
    border: 2px solid #cbd5e1;
    border-radius: 1rem;
    padding: 1rem 1.25rem;
    max-width: 760px;
    margin: 0 auto 1rem;
  }
  .pedagogical-hint {
    margin: 0 0 0.75rem;
    color: #334155;
  }
  .prompt-tape {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    padding: 0.85rem;
    background: #f1f5f9;
    border-radius: 0.75rem;
    font-family: ui-monospace, 'Cascadia Code', Consolas, monospace;
    font-size: 1.65em;
  }
  .prompt-char {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.8rem;
    height: 2.3rem;
    border-radius: 0.4rem;
    padding: 0 0.25rem;
    border: 2px solid transparent;
  }
  .char-current {
    background: #fef08a;
    border-color: #0f172a;
    font-weight: 800;
  }
  .char-ok {
    background: #dcfce7;
    color: #166534;
  }
  .char-err {
    background: #fee2e2;
    color: #991b1b;
    text-decoration: underline wavy;
  }
  .status-strip {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.75rem;
    font-size: 0.95rem;
  }
  .summary-banner {
    max-width: 760px;
    margin: 0 auto 1rem;
    padding: 1rem 1.25rem;
    border-radius: 1rem;
    background: #eff6ff;
    border: 2px solid #3b82f6;
    text-align: center;
  }
  .metrics-row,
  .badges-row {
    display: flex;
    justify-content: center;
    gap: 1.25rem;
    margin: 0.6rem 0;
    flex-wrap: wrap;
  }
  .badge-chip {
    background: #fef9c3;
    border: 1px solid #ca8a04;
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
    font-weight: 700;
  }
  .primary-btn,
  .secondary-btn {
    padding: 0.45rem 0.9rem;
    border-radius: 0.5rem;
    font-weight: 700;
    cursor: pointer;
  }
  .primary-btn {
    background: #1d4ed8;
    color: #ffffff;
    border: none;
  }
  .secondary-btn {
    background: #f1f5f9;
    border: 1px solid #64748b;
  }
</style>
