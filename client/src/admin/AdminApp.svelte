<script lang="ts">
  /**
   * M7 — Panell del Docent (Fase 2).
   * Mostra KPIs, matriu de Barretines per nivell i fase (1A, 1B, J1, J2, Dita),
   * evolució de les Dites Catalanes, Mapa de Calor del Teclat i exportació CSV.
   */
  import { onMount } from 'svelte';

  export let studentId = 'ALU-01';
  let sessions: Array<any> = [];
  let keyStats: Record<string, { hits: number; errors: number }> = {};
  let stepBarretines: Record<string, number> = {};
  let filterPhase: 'all' | 'drill' | 'arcade' | 'proverb' = 'all';

  onMount(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('mecano_telemetry_v1') || '{"sessions":[],"keyStats":{}}');
      const prog = JSON.parse(localStorage.getItem('mecano_v4_distinct') || '{"stepBarretines":{}}');
      sessions = raw.sessions || [];
      keyStats = raw.keyStats || {};
      stepBarretines = prog.stepBarretines || {};
    } catch {}
  });

  $: filteredSessions =
    filterPhase === 'all' ? sessions : sessions.filter((s) => s.phaseType === filterPhase);
</script>

<main class="admin-shell">
  <header class="admin-header">
    <h1>📊 Mecano — Panell del Docent ({studentId})</h1>
    <a href="./student.html" class="btn">🕹️ Vista de l'Alumne</a>
  </header>

  <section class="admin-section">
    <h2>Historial de Sessions ({filteredSessions.length})</h2>
    <div class="filters">
      <button on:click={() => (filterPhase = 'all')}>Totes</button>
      <button on:click={() => (filterPhase = 'drill')}>Fase 1: Pràctica</button>
      <button on:click={() => (filterPhase = 'arcade')}>Fase 2: Joc 8-Bits</button>
      <button on:click={() => (filterPhase = 'proverb')}>Fase 3: Dita Catalana</button>
    </div>
  </section>
</main>
