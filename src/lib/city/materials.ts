import * as THREE from "three";
import { AVENUE, HALF_X, HALF_Z, PX, PZ, STREET } from "./layout";

export type Shared = {
  night: { value: number };
  time: { value: number };
  scale: { value: number };
  fogDensity: { value: number };
};

const HASH = /* glsl */ `
float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float hash11(float n){ return fract(sin(n * 127.1) * 43758.5453); }
`;

/**
 * Facades. One physically based material for every building: the shader draws the
 * window grid from the bay/floor coordinates, makes the glass a mirror for the sky,
 * gives every pane a slightly different tilt, and switches the lights on at night.
 */
export function facadeMaterial(u: Shared) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = u.night;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>\nattribute vec4 aInfo;\nattribute vec2 aFuv;\nflat varying vec4 vInfo;\nvarying vec2 vFuv;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\nvInfo = aInfo;\nvFuv = aFuv;`);
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uNight;
flat varying vec4 vInfo; // flat: per-building numbers must not pick up interpolation error, the hashes amplify it
varying vec2 vFuv;
float gWin; float gRough; float gMetal; vec3 gEmis; vec2 gTilt;
${HASH}`,
      )
      .replace(
        "#include <color_fragment>",
        /* glsl */ `#include <color_fragment>
{
  float seed = vInfo.x;
  float style = vInfo.y;
  float wall = vInfo.z;
  vec2 margin; vec3 wallCol; vec3 glass; float wallRough = 0.86; float wallMetal = 0.0;
  if (style < 0.5) {
    // masonry with punched windows
    margin = vec2(0.26, 0.2);
    float k = floor(fract(seed * 17.0) * 4.0);
    wallCol = k < 0.5 ? vec3(0.50, 0.45, 0.38) : k < 1.5 ? vec3(0.27, 0.13, 0.10) : k < 2.5 ? vec3(0.40, 0.29, 0.20) : vec3(0.17, 0.165, 0.16);
    glass = vec3(0.30, 0.33, 0.36);
  } else if (style < 1.5) {
    // glass curtain wall, thin mullions
    margin = vec2(0.05, 0.075);
    float k = fract(seed * 13.0);
    wallCol = k < 0.6 ? vec3(0.035, 0.038, 0.042) : vec3(0.30, 0.31, 0.32);
    wallRough = 0.4; wallMetal = 0.85;
    vec3 tint = fract(seed * 5.0) < 0.5 ? vec3(0.55, 0.66, 0.74) : vec3(0.70, 0.68, 0.62);
    glass = tint * (0.75 + 0.25 * fract(seed * 3.0));
  } else if (style < 2.5) {
    // concrete with ribbon windows
    margin = vec2(0.012, 0.25);
    wallCol = mix(vec3(0.47, 0.45, 0.42), vec3(0.15, 0.15, 0.16), step(0.55, fract(seed * 5.0)));
    glass = vec3(0.36, 0.42, 0.48);
  } else {
    margin = vec2(0.5); wallCol = vec3(0.075, 0.075, 0.08); glass = wallCol;
  }

  vec2 g = vFuv;
  vec2 id = floor(g);
  vec2 f = fract(g);
  vec2 aa = fwidth(g) * 1.3 + 1e-4;
  float wx = smoothstep(margin.x, margin.x + aa.x, f.x) * smoothstep(margin.x, margin.x + aa.x, 1.0 - f.x);
  float wy = smoothstep(margin.y, margin.y + aa.y, f.y) * smoothstep(margin.y * 0.55, margin.y * 0.55 + aa.y, 1.0 - f.y);
  float cover = (1.0 - 2.0 * margin.x) * (1.0 - 1.55 * margin.y);
  float lod = smoothstep(0.7, 1.6, max(aa.x, aa.y));
  float win = mix(wx * wy, cover, lod) * wall * step(id.y + 0.5, vInfo.w);

  float h1 = hash21(id + seed * 91.7);
  float h2 = hash21(id * 1.7 + seed * 33.1 + 5.0);

  // grime near the street, a paler band under each sill
  wallCol *= mix(0.72, 1.0, smoothstep(0.0, 9.0, g.y));
  wallCol *= 0.94 + 0.06 * hash11(id.y + seed * 3.0);

  // who is still up
  float sleepy = fract(seed * 29.0);
  float litFrac = mix(0.015, 0.13, uNight) * (0.12 + 1.7 * sleepy * sleepy);
  float lit = step(1.0 - litFrac, h1);
  float wholeFloor = step(0.94, hash11(id.y * 1.31 + seed * 57.0)) * step(0.2, h1);
  lit = max(lit, wholeFloor * uNight);
  if (id.y < 0.5) lit = max(lit, step(0.35, h1) * uNight); // shop fronts
  vec3 lc = h2 < 0.55 ? vec3(1.0, 0.58, 0.24) : h2 < 0.85 ? vec3(1.0, 0.80, 0.52) : vec3(0.55, 0.78, 1.0);
  if (style > 0.5 && style < 1.5) lc = mix(lc, vec3(0.80, 0.90, 1.0), 0.45);
  float inten = (0.25 + 1.1 * h2 * h2) * mix(0.4, 1.0, uNight);
  // blinds pulled part of the way down
  float blind = smoothstep(0.0, 0.04, (1.0 - margin.y * 0.55 - f.y) - fract(h1 * 7.0) * 0.3 * step(style, 0.5));
  gEmis = lc * inten * lit * win * mix(blind, 1.0, lod);
  // sodium street light washing up the first floors
  gEmis += wallCol * vec3(1.0, 0.56, 0.26) * 0.9 * exp(-max(g.y, 0.0) / 2.6) * uNight * wall * (1.0 - win);

  diffuseColor.rgb = mix(wallCol, glass, win);
  gWin = win;
  gRough = mix(wallRough, 0.04 + 0.1 * h2, win);
  gMetal = mix(wallMetal, 1.0, win);
  gTilt = (vec2(h1, h2) - 0.5) * win * (1.0 - lod);
}`,
      )
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>\nroughnessFactor = gRough;`)
      .replace("#include <metalnessmap_fragment>", `#include <metalnessmap_fragment>\nmetalnessFactor = gMetal;`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>\nnormal = normalize(normal + vec3(gTilt * 0.045, 0.0));`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\ntotalEmissiveRadiance += gEmis;`);
  };
  return m;
}

