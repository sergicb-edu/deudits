<script lang="ts">
  /**
   * M3 — Mans Virtuals (RF-10, RF-11, RF-12)
   * Representació SVG clara i sense moviments bruscos que ressalta el dit actiu
   * amb el seu color i etiqueta en català.
   */
  import type { FingerId, FingersConfig } from '@contracts/domain';

  export let fingersConfig: FingersConfig;
  export let activeFinger: FingerId | null = null;

  const LEFT_FINGERS: { id: FingerId; x: number; y: number; h: number; label: string }[] = [
    { id: 'L-pinky', x: 25, y: 55, h: 65, label: 'E5' },
    { id: 'L-ring', x: 60, y: 35, h: 85, label: 'E4' },
    { id: 'L-middle', x: 95, y: 25, h: 95, label: 'E3' },
    { id: 'L-index', x: 130, y: 40, h: 80, label: 'E2' },
    { id: 'thumb', x: 170, y: 85, h: 55, label: 'P' },
  ];

  const RIGHT_FINGERS: { id: FingerId; x: number; y: number; h: number; label: string }[] = [
    { id: 'thumb', x: 30, y: 85, h: 55, label: 'P' },
    { id: 'R-index', x: 70, y: 40, h: 80, label: 'D2' },
    { id: 'R-middle', x: 105, y: 25, h: 95, label: 'D3' },
    { id: 'R-ring', x: 140, y: 35, h: 85, label: 'D4' },
    { id: 'R-pinky', x: 175, y: 55, h: 65, label: 'D5' },
  ];

  $: activeMeta = activeFinger ? fingersConfig.fingers[activeFinger] : null;
</script>

<div class="hands-panel" aria-live="polite">
  <div class="hands-caption">
    {#if activeMeta}
      Dit recomanat: <strong>{activeMeta.labelCa}</strong>
    {:else}
      Col·loca els dits a la fila base (A S D F — J K L Ñ)
    {/if}
  </div>

  <div class="hands-svg-row">
    <!-- Mà esquerra -->
    <svg viewBox="0 0 220 185" class="hand-svg" aria-label="Mà esquerra">
      <rect x="20" y="110" width="140" height="65" rx="28" fill="#e2e8f0" stroke="#475569" stroke-width="2" />
      {#each LEFT_FINGERS as f}
        {@const isCurrent = activeFinger === f.id}
        {@const color = fingersConfig.fingers[f.id]?.colorHex ?? '#cbd5e1'}
        <g>
          <rect
            x={f.x}
            y={f.y}
            width="26"
            height={f.h}
            rx="13"
            fill={isCurrent ? color : '#f1f5f9'}
            stroke="#0f172a"
            stroke-width={isCurrent ? 4 : 2}
          />
          <text x={f.x + 13} y={f.y + 22} text-anchor="middle" font-size="11" font-weight="bold" fill="#0f172a">
            {f.label}
          </text>
        </g>
      {/each}
      <text x="90" y="150" text-anchor="middle" font-size="13" font-weight="600" fill="#334155">Mà esquerra</text>
    </svg>

    <!-- Mà dreta -->
    <svg viewBox="0 0 220 185" class="hand-svg" aria-label="Mà dreta">
      <rect x="60" y="110" width="140" height="65" rx="28" fill="#e2e8f0" stroke="#475569" stroke-width="2" />
      {#each RIGHT_FINGERS as f}
        {@const isCurrent = activeFinger === f.id}
        {@const color = fingersConfig.fingers[f.id]?.colorHex ?? '#cbd5e1'}
        <g>
          <rect
            x={f.x}
            y={f.y}
            width="26"
            height={f.h}
            rx="13"
            fill={isCurrent ? color : '#f1f5f9'}
            stroke="#0f172a"
            stroke-width={isCurrent ? 4 : 2}
          />
          <text x={f.x + 13} y={f.y + 22} text-anchor="middle" font-size="11" font-weight="bold" fill="#0f172a">
            {f.label}
          </text>
        </g>
      {/each}
      <text x="130" y="150" text-anchor="middle" font-size="13" font-weight="600" fill="#334155">Mà dreta</text>
    </svg>
  </div>
</div>

<style>
  .hands-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.75rem;
  }
  .hands-caption {
    font-size: 1.05rem;
    padding: 0.35rem 0.9rem;
    background: #f1f5f9;
    border-radius: 999px;
    border: 1px solid #cbd5e1;
  }
  .hands-svg-row {
    display: flex;
    gap: 2rem;
    justify-content: center;
    flex-wrap: wrap;
  }
  .hand-svg {
    width: 210px;
    height: 170px;
  }
</style>
