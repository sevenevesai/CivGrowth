# Evo-Sandbox

**Lightweight Evolution Sandbox**  
MIT License

## Live Demo

https://<user>.github.io/evo-sandbox/

## Features

- WebGPU (fallback to WebGL2) compute & render
- 100k+ agents, 60 FPS on mid-2024 hardware
- Logistic growth, mutation, selection
- Nutrient & temperature maps, meteor disasters
- Svelte UI: sliders for mutation, regen, disasters
- Persistence via IndexedDB + LZ-string
- WebAudio drone mapped to biomass
- Dev overlay with GPU timings

## Controls

- **Drag**: pan camera  
- **Wheel**: zoom  
- **`~`**: toggle GPU overlay  
- **▶ Run**: unlock audio (on first interaction)  

## Build & Test

```bash
npm install
npm run dev
npm run build
npm run test
npm run lint
```
