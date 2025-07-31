// src/storage/persistence.ts
import { MAX_AGENTS } from '../config';
import { compressToBase64, decompressFromBase64 } from 'lz-string';

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

  function bufferToBase64(buf: ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return compressToBase64(binary);
  }

  let lastSave = 0;
  let saving = false;
  async function autoSave() {
    if (saving || performance.now() - lastSave < 60000) return;
    saving = true;
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(genomeBuffer, 0, readback, 0, genomeSize);
    device.queue.submit([enc.finish()]);

    await readback.mapAsync(GPUMapMode.READ);
    const arr = new Float32Array(readback.getMappedRange());

    const saveData = {
      schema: 1,
      genomes: bufferToBase64(arr.buffer),
      ringPtr: getFreeListState(),
      envSeed: 0,
      rngSeed: getFrameHash()
    };
    try {
      localStorage.setItem('evo-save', compressToBase64(JSON.stringify(saveData)));
      lastSave = performance.now();
    } catch (e) {
      console.warn('Auto-save failed', e);
    }
    readback.unmap();
    saving = false;
  }

  async function load(str: string) {
    const json = JSON.parse(decompressFromBase64(str));
    const genomeData = decompressFromBase64(json.genomes);
    const bytes = Uint8Array.from(genomeData, (c) => c.charCodeAt(0));
    device.queue.writeBuffer(genomeBuffer, 0, bytes.buffer);

    const ptrArr = new Uint32Array([json.ringPtr.head, json.ringPtr.tail]);
    device.queue.writeBuffer(freeListBuffer, 0, ptrArr.buffer);
  }

  return { autoSave, load };
}
