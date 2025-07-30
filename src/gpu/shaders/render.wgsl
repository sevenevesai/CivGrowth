// src/gpu/shaders/render.wgsl
struct AgentState {
  pos: vec2<f32>;
  size: f32;
  energy: f32;
  hue: f32;
  age: f32;
  _pad: f32;
};

@group(0) @binding(0) var<storage, read> state: array<AgentState>;
@group(0) @binding(1) var<uniform> camera: mat4x4<f32>;

fn hsv2rgb(c: vec3<f32>) -> vec3<f32> {
  let K = vec4<f32>(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  let p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

struct VSOut {
  @builtin(position) pos: vec4<f32>;
  @location(0) hue: f32;
  @location(1) anim: f32;
};

@vertex
fn vs_main(
  @builtin(instance_index) id: u32,
  @builtin(vertex_index) vid: u32
) -> VSOut {
  let s = state[id];
  let corners = array<vec2<f32>,6>(
    vec2(-1.0,-1.0), vec2(1.0,-1.0), vec2(-1.0,1.0),
    vec2(-1.0,1.0), vec2(1.0,-1.0), vec2(1.0,1.0)
  );
  let p = corners[vid] * s.size + s.pos;
  var o: VSOut;
  o.pos = camera * vec4<f32>(p, 0.0, 1.0);
  o.hue = s.hue;
  o.anim = fract(s.age);
  return o;
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4<f32> {
  let rgb = hsv2rgb(vec3<f32>(in.hue, 0.6, 0.8 + sin(in.anim * 6.283) * 0.2));
  return vec4<f32>(rgb, 1.0);
}
