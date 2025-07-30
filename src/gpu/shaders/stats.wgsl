// src/gpu/shaders/stats.wgsl
@id(0) override MAX_AGENTS: u32;
@id(1) override MAX_AGE: f32;

struct AgentState {
  pos: vec2<f32>;
  size: f32;
  energy: f32;
  hue: f32;
  age: f32;
  _pad: f32;
}

struct StatOut {
  aliveCount: atomic<u32>;
  totalBiomass: atomic<u32>;
  totalFitness: atomic<u32>;
  _pad: u32;
}

@group(0) @binding(0) var<storage, read> states: array<AgentState>;
@group(0) @binding(1) var<storage, read_write> outStats: StatOut;
@group(0) @binding(2) var<storage, read> genomes: array<array<f32,12>>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let idx = gid.x;
  if (idx >= MAX_AGENTS) { return; }
  let s = states[idx];
  if (s.energy > 0.0 && s.age <= MAX_AGE) {
    atomicAdd(&outStats.aliveCount, 1u);
    atomicAdd(&outStats.totalBiomass, u32(s.size));
    atomicAdd(&outStats.totalFitness, 1u);
  }
}
