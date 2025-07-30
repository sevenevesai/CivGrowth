// src/storage/persistence.ts
import { MAX_AGENTS } from '../config';

export function initPersistence(
  device: GPUDevice,
  genomeBuffer: GPUBuffer,
  freeListBuffer: GPUBuffer,
  getFreeListState: () => { head: number; tail: number },
  getFrameHash: () => number
) {
  const genomeSize = MAX_AGENTS * 12 * 4; // bytes
  const readback = device.createBuffer({
    size: genomeSize,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
  });

  let saving = false;
  async function autoSave() {
    if (saving) return;
    saving = true;
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(genomeBuffer, 0, readback, 0, genomeSize);
    device.queue.submit([enc.finish()]);

    await readback.mapAsync(GPUMapMode.READ);
    const arr = new Float32Array(readback.getMappedRange());

    const saveData = {
      schema: 1,
      genomes: btoa(String.fromCharCode(...new Uint8Array(arr.buffer))),
      ringPtr: getFreeListState(),
      envSeed: 0,
      rngSeed: getFrameHash()
    };
    localStorage.setItem('evo-save', btoa(JSON.stringify(saveData)));
    readback.unmap();
    saving = false;
  }

  async function load(str: string) {
    const json = JSON.parse(atob(str));
    const bytes = Uint8Array.from(atob(json.genomes), (c) => c.charCodeAt(0));
    device.queue.writeBuffer(genomeBuffer, 0, bytes.buffer);

    const ptrArr = new Uint32Array([json.ringPtr.head, json.ringPtr.tail]);
    device.queue.writeBuffer(freeListBuffer, 0, ptrArr.buffer);
  }

  return { autoSave, load };
}
