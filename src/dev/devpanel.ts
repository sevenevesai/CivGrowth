export function initDevPanel(device: GPUDevice, querySet: GPUQuerySet) {
  const resolveBuffer = device.createBuffer({
    size: 16,
    usage:
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.MAP_READ
  });

  return {
    async collect() {
      const enc = device.createCommandEncoder();
      enc.resolveQuerySet(querySet, 0, 2, resolveBuffer, 0);
      device.queue.submit([enc.finish()]);
      await resolveBuffer.mapAsync(GPUMapMode.READ);
      const data = new BigUint64Array(
        resolveBuffer.getMappedRange()
      );
      resolveBuffer.unmap();
      const diff = Number(data[1] - data[0]) * 1e-6;
      return { frameTime: diff };
    }
  };
}
