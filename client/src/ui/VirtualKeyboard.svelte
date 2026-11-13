<script lang="ts">
  /**
   * M3 — Teclat Català Visual (RF-10, RF-11, Ap. 5 Accessibilitat)
   * Mostra les files del teclat ISO-ES/Català amb les marques tàctils a F i J,
   * colors per dit i símbol/patró d'accessibilitat perquè no depengui només del color.
   */
  import type { FingerId, FingersConfig, KeyMapping } from '@contracts/domain';

  export let fingersConfig: FingersConfig;
  export let targetKeyCode: string | null = null;
  export let highlightTargetKey = true;
  export let highlightFingerColor = true;
  export let lastPressedCode: string | null = null;
  export let lastPressCorrect: boolean | null = null;

  const ROWS: string[][] = [
    ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'],
    ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Backslash'],
    ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'],
    ['Space'],
  ];

  const FINGER_SHORT_BADGE: Record<FingerId, string> = {
    'L-pinky': 'E5',
    'L-ring': 'E4',
    'L-middle': 'E3',
    'L-index': 'E2',
    thumb: 'P',
    'R-index': 'D2',
    'R-middle': 'D3',
    'R-ring': 'D4',
    'R-pinky': 'D5',
  };

  function getKey(code: string): KeyMapping | undefined {
    return fingersConfig.keys[code];
  }

  function getFingerColor(fingerId: FingerId): string {
    return fingersConfig.fingers[fingerId]?.colorHex ?? '#cccccc';
  }
</script>

<div class="keyboard" role="region" aria-label="Teclat visual de suport">
  {#each ROWS as row, rowIndex}
    <div class="kb-row kb-row-{rowIndex}">
      {#each row as code}
        {@const keyDef = getKey(code)}
        {#if keyDef}
          {@const isTarget = highlightTargetKey && targetKeyCode === code}
          {@const isFeedbackErr = lastPressedCode === code && lastPressCorrect === false}
          <div
            class="kb-key {code === 'Space' ? 'kb-space' : ''} {isTarget ? 'kb-target' : ''} {isFeedbackErr ? 'kb-err' : ''}"
            style="--finger-color: {highlightFingerColor ? getFingerColor(keyDef.finger) : '#e2e8f0'}"
            aria-current={isTarget ? 'step' : undefined}
          >
            <span class="kb-label">{keyDef.label}</span>
            {#if keyDef.isHomeKey}
              <span class="kb-home-dot" title="Posició base">{code === 'KeyF' || code === 'KeyJ' ? '▬' : '•'}</span>
            {/if}
            <span class="kb-finger-tag">{FINGER_SHORT_BADGE[keyDef.finger]}</span>
          </div>
        {/if}
      {/each}
    </div>
  {/each}
</div>

<style>
  .keyboard {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    background: var(--surface-card, #f8fafc);
    border: 2px solid var(--border-color, #cbd5e1);
    border-radius: 1rem;
    max-width: 760px;
    margin: 0 auto;
    user-select: none;
  }
  .kb-row {
    display: flex;
    justify-content: center;
    gap: 0.4rem;
  }
  .kb-key {
    position: relative;
    width: 3.4rem;
    height: 3.4rem;
    border-radius: 0.6rem;
    border: 2px solid #64748b;
    background: color-mix(in srgb, var(--finger-color) 25%, white);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: #0f172a;
  }
  .kb-space {
    width: 18rem;
  }
  .kb-target {
    border-width: 4px;
    border-color: #0f172a;
    background: var(--finger-color);
    box-shadow: 0 0 0 3px #fde047;
  }
  .kb-err {
    border-color: #b91c1c;
  }
  .kb-label {
    font-size: 1.15rem;
    line-height: 1;
  }
  .kb-home-dot {
    font-size: 0.7rem;
    line-height: 1;
    margin-top: 0.1rem;
    color: #1e293b;
  }
  .kb-finger-tag {
    position: absolute;
    bottom: 2px;
    right: 4px;
    font-size: 0.65rem;
    opacity: 0.85;
  }
</style>
