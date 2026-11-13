<script lang="ts">
  /**
   * M3 — Aplicació principal de l'Alumne (Versió 0.3: «En Bit descobreix Catalunya»).
   * Inclou:
   * - Pas 0: Pantalla interactiva de col·locació de les mans (les 2 tecles noves + Espai)
   * - 5 Pantalles per nivell (P1 parelles noves + espai, P2 grups 3-4 noves + espai,
   *   P3 aventura noves, P4 aventura barrejada amb anteriors, P5 mestre)
   * - Escenari gamificat d'en Bit per Catalunya (Montsec, Castells, Sardana, Patum)
   * - Sistema de 5 Barretines (mínim 3 per avançar, rejugable fins a 5)
   * - El Termòmetre de la Dita Catalana (amb opció de dictat per síntesi de veu)
   */
  import { onMount } from 'svelte';
  import type {
    BarretinesCount,
    FingersConfig,
    KeyEvaluation,
    LevelConfig,
    LevelProgressRecord,
    ProverbBenchmarkRecord,
    SessionSummary,
    StudentSettings,
    SublevelConfig,
  } from '@contracts/domain';
  import { normalizeKeyboardInput, resolveFingerForChar } from '@client/core/keyboard';
  import { ExerciseSession } from '@client/core/engine';
  import { applySessionToProgress } from '@client/game/progress';
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
  let currentSublevelId = 'L01.1';
  let isProverbMode = false;
  let dictationMode = false;
  let freeUnlockMode = false;

  let prepModalOpen = false;
  let prepKeysPressed: Record<string, boolean> = {};
  let seenPrepByLevel: Record<string, boolean> = {};

  let sessionObj: ExerciseSession | null = null;
  let sequence = '';
  let words: string[] = [];
  let cursor = 0;
  let evaluations: KeyEvaluation[] = [];
  let startedAtMs = 0;
  let stimulusMs = 0;

  let lastPressedCode: string | null = null;
  let lastPressCorrect: boolean | null = null;
  let lastSummary: SessionSummary | null = null;
  let lastBarretines: BarretinesCount = 0;
  let encouragementMsg = '';
  let unlockedBadges: string[] = [];
  let proverbHistory: ProverbBenchmarkRecord[] = [];

  let progressByLevel: Record<string, LevelProgressRecord> = {};
  let settings: StudentSettings = {
    fontSizeScale: 1,
    highContrast: false,
    dyslexiaFriendlyFont: false,
    reducedMotion: true,
    soundEnabled: true,
  };
  let showHands = true;

  $: currentLevel = levels.find((l) => l.id === currentLevelId) ?? levels[0]!;
  $: sublevels = currentLevel.sublevels ?? [];
  $: currentSublevel =
    sublevels.find((s) => s.id === currentSublevelId) ?? sublevels[0]!;
  $: expectedChar = cursor < sequence.length ? sequence[cursor]! : null;
  $: expectedResolved = expectedChar
    ? resolveFingerForChar(expectedChar, fingersConfig)
    : null;
  $: completedWordsCount =
    cursor >= sequence.length && sequence.length > 0
      ? words.length
      : (sequence.slice(0, cursor).match(/ /g) ?? []).length;

  function getSublevelBarretines(lvlId: string, subId: string): BarretinesCount {
    return progressByLevel[lvlId]?.sublevels_barretines?.[subId] ?? 0;
  }

  function isSublevelUnlocked(lvl: LevelConfig, subIndex: number): boolean {
    if (freeUnlockMode) return true;
    if (lvl.order === 1 && subIndex === 0) return true;
    const subs = lvl.sublevels ?? [];
    if (subIndex > 0) {
      const prevSub = subs[subIndex - 1];
      return prevSub ? getSublevelBarretines(lvl.id, prevSub.id) >= 3 : true;
    }
    const prevLvl = levels.find((l) => l.order === lvl.order - 1);
    if (!prevLvl || !prevLvl.sublevels?.length) return true;
    const lastPrevSub = prevLvl.sublevels[prevLvl.sublevels.length - 1]!;
    return getSublevelBarretines(prevLvl.id, lastPrevSub.id) >= 3;
  }

  function startSublevel(
    levelId = currentLevelId,
    sublevelId?: string,
    proverb = false,
    seed = Date.now() & 0xfffffff
  ) {
    currentLevelId = levelId;
    const lvl = levels.find((l) => l.id === levelId) ?? levels[0]!;
    const subs = lvl.sublevels ?? [];
    const targetSub: SublevelConfig | undefined =
      subs.find((s) => s.id === sublevelId) ?? subs[0];

    currentSublevelId = targetSub?.id ?? `${levelId}.1`;
    isProverbMode = proverb;

    if (proverb && lvl.theme?.proverbCa) {
      sessionObj = new ExerciseSession(lvl, fingersConfig, seed, {
        customText: lvl.theme.proverbCa,
      });
    } else {
      sessionObj = new ExerciseSession(lvl, fingersConfig, seed, {
        sublevel: targetSub,
      });
    }

    sequence = sessionObj.getSequence();
    words = sequence.split(' ');
    cursor = 0;
    evaluations = [];
    lastPressedCode = null;
    lastPressCorrect = null;
    lastSummary = null;
    encouragementMsg = '';
    startedAtMs = performance.now();
    stimulusMs = startedAtMs;

    if (!seenPrepByLevel[levelId] && !proverb) {
      seenPrepByLevel[levelId] = true;
      prepKeysPressed = {};
      prepModalOpen = true;
    } else {
      prepModalOpen = false;
    }
  }

  function speakProverb() {
    const text = currentLevel.theme?.proverbCa;
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ca-ES';
    utter.rate = 0.85;
    window.speechSynthesis.speak(utter);
  }

  async function handleKeydown(ev: KeyboardEvent) {
    if (prepModalOpen) {
      if (ev.key === ' ') ev.preventDefault();
      const k = ev.key === ' ' ? ' ' : ev.key.toLowerCase();
      if (currentLevel.newKeys.includes(k) || k === ' ') {
        prepKeysPressed = { ...prepKeysPressed, [k]: true };
        const allReady =
          currentLevel.newKeys.every((nk) => prepKeysPressed[nk]) &&
          Boolean(prepKeysPressed[' ']);
        if (allReady) {
          prepModalOpen = false;
          startedAtMs = performance.now();
          stimulusMs = startedAtMs;
        }
      }
      return;
    }

    if (!sessionObj || sessionObj.isCompleted() || !expectedChar) return;
    if (ev.key === ' ') ev.preventDefault();

    const payload = normalizeKeyboardInput(
      {
        code: ev.code,
        key: ev.key.toLowerCase(),
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
      mode: isProverbMode ? 'proverb' : 'adventure',
      deviceType: 'chromebook',
      appVersion: '0.3.0',
      sublevelId: isProverbMode ? `${currentLevel.id}.proverb` : currentSublevelId,
    });

    lastSummary = summary;
    lastBarretines = summary.barretines ?? 1;

    if (isProverbMode && currentLevel.theme) {
      proverbHistory = [
        ...proverbHistory,
        {
          level_id: currentLevel.id,
          proverb_text: currentLevel.theme.proverbCa,
          wpm: summary.wpm,
          accuracy: summary.accuracy,
          barretines: lastBarretines,
          completed_at: summary.started_at,
        },
      ];
    }

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

    startSublevel(currentLevelId, `${currentLevelId}.1`, false, 20261113);
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<main
  class="app-shell {settings.highContrast ? 'high-contrast' : ''} {settings.dyslexiaFriendlyFont ? 'dyslexia-font' : ''}"
  style="--font-scale: {settings.fontSizeScale}"
>
  <header class="topbar">
    <div>
      <h1 class="app-title">🤖 Mecano — En Bit descobreix Catalunya</h1>
      <p class="subtitle">{currentLevel.titleCa}</p>
    </div>

    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;">
      <button type="button" class="lvl-pill" on:click={() => { prepKeysPressed = {}; prepModalOpen = true; }}>
        🖐️ Posició dits
      </button>
      <button
        type="button"
        class="lvl-pill {freeUnlockMode ? 'active' : ''}"
        on:click={() => (freeUnlockMode = !freeUnlockMode)}
      >
        🔓 Mode lliure: {freeUnlockMode ? 'Sí' : 'No'}
      </button>
      <AccessibilityBar {settings} {showHands} onChange={handleSettingsChange} />
    </div>
  </header>

  <section class="nav-card" aria-label="Mapa de Catalunya i les 5 pantalles">
    <div class="level-selector">
      {#each levels as lvl}
        <button
          type="button"
          class="lvl-pill {lvl.id === currentLevelId ? 'active' : ''}"
          on:click={() => startSublevel(lvl.id, lvl.sublevels?.[0]?.id, false)}
        >
          {lvl.id}: {lvl.theme?.locationCa ?? lvl.titleCa}
        </button>
      {/each}
    </div>

    <div class="sublevel-selector">
      {#each sublevels as sub, idx}
        {@const unlocked = isSublevelUnlocked(currentLevel, idx)}
        {@const b = getSublevelBarretines(currentLevel.id, sub.id)}
        <button
          type="button"
          class="lvl-pill {!isProverbMode && sub.id === currentSublevelId ? 'active' : ''}"
          disabled={!unlocked}
          on:click={() => startSublevel(currentLevel.id, sub.id, false)}
        >
          {unlocked ? '' : '🔒 '}P{sub.screenNumber} {b > 0 ? `(${b}/5 Barretines)` : ''}
        </button>
      {/each}

      {#if currentLevel.theme?.proverbCa}
        <button
          type="button"
          class="lvl-pill {isProverbMode ? 'active' : ''}"
          on:click={() => startSublevel(currentLevel.id, currentSublevelId, true)}
        >
          📜 Dita Catalana (Termòmetre)
        </button>
      {/if}
    </div>
  </section>

  {#if prepModalOpen}
    <section class="summary-banner" role="dialog" aria-label="Pas 0: Posició dels dits">
      <h2>🖐️ Pas 0: Prepara les mans amb en Bit!</h2>
      <p>
        Col·loca els dits a la fila base. Prem les tecles noves
        <strong>{currentLevel.newKeys.map((k) => k.toUpperCase()).join(' i ')}</strong>
        i la <strong>barra d'Espai</strong> amb els polzes per activar en Bit!
      </p>
      <div class="metrics-row">
        {#each [...currentLevel.newKeys, ' '] as k}
          <span class="badge-chip">
            {prepKeysPressed[k] ? '✅' : '👉'} {k === ' ' ? 'Espai (Polzes)' : `Tecla ${k.toUpperCase()}`}
          </span>
        {/each}
      </div>
      <button type="button" class="primary-btn" on:click={() => (prepModalOpen = false)}>
        Començar ara
      </button>
    </section>
  {/if}

  <section class="stage-banner" aria-label="Escenari d'en Bit">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;">
      <strong>🤖 {currentLevel.theme?.traditionCa ?? currentLevel.titleCa}</strong>
      <span>Obstacles superats: <strong>{completedWordsCount} / {words.length}</strong></span>
    </div>
    <div class="obstacles-row">
      {#each words as w, wIdx}
        <span class="obs-chip {wIdx < completedWordsCount ? 'obs-done' : wIdx === completedWordsCount ? 'obs-current' : ''}">
          {wIdx < completedWordsCount ? '✨' : '🎯'} {dictationMode && wIdx >= completedWordsCount ? '•••' : w}
        </span>
      {/each}
    </div>
  </section>

  <section class="exercise-card" aria-label="Seqüència d'exercici">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;margin-bottom:0.5rem;">
      <strong>{isProverbMode ? `📜 Dita: "${currentLevel.theme?.proverbCa}"` : currentSublevel?.titleCa}</strong>
      <div style="display:flex;gap:0.4rem;">
        {#if isProverbMode}
          <button type="button" class="secondary-btn" on:click={speakProverb}>🔊 Escoltar dita</button>
          <button type="button" class="secondary-btn" on:click={() => (dictationMode = !dictationMode)}>
            🙈 Mode Dictat: {dictationMode ? 'Sí' : 'No'}
          </button>
        {/if}
        <button type="button" class="secondary-btn" on:click={() => startSublevel(currentLevelId, currentSublevelId, isProverbMode)}>
          Reiniciar
        </button>
      </div>
    </div>

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
          {char === ' ' ? '␣' : dictationMode && idx >= cursor ? '•' : char}
        </span>
      {/each}
    </div>
  </section>

  {#if lastSummary}
    <section class="summary-banner" role="status" aria-live="polite">
      <h2>
        Pantalla completada! Has guanyat {lastBarretines} / 5 Barretines!
      </h2>
      <p>{encouragementMsg}</p>
      <div class="metrics-row">
        <span>Precisió: <strong>{Math.round(lastSummary.accuracy * 100)}%</strong></span>
        <span>Errors: <strong>{lastSummary.errors_total}</strong></span>
        <span>Velocitat: <strong>{lastSummary.wpm} ppm</strong></span>
      </div>
      <button type="button" class="primary-btn" on:click={() => startSublevel(currentLevelId, currentSublevelId, isProverbMode)}>
        Repetir per buscar les 5 Barretines
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
    font-size: calc(15px * var(--font-scale, 1));
    color: #0f172a;
    background: #f8fafc;
    min-height: 100vh;
    padding: 0.75rem 1.25rem;
    box-sizing: border-box;
  }
  .app-shell.high-contrast { background: #000000; color: #ffffff; }
  .app-shell.dyslexia-font { letter-spacing: 0.08em; word-spacing: 0.16em; }
  .topbar, .nav-card, .stage-banner, .exercise-card, .summary-banner {
    max-width: 860px;
    margin: 0 auto 0.75rem;
    background: #ffffff;
    border: 2px solid #cbd5e1;
    border-radius: 1rem;
    padding: 0.75rem 1.1rem;
  }
  .topbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; }
  .app-title { margin: 0; font-size: 1.35rem; }
  .subtitle { margin: 0.1rem 0 0; color: #475569; font-size: 0.9rem; }
  .level-selector, .sublevel-selector, .obstacles-row {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    margin-top: 0.4rem;
  }
  .lvl-pill {
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    border: 2px solid #334155;
    background: #ffffff;
    font-weight: 700;
    cursor: pointer;
  }
  .lvl-pill.active { background: #1d4ed8; color: #ffffff; border-color: #1e3a8a; }
  .obs-chip {
    padding: 0.25rem 0.6rem;
    border-radius: 0.5rem;
    background: #f1f5f9;
    border: 1px solid #94a3b8;
    font-family: ui-monospace, monospace;
    font-weight: 700;
  }
  .obs-current { background: #fef08a; border-color: #0f172a; }
  .obs-done { background: #dcfce7; color: #166534; }
  .prompt-tape {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    padding: 0.75rem;
    background: #f1f5f9;
    border-radius: 0.75rem;
    font-family: ui-monospace, Consolas, monospace;
    font-size: 1.5em;
  }
  .prompt-char {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.7rem;
    height: 2.2rem;
    border-radius: 0.35rem;
    padding: 0 0.2rem;
    border: 2px solid transparent;
  }
  .char-current { background: #fef08a; border-color: #0f172a; font-weight: 800; }
  .char-ok { background: #dcfce7; color: #166534; }
  .char-err { background: #fee2e2; color: #991b1b; text-decoration: underline wavy; }
  .metrics-row { display: flex; justify-content: center; gap: 1rem; margin: 0.6rem 0; flex-wrap: wrap; }
  .badge-chip { background: #fef9c3; border: 1px solid #ca8a04; padding: 0.3rem 0.75rem; border-radius: 999px; font-weight: 700; }
  .primary-btn, .secondary-btn { padding: 0.4rem 0.85rem; border-radius: 0.5rem; font-weight: 700; cursor: pointer; }
  .primary-btn { background: #b91c1c; color: #ffffff; border: none; }
  .secondary-btn { background: #f1f5f9; border: 1px solid #64748b; }
</style>
