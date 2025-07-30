interface Navigator {
  gpu?: any;
}

type GPUDevice = any;
type GPUQuerySet = any;
type GPUBuffer = any;
type GPUBufferUsageFlags = any;
declare const GPUBufferUsage: any;
type GPUMapModeFlags = any;
declare const GPUMapMode: any;
type GPUTexture = any;
type GPUTextureFormat = any;
interface GPUTextureDescriptor {}
declare const GPUTextureUsage: any;
type GPUFeatureName = any;
interface GPUShaderModule {}
type GPUBindGroupLayout = any;
type GPUComputePipeline = any;
type GPURenderPipeline = any;
type GPUBindGroup = any;
interface GPUCanvasContext {
  configure(config: any): void;
  getCurrentTexture(): any;
  readonly canvas: HTMLCanvasElement;
}

interface HTMLCanvasElement {
  getContext(contextId: 'webgpu'): GPUCanvasContext | null;
}

declare const GPUShaderStage: any;
