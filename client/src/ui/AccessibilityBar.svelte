<script lang="ts">
  /**
   * M3/M9 — Barra d'accessibilitat (Ap. 5, T1.6):
   * Permet ajustar mida de lletra, alt contrast, tipografia clara i mostrar/ocultar mans.
   */
  import type { StudentSettings } from '@contracts/domain';

  export let settings: StudentSettings;
  export let showHands = true;
  export let onChange: (updated: StudentSettings, showHands: boolean) => void;

  function cycleFontSize() {
    const next: 1 | 1.25 | 1.5 =
      settings.fontSizeScale === 1 ? 1.25 : settings.fontSizeScale === 1.25 ? 1.5 : 1;
    settings = { ...settings, fontSizeScale: next };
    onChange(settings, showHands);
  }

  function toggleHighContrast() {
    settings = { ...settings, highContrast: !settings.highContrast };
    onChange(settings, showHands);
  }

  function toggleDyslexiaFont() {
    settings = { ...settings, dyslexiaFriendlyFont: !settings.dyslexiaFriendlyFont };
    onChange(settings, showHands);
  }

  function toggleHands() {
    showHands = !showHands;
    onChange(settings, showHands);
  }
</script>

<nav class="a11y-bar" aria-label="Opcions d'accessibilitat i ajudes visuals">
  <button type="button" class="a11y-btn" on:click={cycleFontSize}>
    Mida lletra: {Math.round(settings.fontSizeScale * 100)}%
  </button>
  <button
    type="button"
    class="a11y-btn"
    aria-pressed={settings.highContrast}
    on:click={toggleHighContrast}
  >
    Alt contrast: {settings.highContrast ? 'Sí' : 'No'}
  </button>
  <button
    type="button"
    class="a11y-btn"
    aria-pressed={settings.dyslexiaFriendlyFont}
    on:click={toggleDyslexiaFont}
  >
    Lletra espaiada: {settings.dyslexiaFriendlyFont ? 'Sí' : 'No'}
  </button>
  <button type="button" class="a11y-btn" aria-pressed={showHands} on:click={toggleHands}>
    Mans guia: {showHands ? 'Visibles' : 'Ocultes'}
  </button>
</nav>

<style>
  .a11y-bar {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: center;
  }
  .a11y-btn {
    padding: 0.4rem 0.75rem;
    border-radius: 0.5rem;
    border: 2px solid #475569;
    background: #ffffff;
    color: #0f172a;
    font-weight: 600;
    cursor: pointer;
  }
  .a11y-btn[aria-pressed='true'] {
    background: #0f172a;
    color: #ffffff;
  }
</style>
