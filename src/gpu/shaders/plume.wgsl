// src/gpu/shaders/plume.wgsl
override ENV_TEXTURE_SIZE: u32;

struct PlumeParams {
  seed: u32;
  _pad: vec3<u32>;
  eventPos: vec2<u32>;
  radius: f32;
  sign: f32;
};

@group(0) @binding(0) var<uniform> pp: PlumeParams;
@group(0) @binding(1) var envTex: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(16,16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= ENV_TEXTURE_SIZE || gid.y >= ENV_TEXTURE_SIZE) { return; }
  let dx = f32(gid.x) - f32(pp.eventPos.x);
  let dy = f32(gid.y) - f32(pp.eventPos.y);
  let intensity = pp.sign * exp(-((dx*dx + dy*dy)/(pp.radius*pp.radius)));
  var c = textureLoad(envTex, vec2<i32>(i32(gid.x), i32(gid.y)), 0);
  c.r = clamp(c.r + intensity, 0.0, 1.0);
  textureStore(envTex, vec2<i32>(i32(gid.x), i32(gid.y)), c);
}
