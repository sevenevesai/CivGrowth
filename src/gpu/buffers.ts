// src/gpu/buffers.ts
import computeSrc from './shaders/compute.wgsl?raw';
import renderSrc from './shaders/render.wgsl?raw';
import plumeSrc from './shaders/plume.wgsl?raw';
import statsSrc from './shaders/stats.wgsl?raw';
import {
  MAX_AGENTS,
  WORKGROUP_SIZE,
  ENV_TEXTURE_SIZE,
  GPU_STATS_BUFFER_SIZE
} from '../config';

export async function initGPU() {
  const adapter = await navigator.gpu.requestAdapter();
  const features: GPUFeatureName[] = [];
  if (adapter?.features.has('timestamp-query')) {
    features.push('timestamp-query');
  }
  const device = await adapter!.requestDevice({ requiredFeatures: features });

  // Canvas & context
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  const context = canvas.getContext('webgpu')!;
  const format = 'bgra8unorm';
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    context.configure({ device, format, alphaMode: 'opaque' });
  }
  new ResizeObserver(resize).observe(canvas);

  // Uniform buffers
  const params = device.createBuffer({
    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });
  const camera = device.createBuffer({
    size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  // Agent state buffers
  const stateA = device.createBuffer({
    size: MAX_AGENTS * 32,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  const stateB = device.createBuffer({
    size: MAX_AGENTS * 32,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });

  // Genome buffer
  const genomes = device.createBuffer({
    size: MAX_AGENTS * 48,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });

  // Free-list buffers
  const freeList = device.createBuffer({
    size: 8,
    usage: GPUBufferUsage.STORAGE
  });
  const freeIds = device.createBuffer({
    size: MAX_AGENTS * 4,
    usage: GPUBufferUsage.STORAGE
  });

  // Environment textures
  const textureDesc = {
    size: [ENV_TEXTURE_SIZE, ENV_TEXTURE_SIZE, 1] as const,
    format: 'rgba8unorm' as GPUTextureFormat,
    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
  };
  const envA = device.createTexture(textureDesc);
  const envB = device.createTexture(textureDesc);

  // Stats buffers
  const statsBuffer = device.createBuffer({
    size: GPU_STATS_BUFFER_SIZE,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
  });
  const statsRead = device.createBuffer({
    size: GPU_STATS_BUFFER_SIZE,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
  });

  // Optional timestamp query set
  let querySet: GPUQuerySet | null = null;
  if (device.features.has('timestamp-query')) {
    querySet = device.createQuerySet({ type: 'timestamp', count: 2 });
  }

  // Shader modules
  const computeModule = device.createShaderModule({
    code: computeSrc,
    constants: { MAX_AGENTS, WORKGROUP_SIZE }
  });
  const plumeModule = device.createShaderModule({
    code: plumeSrc,
    constants: { ENV_TEXTURE_SIZE }
  });
  const statsModule = device.createShaderModule({
    code: statsSrc,
    constants: { MAX_AGENTS }
  });
  const renderModule = device.createShaderModule({ code: renderSrc });

  // Bind group layouts
  const computeLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      { binding: 5, visibility: GPUShaderStage.COMPUTE, sampler: { type: 'filtering' } },
      { binding: 6, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'float' } },
      { binding: 7, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }
    ]
  });
  const plumeLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: 'write-only', format: 'rgba8unorm' } }
    ]
  });
  const statsLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }
    ]
  });
  const renderLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } }
    ]
  });

  // Pipelines
  const stepPass = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [computeLayout] }),
    compute: { module: computeModule, entryPoint: 'main' }
  });
  const plumePass = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [plumeLayout] }),
    compute: { module: plumeModule, entryPoint: 'main' }
  });
  const statsPass = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [statsLayout] }),
    compute: { module: statsModule, entryPoint: 'main' }
  });
  const renderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderLayout] }),
    vertex: { module: renderModule, entryPoint: 'vs_main' },
    fragment: { module: renderModule, entryPoint: 'fs_main', targets: [{ format }] },
    primitive: { topology: 'triangle-list' }
  });

  // Bind groups
  const stepGroup = device.createBindGroup({
    layout: computeLayout,
    entries: [
      { binding: 0, resource: { buffer: stateA } },
      { binding: 1, resource: { buffer: stateB } },
      { binding: 2, resource: { buffer: genomes } },
      { binding: 3, resource: { buffer: freeList } },
      { binding: 4, resource: { buffer: params } },
      { binding: 5, resource: device.createSampler() },
      { binding: 6, resource: envA.createView() },
      { binding: 7, resource: { buffer: freeIds } }
    ]
  });
  const plumeGroup = device.createBindGroup({
    layout: plumeLayout,
    entries: [
      { binding: 0, resource: { buffer: params } },
      { binding: 1, resource: envA.createView() }
    ]
  });
  const statsGroup = device.createBindGroup({
    layout: statsLayout,
    entries: [
      { binding: 0, resource: { buffer: stateA } },
      { binding: 1, resource: { buffer: statsBuffer } },
      { binding: 2, resource: { buffer: freeList } }
    ]
  });
  const renderGroup = device.createBindGroup({
    layout: renderLayout,
    entries: [
      { binding: 0, resource: { buffer: stateA } },
      { binding: 1, resource: { buffer: camera } }
    ]
  });

  // Utility to run compute passes
  function makeComputeRunner(pipeline: GPUComputePipeline, bindGroup: GPUBindGroup, x: number, y = 1) {
    return () => {
      const enc = device.createCommandEncoder();
      const pass = enc.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.dispatchWorkgroups(x, y);
      pass.end();
      device.queue.submit([enc.finish()]);
    };
  }

  const wgCount = Math.ceil(MAX_AGENTS / WORKGROUP_SIZE);

  // Assemble pipelines object
  const pipelines = {
    frameHash: 0,
    stepPass: {
      run: makeComputeRunner(stepPass, stepGroup, wgCount),
      genomes,
      freeList,
      freeListState: { head: 0, tail: 0 }
    },
    plumePass: { run: makeComputeRunner(plumePass, plumeGroup, ENV_TEXTURE_SIZE / 16, ENV_TEXTURE_SIZE / 16) },
    statsPass: {
      run: makeComputeRunner(statsPass, statsGroup, wgCount),
      async readback() {
        const enc = device.createCommandEncoder();
        enc.copyBufferToBuffer(statsBuffer, 0, statsRead, 0, GPU_STATS_BUFFER_SIZE);
        device.queue.submit([enc.finish()]);
        await statsRead.mapAsync(GPUMapMode.READ);
        const data = new Uint32Array(statsRead.getMappedRange());
        statsRead.unmap();
        return [data[0], data[1], data[2]] as const;
      }
    },
    render: {
      run: () => {
        const enc = device.createCommandEncoder();
        const pass = enc.beginRenderPass({
          colorAttachments: [
            {
              view: context.getCurrentTexture().createView(),
              loadOp: 'clear',
              storeOp: 'store',
              clearValue: { r: 0, g: 0, b: 0, a: 1 }
            }
          ]
        });
        pass.setPipeline(renderPipeline);
        pass.setBindGroup(0, renderGroup);
        pass.draw(6, MAX_AGENTS);
        pass.end();
        device.queue.submit([enc.finish()]);
      }
    },
    seedInitialPopulation(count: number) {
      // Initialize first `count` agents
      const stagingState = device.createBuffer({
        size: count * 32,
        usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC
      });
      const stagingGen = device.createBuffer({
        size: count * 48,
        usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC
      });

      stagingState.mapAsync(GPUMapMode.WRITE).then(() => {
        const s = new Float32Array(stagingState.getMappedRange());
        for (let i = 0; i < count; i++) {
          const b = i * 8;
          s[b + 0] = Math.random();
          s[b + 1] = Math.random();
          s[b + 2] = 0.1;
          s[b + 3] = 0;
          s[b + 4] = 0;
          s[b + 5] = 0;
          s[b + 6] = 0;
          s[b + 7] = 0;
        }
        stagingState.unmap();
      });

      stagingGen.mapAsync(GPUMapMode.WRITE).then(() => {
        const g = new Float32Array(stagingGen.getMappedRange());
        for (let i = 0; i < count * 12; i++) {
          g[i] = Math.random();
        }
        stagingGen.unmap();
      });

      const enc = device.createCommandEncoder();
      enc.copyBufferToBuffer(stagingState, 0, stateA, 0, count * 32);
      enc.copyBufferToBuffer(stagingGen, 0, genomes, 0, count * 48);
      const ptr = new Uint32Array([count, count]);
      enc.writeBuffer(freeList, 0, ptr.buffer);
      device.queue.submit([enc.finish()]);

      pipelines.stepPass.freeListState.head = count;
      pipelines.stepPass.freeListState.tail = count;
    }
  };

  return {
    device,
    context,
    pipelines,
    bindGroups: { stepGroup, plumeGroup, statsGroup, renderGroup },
    uniformBuffers: { params, camera },
    textures: { envA, envB },
    statsBuffers: { stats: statsBuffer, readback: statsRead },
    querySet,
    resize
  };
}
