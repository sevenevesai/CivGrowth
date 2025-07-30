<script lang="ts">
  export let visible: boolean = false;
  export let gpuTimes: Record<string, number> = {};
  const toggle = () => (visible = !visible);
  window.addEventListener('keydown', (e) => {
    if (e.key === '~') toggle();
  });
</script>

{#if visible}
  <div class="fixed bottom-2 left-2 p-2 bg-white bg-opacity-75 rounded shadow text-xs">
    {#each Object.entries(gpuTimes) as [label, time]}
      <div>{label}: {time.toFixed(2)} ms</div>
    {/each}
  </div>
{/if}
