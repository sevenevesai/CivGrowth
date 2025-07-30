<script lang="ts">
  export let fps = 0;
  export let count = 0;
  export let fitness = 0;
  export let mutationRate = 0.01;
  export let nutrientRegen = 1.0;
  export let disasterFreq = 0.05;
  import { writable } from 'svelte/store';

  function update() {
    // write sliders to UBO via imported helper
  }
</script>

<div class="fixed top-2 left-2 p-4 bg-white bg-opacity-75 rounded shadow space-y-1 text-sm">
  <div>FPS: {fps}</div>
  <div>Agents: {count}</div>
  <div>Avg Fitness: {fitness.toFixed(2)}</div>
  <label>
    Mutation Rate:
    <input type="range" min="0" max="0.1" step="0.001" bind:value={mutationRate} on:input={update} />
  </label>
  <label>
    Nutrient Regen:
    <input type="range" min="0" max="2" step="0.1" bind:value={nutrientRegen} on:input={update} />
  </label>
  <label>
    Disaster Freq:
    <input type="range" min="0" max="1" step="0.01" bind:value={disasterFreq} on:input={update} />
  </label>
  <button on:click={() => navigator.clipboard.writeText(world.saveString)}>
    Copy save string
  </button>
  <input placeholder="Paste save" on:change={(e) => world.load(e.target.value)} />
</div>
