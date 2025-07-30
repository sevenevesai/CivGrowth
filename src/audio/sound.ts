// src/audio/sound.ts
export function initAudio() {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.connect(gain).connect(ctx.destination);
  return { ctx, osc, gain, started: false };
}

export function updateAudio(audio: any, biomass: number) {
  if (!Number.isFinite(biomass)) return;
  const rel = biomass / 1_000_000;
  audio.osc.frequency.value = 110 * Math.pow(2, 8 * rel);
  audio.gain.gain.value = 0.8 / (1 + Math.exp(-12 * (rel - 0.5)));
  if (document.visibilityState === 'hidden') {
    audio.gain.gain.value = 0;
  }
}