/** Streets: asphalt, sidewalks, lane paint, and at night wet tarmac under pools of street light. */
export function groundMaterial(u: Shared) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = u.night;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vWp;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uNight;
varying vec3 vWp;
float gRough; vec3 gEmis;
${HASH}`,
      )
      .replace(
        "#include <color_fragment>",
        /* glsl */ `#include <color_fragment>
{
  vec2 p = vWp.xz;
  float inside = step(abs(p.x), ${HALF_X.toFixed(1)} + 14.0) * step(abs(p.y), ${HALF_Z.toFixed(1)} + 9.0);
  float ax = abs(mod(p.x + ${(PX / 2).toFixed(1)}, ${PX.toFixed(1)}) - ${(PX / 2).toFixed(1)});
  float az = abs(mod(p.y + ${(PZ / 2).toFixed(1)}, ${PZ.toFixed(1)}) - ${(PZ / 2).toFixed(1)});
  float w = fwidth(p.x) + fwidth(p.y) + 0.02;
  float onAve = 1.0 - smoothstep(${(AVENUE / 2).toFixed(1)} - w, ${(AVENUE / 2).toFixed(1)} + w, ax);
  float onSt = 1.0 - smoothstep(${(STREET / 2).toFixed(1)} - w, ${(STREET / 2).toFixed(1)} + w, az);
  float road = max(onAve, onSt) * inside;
  float n = hash21(floor(p * 0.7));
  vec3 asphalt = vec3(0.028, 0.028, 0.031) * (0.85 + 0.3 * n);
  vec3 walk = vec3(0.21, 0.205, 0.195) * (0.9 + 0.2 * hash21(floor(p / 1.5)));
  vec3 col = mix(walk, asphalt, road);
  col = mix(vec3(0.03, 0.032, 0.035), col, inside);

  // lane paint, faded out where it would only shimmer
  float fade = 1.0 - smoothstep(0.15, 0.6, w);
  float dash = step(fract(p.y / 9.0), 0.4);
  float lanes = (1.0 - smoothstep(0.1, 0.1 + w, abs(ax - 6.2))) * dash + (1.0 - smoothstep(0.12, 0.12 + w, abs(ax - 0.25)));
  float dashX = step(fract(p.x / 9.0), 0.4);
  float lanesX = (1.0 - smoothstep(0.1, 0.1 + w, az)) * dashX;
  float paint = (lanes * onAve * (1.0 - onSt) + lanesX * onSt * (1.0 - onAve)) * fade * inside;
  col = mix(col, vec3(0.52, 0.5, 0.44), paint * 0.8);
  diffuseColor.rgb = col;

  // street lamps every 32 m on both kerbs
  float kx = ax - ${(AVENUE / 2 - 1.5).toFixed(1)};
  float kz = mod(p.y, 32.0) - 16.0;
  float lampA = exp(-(kx * kx + kz * kz) / 55.0);
  float sx = az - ${(STREET / 2 - 1.5).toFixed(1)};
  float sz = mod(p.x, 32.0) - 16.0;
  float lampS = exp(-(sx * sx + sz * sz) / 40.0);
  float lamp = max(lampA, lampS) * inside;
  gEmis = (col * 9.0 + 0.012) * vec3(1.0, 0.58, 0.27) * lamp * uNight;
  float puddle = smoothstep(0.45, 0.8, hash21(floor(p / 6.0)) * 0.6 + n * 0.5);
  gRough = mix(1.0, mix(mix(0.82, 0.93, road), mix(0.5, mix(0.2, 0.06, puddle), road), uNight), inside);
}`,
      )
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>\nroughnessFactor = gRough;`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\ntotalEmissiveRadiance += gEmis;`);
  };
  return m;
}

/** Head and tail lights. Each car is a single point that turns white or red depending on which end faces the lens. */
export function trafficMaterial(u: Shared) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: u.time, uNight: u.night, uScale: u.scale, uFog: u.fogDensity, uLenZ: { value: HALF_Z * 2 }, uLenX: { value: HALF_X * 2 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
uniform float uTime, uNight, uScale, uFog, uLenZ, uLenX;
attribute vec4 aLane;
varying vec3 vCol;
void main(){
  float along = aLane.x < 0.5 ? uLenZ : uLenX;
  float t = mod(aLane.z + aLane.w * uTime, along) - along * 0.5;
  vec3 p = aLane.x < 0.5 ? vec3(aLane.y, 0.75, t) : vec3(t, 0.75, aLane.y);
  vec3 dir = aLane.x < 0.5 ? vec3(0.0, 0.0, sign(aLane.w)) : vec3(sign(aLane.w), 0.0, 0.0);
  float facing = dot(dir, normalize(cameraPosition - p));
  vec3 head = vec3(1.0, 0.93, 0.80) * 2.0;
  vec3 tail = vec3(1.0, 0.06, 0.03) * 1.5;
  vCol = (facing > 0.0 ? head : tail) * (0.2 + 0.8 * abs(facing)) * mix(0.3, 1.0, uNight);
  vec4 mv = viewMatrix * vec4(p, 1.0);
  float d = -mv.z;
  vCol *= exp(-uFog * uFog * d * d);
  gl_PointSize = clamp(uScale * 1.9 / d, 1.4, 22.0);
  gl_Position = projectionMatrix * mv;
}`,
    fragmentShader: /* glsl */ `
varying vec3 vCol;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.08, d);
  gl_FragColor = vec4(vCol * a, a);
}`,
  });
}

