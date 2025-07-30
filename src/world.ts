import { mat4 } from 'gl-matrix';
import { MAX_AGENTS } from './config';

export class Camera {
  pos = [0, 0];
  zoom = 1;
  private matrix = mat4.create();

  getMatrix(): mat4 {
    // Build orthographic matrix based on pos & zoom
    const aspect = window.innerWidth / window.innerHeight;
    mat4.ortho(
      this.matrix,
      -aspect * this.zoom,
      aspect * this.zoom,
      -1 * this.zoom,
      1 * this.zoom,
      -1,
      1
    );
    mat4.translate(this.matrix, this.matrix, [
      -this.pos[0],
      -this.pos[1],
      0
    ]);
    return this.matrix;
  }

  attachListeners() {
    // Mouse drag and wheel for pan/zoom with damping
    let dragging = false;
    let last = [0, 0];
    window.addEventListener('mousedown', (e) => {
      dragging = true;
      last = [e.clientX, e.clientY];
    });
    window.addEventListener('mouseup', () => (dragging = false));
    window.addEventListener('mousemove', (e) => {
      if (dragging) {
        const dx = (e.clientX - last[0]) * this.zoom * 0.01;
        const dy = (e.clientY - last[1]) * this.zoom * 0.01;
        this.pos[0] -= dx;
        this.pos[1] += dy;
        last = [e.clientX, e.clientY];
      }
    });
    window.addEventListener('wheel', (e) => {
      this.zoom *= 1 - e.deltaY * 0.001;
      this.zoom = Math.max(0.01, Math.min(10, this.zoom));
    });
  }
}

export interface World {
  stats: {
    totalBiomass: number;
    aliveCount: number;
    avgFitness: number;
  };
  initCount: number;
}

export function createWorld(): World {
  return {
    stats: { totalBiomass: 0, aliveCount: 0, avgFitness: 0 },
    initCount: 10000
  };
}
