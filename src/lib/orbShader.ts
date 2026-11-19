/**
 * The symbiote orb: a raymarched black liquid ball that breathes, grows spikes when you get
 * close and stretches toward the cursor. Glossy black in both worlds; what it reflects changes:
 * red and blue city dusk in Hero mode, cold white in Symbiote mode.
 */
export const ORB_VERT = `
attribute vec2 a;
void main(){ gl_Position = vec4(a, 0.0, 1.0); }
`;

export const ORB_FRAG = `
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;   // cursor relative to the orb, roughly -1..1, y up
uniform float uHover;   // 0..1
uniform float uPulse;   // 0..1, decays after a tap
uniform float uDark;    // 0 hero .. 1 symbiote

float sdf(vec3 p){
  float t = uTime;
  float d = length(p) - (0.6 + 0.02 * sin(t * 1.3));
  d += 0.035 * sin(p.x * 5.0 + t * 1.1) * sin(p.y * 4.0 - t * 0.9) * sin(p.z * 5.5 + t * 0.7);
  vec3 n = normalize(p);
  vec3 md = normalize(vec3(uMouse, 0.6));
  d -= (0.05 + 0.2 * uHover) * pow(max(dot(n, md), 0.0), 7.0);
  float sp = sin(n.x * 13.0 + t * 0.6) * sin(n.y * 13.0 - t * 0.5) * sin(n.z * 13.0 + 0.7);
  d -= (0.015 + 0.14 * uHover + 0.24 * uPulse) * pow(max(sp, 0.0), 3.0);
  return d;
}

vec3 normalAt(vec3 p){
  const vec2 e = vec2(0.0015, -0.0015);
  return normalize(e.xyy * sdf(p + e.xyy) + e.yyx * sdf(p + e.yyx) + e.yxy * sdf(p + e.yxy) + e.xxx * sdf(p + e.xxx));
}

vec3 env(vec3 r){
  vec3 red = vec3(0.89, 0.23, 0.18);
  vec3 blue = vec3(0.16, 0.26, 0.62);
  vec3 dusk = vec3(0.95, 0.62, 0.36);
  vec3 hero = mix(red, blue, smoothstep(-0.35, 0.55, r.y));
  hero = mix(hero, dusk, smoothstep(0.25, 0.0, abs(r.y + 0.05)) * 0.45);
  vec3 cold = mix(vec3(0.02), vec3(0.78, 0.83, 0.92), smoothstep(0.1, 0.95, r.y));
  return mix(hero, cold, uDark);
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 ro = vec3(0.0, 0.0, 2.1);
  vec3 rd = normalize(vec3(uv, -1.08));
  float t = 0.0;
  float hit = 0.0;
  for (int i = 0; i < 72; i++){
    float d = sdf(ro + rd * t);
    if (d < 0.0012){ hit = 1.0; break; }
    t += d * 0.62;
    if (t > 4.0) break;
  }
  if (hit < 0.5){ gl_FragColor = vec4(0.0); return; }
  vec3 p = ro + rd * t;
  vec3 n = normalAt(p);
  vec3 r = reflect(rd, n);
  float fres = pow(1.0 - max(dot(n, -rd), 0.0), 2.6);
  vec3 L = normalize(vec3(-0.5, 0.8, 0.6));
  float spec = pow(max(dot(r, L), 0.0), 70.0);
  vec3 col = vec3(0.012) + env(r) * (0.08 + 0.9 * fres) + vec3(spec) * mix(0.9, 1.0, uDark);
  gl_FragColor = vec4(col, 1.0);
}
`;