/** Red aircraft warning lights on the tall roofs, pulsing slowly and out of step. */
export function beaconMaterial(u: Shared) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: u.time, uNight: u.night, uScale: u.scale, uFog: u.fogDensity },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
uniform float uTime, uNight, uScale, uFog;
attribute float aPhase;
varying vec3 vCol;
void main(){
  float pulse = 0.25 + 0.75 * smoothstep(0.55, 1.0, sin(uTime * 2.1 + aPhase * 6.283) * 0.5 + 0.5);
  vec4 mv = viewMatrix * vec4(position, 1.0);
  float d = -mv.z;
  vCol = vec3(1.0, 0.05, 0.03) * 2.6 * pulse * mix(0.35, 1.0, uNight) * exp(-uFog * uFog * d * d * 0.5);
  gl_PointSize = clamp(uScale * 2.6 / d, 2.0, 18.0);
  gl_Position = projectionMatrix * mv;
}`,
    fragmentShader: /* glsl */ `
varying vec3 vCol;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.05, d);
  gl_FragColor = vec4(vCol * a, a);
}`,
  });
}

/** Last pass: a soft vignette and fine film grain, so it reads as footage rather than a render. */
export const FinishShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null }, uTime: { value: 0 }, uGrain: { value: 0.016 }, uVig: { value: 0.32 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
uniform sampler2D tDiffuse; uniform float uTime, uGrain, uVig; varying vec2 vUv;
float h(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
void main(){
  vec4 c = texture2D(tDiffuse, vUv);
  vec2 q = vUv - 0.5;
  c.rgb *= 1.0 - uVig * smoothstep(0.25, 0.95, dot(q, q) * 2.2);
  c.rgb += (h(vUv * 1000.0 + fract(uTime) * 61.0) - 0.5) * uGrain;
  gl_FragColor = c;
}`,
};
