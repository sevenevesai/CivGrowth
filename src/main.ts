// src/main.ts
import './style.css';
import { initGPU } from './gpu/buffers';
import { createWorld, Camera } from './world';
import Hud from './ui/Hud.svelte';
import Overlay from './ui/Overlay.svelte';
import { initAudio, updateAudio } from './audio/sound';
import { initPersistence } from './storage/persistence';
import { initDevPanel } from './dev/devpanel';

async function main() {
  const {
    device,
    context,
    pipelines,
    bindGroups,
    uniformBuffers,
    statsBuffers,
    querySet,
    resize,
    textures
  } = await initGPU();

  const world = createWorld();

  // Seed initial population
  pipelines.seedInitialPopulation(world.initCount);

  // UI components
  const hud = new Hud({ target: document.getElementById('app')! });
  const overlay = new Overlay({ target: document.body });

  // Persistence
  const persist = initPersistence(
    device,
    pipelines.stepPass.genomes,
    pipelines.stepPass.freeList,
    () => ({ head: pipelines.stepPass.freeListHead, tail: pipelines.stepPass.freeListTail }),
    () => pipelines.frameHash
  );

  // Dev overlay
  const dev = initDevPanel(device, querySet);

  // Audio
  const audio = initAudio();
  // Resume audio on first user click
  context.canvas.addEventListener('click', () => {
    if (!audio.started) {
      audio.ctx.resume().then(() => {
        audio.osc.start();
        audio.started = true;
      });
    }
  });

  // Camera
  const camera = new Camera();
  camera.attachListeners();

  let lastTime = performance.now();
  let lastStatsTime = lastTime;
  let lastPlumeTime = lastTime;

  function frame(now: number) {
    const dt = (now - lastTime) * 0.001;
    lastTime = now;

    // Update Params UBO (32 bytes)
    const buf = new ArrayBuffer(32);
    const fv = new Float32Array(buf);
    const uv = new Uint32Array(buf);
    fv[0] = dt;
    uv[4] = pipelines.frameHash++;
    device.queue.writeBuffer(uniformBuffers.params, 0, buf);

    // Update Camera UBO
    const camMat = camera.getMatrix();
    device.queue.writeBuffer(
      uniformBuffers.camera,
      0,
      new Float32Array(camMat as Float32Array).buffer
    );

    // Environment plume every 30s
    if (now - lastPlumeTime >= 30000) {
      pipelines.plumePass.run();
      lastPlumeTime = now;
    }

    // Simulation step
    pipelines.stepPass.run();

    // Stats reduction once per second
    if (now - lastStatsTime >= 1000) {
      pipelines.statsPass.run();
      pipelines.statsPass.readback().then((data) => {
        world.stats.aliveCount = data[0];
        world.stats.totalBiomass = data[1];
        world.stats.avgFitness = data[2] / 1000;
      });
      lastStatsTime = now;
    }

    // Render
    pipelines.render.run();

    // Audio & UI
    updateAudio(audio, world.stats.totalBiomass);
    hud.$set({
      fps: Math.round(1 / dt),
      count: world.stats.aliveCount,
      fitness: world.stats.avgFitness
    });
    dev.collect().then((times) => overlay.$set({ gpuTimes: times }));

    // Auto-save
    persist.autoSave();

    requestAnimationFrame(frame);
  }

  resize();
  requestAnimationFrame(frame);
}

main();
