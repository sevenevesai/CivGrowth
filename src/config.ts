export const MAX_AGENTS = 131072;
export const WORKGROUP_SIZE = 256;
export const MAX_AGE = 300.0;
export const ENV_TEXTURE_SIZE = 2048;
export const GPU_STATS_BUFFER_SIZE = 16; // bytes for 3 uint32 stats + padding

export interface GenomeSpec {
  genes: Float32Array; // length 12
}
