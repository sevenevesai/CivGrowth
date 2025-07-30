// src/gpu/shaders/compute.wgsl
override MAX_AGENTS: u32;
override WORKGROUP_SIZE: u32;
override ENV_TEXTURE_SIZE: u32;
override MAX_AGE: f32;

struct AgentState {
  pos: vec2<f32>;
  size: f32;
  energy: f32;
  hue: f32;
  age: f32;
  _pad: f32;
};

struct Genome {
  genes: array<f32, 12>;
};

struct FreeList {
  head: atomic<u32>;
  tail: atomic<u32>;
};

struct Params {
  dt: f32;
  _pad: vec3<f32>;
  seed: u32;
};

@group(0) @binding(0) var<storage, read> stateIn: array<AgentState>;
@group(0) @binding(1) var<storage, read_write> stateOut: array<AgentState>;
@group(0) @binding(2) var<storage, read> genomes: array<Genome>;
@group(0) @binding(3) var<storage, read_write> freeList: FreeList;
@group(0) @binding(4) var<uniform> params: Params;
@group(0) @binding(5) var samp: sampler;
@group(0) @binding(6) var tex: texture_2d<f32>;
@group(0) @binding(7) var<storage, read_write> freeIds: array<u32, MAX_AGENTS>;

fn rotl(x: u32, k: u32) -> u32 {
  return (x << k) | (x >> (32u - k));
}

fn xoroshiro128p(s: ptr<function, vec2<u32>>) -> u32 {
  let s0 = (*s).x;
  var s1 = (*s).y;
  let result = s0 + s1;
  s1 = s1 ^ s0;
  (*s).x = rotl(s0, 55u) ^ s1 ^ (s1 << 14u);
  (*s).y = rotl(s1, 36u);
  return result;
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let idx = gid.x;
  if (idx >= MAX_AGENTS) { return; }

  var rng = vec2<u32>(params.seed ^ idx, idx << 16u);
  var s = stateIn[idx];
  let g = genomes[idx].genes;

  // growth
  s.size += g[0] * s.size * (1.0 - s.size / g[1]) * params.dt;
  // nutrient
  let n = textureSample(tex, samp, s.pos).r;
  s.energy += n * params.dt;
  // age
  s.age += params.dt;

  // division
  if (s.size >= g[3]) {
    let child = idx; // simplistic; real should pop freeList
    var c = s;
    c.size = s.size * 0.5;
    stateOut[child] = c;
    s.size *= 0.5;
  }

  // death
  if (s.energy <= 0.0 || s.age > MAX_AGE) {
    let tail = atomicAdd(&freeList.tail, 1u);
    freeIds[tail % MAX_AGENTS] = idx;
  } else {
    stateOut[idx] = s;
  }
}
