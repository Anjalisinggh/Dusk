import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { buildCity, buildTraffic } from "./build";
import { FinishShader, beaconMaterial, facadeMaterial, groundMaterial, trafficMaterial, type Shared } from "./materials";

type Mode = "light" | "dark";

/** direction towards the sun / moon. Both hang over the far end of the avenue the camera travels. */
const dirOf = (az: number, elevDeg: number) => {
  const e = (elevDeg * Math.PI) / 180;
  return new THREE.Vector3(Math.cos(az) * Math.cos(e), Math.sin(e), Math.sin(az) * Math.cos(e));
};
const AZ = Math.atan2(-1, 0.04);

/** everything that differs between the two hours */
const LOOK = {
  light: {
    sky: "/sky/day.jpg",
    srcU: 0.672, // where the sun is in the photograph
    // the key light comes from a little to one side of the photographed sun, so the tower flanks catch gold
    dir: dirOf(AZ + 0.3, 9),
    tint: [1.12, 1.06, 1.0],
    pitch: -0.02,
    env: 0.6,
    fog: 0xd6b78f,
    hazeTop: 380,
    fogDensity: 0.00027,
    sun: 0xffa55c,
    sunPower: 8,
    night: 0,
    bloom: [0.22, 0.6, 1.0],
    exposure: 0.9,
  },
  dark: {
    sky: "/sky/night.jpg",
    srcU: 0.6,
    dir: dirOf(AZ + 0.3, 16),
    tint: [0.2, 0.26, 0.4],
    pitch: 0.1, // tip the photograph so the moon sits lower, inside the frame
    env: 0.22,
    fog: 0x121a27,
    hazeTop: 800,
    fogDensity: 0.0003,
    sun: 0x9db6ff,
    sunPower: 0.55,
    night: 1,
    bloom: [0.3, 0.5, 1.0],
    exposure: 1.0,
  },
} as const;

/** the flight: scroll position 0..1 to camera position, look-at point and lens */
const KEYS = [
  { p: 0.0, pos: [10, 262, 1010], at: [0, 120, -420], fov: 36 },
  { p: 0.33, pos: [-4, 118, 470], at: [0, 96, -600], fov: 42 },
  { p: 0.66, pos: [5, 7, 96], at: [0, 46, -500], fov: 54 },
  { p: 0.86, pos: [0, 190, -40], at: [0, 110, -900], fov: 44 },
  { p: 1.0, pos: [0, 430, 140], at: [0, 40, -1000], fov: 38 },
];

const smooth = (t: number) => t * t * (3 - 2 * t);

export function startCity(canvas: HTMLCanvasElement, onReady: () => void) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;

  // phones and low-memory machines get a smaller shadow map and lighter anti-aliasing
  const lean = ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4 || window.innerWidth < 800;

  const scene = new THREE.Scene();
  const fog = new THREE.FogExp2(0x000000, 0.0004);
  scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(36, 1, 1, 12000);

  const shared: Shared = { night: { value: 0 }, time: { value: 0 }, scale: { value: 1000 }, fogDensity: { value: 0.0004 } };

  // ---- the city ----
  const data = buildCity();
  const city = new THREE.Mesh(data.geometry, facadeMaterial(shared));
  city.castShadow = true;
  city.receiveShadow = true;
  scene.add(city);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(15000, 15000).rotateX(-Math.PI / 2), groundMaterial(shared));
  ground.receiveShadow = true;
  scene.add(ground);

  // wooden water tanks on the older roofs
  const legs = new THREE.CylinderGeometry(1.5, 1.5, 2.2, 6, 1, true).translate(0, 1.1, 0);
  const drum = new THREE.CylinderGeometry(1.9, 1.9, 3.6, 14).translate(0, 4, 0);
  const cap = new THREE.ConeGeometry(2.15, 1.3, 14).translate(0, 6.45, 0);
  const tankGeo = mergeGeometries([legs, drum, cap])!;
  const tanks = new THREE.InstancedMesh(tankGeo, new THREE.MeshStandardMaterial({ color: 0x2c2018, roughness: 0.92 }), data.tanks.length);
  const mat4 = new THREE.Matrix4();
  data.tanks.forEach((t, i) => {
    mat4.makeScale(t.s, t.s, t.s).setPosition(t.x, t.y, t.z);
    tanks.setMatrixAt(i, mat4);
  });
  tanks.castShadow = true;
  scene.add(tanks);

  // the sky photograph on a dome that travels with the camera, so it can be turned, tilted and graded
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: null as THREE.Texture | null }, uYaw: { value: 0 }, uPitch: { value: 0 }, uTint: { value: new THREE.Color(1, 1, 1) } },
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
uniform sampler2D uMap; uniform float uYaw, uPitch; uniform vec3 uTint; varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  float c = cos(uPitch), s = sin(uPitch);
  d = vec3(d.x, d.y * c - d.z * s, d.y * s + d.z * c);
  vec2 uv = vec2((atan(d.z, d.x) + uYaw) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 + 0.5);
  gl_FragColor = vec4(texture2D(uMap, uv).rgb * uTint, 1.0);
}`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(6000, 48, 24), skyMat);
  dome.renderOrder = -2;
  dome.frustumCulled = false;
  scene.add(dome);

  // distance haze: a soft band that melts the far edge of the city into the sky
  const hazeMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color() }, uTop: { value: 1 } },
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    fog: false,
    vertexShader: `varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uTop; varying float vY; void main(){ float a = 1.0 - smoothstep(0.0, uTop, vY); gl_FragColor = vec4(uColor, a * a * (3.0 - 2.0 * a)); }`,
  });
  const haze = new THREE.Mesh(new THREE.CylinderGeometry(7000, 7000, 2600, 48, 1, true).translate(0, 1000, 0), hazeMat);
  haze.renderOrder = -1;
  haze.frustumCulled = false;
  scene.add(haze);

  const traffic = new THREE.Points(buildTraffic(), trafficMaterial(shared));
  traffic.frustumCulled = false;
  scene.add(traffic);

  const bGeo = new THREE.BufferGeometry();
  const bPos: number[] = [];
  const bPhase: number[] = [];
  for (let i = 0; i < data.beacons.length; i += 4) {
    bPos.push(data.beacons[i], data.beacons[i + 1], data.beacons[i + 2]);
    bPhase.push(data.beacons[i + 3]);
  }
  bGeo.setAttribute("position", new THREE.Float32BufferAttribute(bPos, 3));
  bGeo.setAttribute("aPhase", new THREE.Float32BufferAttribute(bPhase, 1));
  const beacons = new THREE.Points(bGeo, beaconMaterial(shared));
  beacons.frustumCulled = false;
  scene.add(beacons);

  // ---- light ----
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(lean ? 2048 : 4096, lean ? 2048 : 4096);
  const sc = sun.shadow.camera;
  sc.left = -1250;
  sc.right = 1250;
  sc.top = 700;
  sc.bottom = -700;
  sc.near = 200;
  sc.far = 6000;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.7;
  sun.target.position.set(0, 0, -150);
  scene.add(sun, sun.target);

  // ---- film ----
  const target = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: lean ? 2 : 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.7, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const finish = new ShaderPass(FinishShader);
  composer.addPass(finish);

  // ---- sky photographs: backdrop and the light the glass reflects ----
  const pmrem = new THREE.PMREMGenerator(renderer);
  const skies: Partial<Record<Mode, { bg: THREE.Texture; env: THREE.Texture }>> = {};
  const loader = new THREE.TextureLoader();
  const loadSky = (mode: Mode) =>
    new Promise<void>((resolve, reject) => {
      loader.load(
        LOOK[mode].sky,
        (tex) => {
          tex.mapping = THREE.EquirectangularReflectionMapping;
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.wrapS = THREE.RepeatWrapping;
          tex.generateMipmaps = false;
          tex.minFilter = THREE.LinearFilter;
          skies[mode] = { bg: tex, env: pmrem.fromEquirectangular(tex).texture };
          resolve();
        },
        undefined,
        reject,
      );
    });

  let mode: Mode = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  const apply = () => {
    const L = LOOK[mode];
    const sky = skies[mode];
    if (sky) {
      skyMat.uniforms.uMap.value = sky.bg;
      scene.environment = sky.env;
    }
    dome.visible = !!sky;
    scene.background = fog.color;
    // turn the photograph so its sun sits where the 3D sun is
    const rot = (L.srcU - 0.5) * Math.PI * 2 - AZ;
    skyMat.uniforms.uYaw.value = rot;
    skyMat.uniforms.uPitch.value = L.pitch;
    skyMat.uniforms.uTint.value.setRGB(L.tint[0], L.tint[1], L.tint[2]);
    scene.environmentRotation.set(0, rot, 0);
    scene.environmentIntensity = L.env;
    fog.color.setHex(L.fog);
    hazeMat.uniforms.uColor.value.setHex(L.fog);
    hazeMat.uniforms.uTop.value = L.hazeTop;
    fog.density = L.fogDensity;
    shared.fogDensity.value = L.fogDensity;
    shared.night.value = L.night;
    sun.color.setHex(L.sun);
    sun.intensity = L.sunPower;
    sun.position.copy(sun.target.position).addScaledVector(L.dir, 3000);
    bloom.strength = L.bloom[0];
    bloom.radius = L.bloom[1];
    bloom.threshold = L.bloom[2];
    renderer.toneMappingExposure = L.exposure;
    renderer.shadowMap.needsUpdate = true;
  };

  // ---- camera ----
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const posCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...(k.pos as [number, number, number]))), false, "catmullrom", 0.35);
  const atCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...(k.at as [number, number, number]))), false, "catmullrom", 0.35);
  const at = new THREE.Vector3();
  let goal = 0;
  let p = 0;
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };

  const place = (time: number) => {
    // which pair of keys are we between, and how far
    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
    const a = KEYS[i];
    const b = KEYS[i + 1];
    const t = smooth(THREE.MathUtils.clamp((p - a.p) / (b.p - a.p), 0, 1));
    const u = (i + t) / (KEYS.length - 1);
    posCurve.getPoint(u, camera.position);
    atCurve.getPoint(u, at);
    camera.fov = a.fov + (b.fov - a.fov) * t;
    // a slow breathing drift, plus a little look-around from the pointer
    const drift = reduced ? 0 : 1;
    camera.position.x += Math.sin(time * 0.11) * 2.2 * drift + ptr.x * 3;
    camera.position.y += Math.sin(time * 0.083 + 1) * 1.4 * drift * Math.min(1, camera.position.y / 40) + ptr.y * 1.5 * Math.min(1, camera.position.y / 40);
    at.x += ptr.x * 26;
    at.y -= ptr.y * 14;
    camera.lookAt(at);
    dome.position.copy(camera.position);
    haze.position.set(camera.position.x, 0, camera.position.z);
    camera.updateProjectionMatrix();
  };

  const readScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    goal = max > 0 ? THREE.MathUtils.clamp(window.scrollY / max, 0, 1) : 0;
    dirty = true;
  };

  // resolution steps down on machines that cannot hold a decent frame rate
  let quality = 1;
  let dirty = true;
  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, w < 800 ? 1.5 : 1.6) * quality;
    dirty = true;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    camera.aspect = w / h;
    readScroll();
  };

  let raf = 0;
  let last = performance.now();
  let clock = 0;
  const draw = () => {
    // point lights are sized in device pixels per metre at one metre
    shared.scale.value = renderer.domElement.height / (2 * Math.tan((camera.fov * Math.PI) / 360));
    shared.time.value = clock;
    finish.uniforms.uTime.value = clock;
    place(clock);
    composer.render();
    dirty = false;
  };
  let slow = 0;
  let counted = 0;
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!reduced) clock += dt;
    p += (goal - p) * (reduced ? 1 : 1 - Math.exp(-dt * 4.5));
    ptr.x += (ptr.tx - ptr.x) * 0.05;
    ptr.y += (ptr.ty - ptr.y) * 0.05;
    // with reduced motion nothing moves by itself, so only draw when something changed
    if (!reduced || dirty) draw();
    if (!reduced && quality > 0.5) {
      slow += now - last > 0 ? dt : 0;
      if (++counted === 40) {
        if (slow / counted > 0.04) {
          quality = Math.max(0.5, quality - 0.25);
          resize();
        }
        slow = 0;
        counted = 0;
      }
    }
    raf = requestAnimationFrame(frame);
  };
  const wake = () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };

  const onPointer = (e: PointerEvent) => {
    if (e.pointerType === "touch" || reduced) return;
    dirty = true;
    ptr.tx = (e.clientX / window.innerWidth) * 2 - 1;
    ptr.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };
  // the ink transition photographs the page the instant the theme flips, so redraw in the same tick
  const themeWatch = new MutationObserver(() => {
    const next: Mode = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    if (next === mode) return;
    mode = next;
    apply();
    draw();
  });
  themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  window.addEventListener("resize", resize);
  window.addEventListener("scroll", readScroll, { passive: true });
  window.addEventListener("pointermove", onPointer);
  document.addEventListener("visibilitychange", wake);

  let dead = false;
  resize();
  p = goal;
  loadSky(mode)
    .then(() => {
      if (dead) return;
      apply();
      draw();
      onReady();
      wake();
      // fetch the other hour quietly so the first switch is instant
      const other: Mode = mode === "dark" ? "light" : "dark";
      return loadSky(other).then(() => {
        if (dead) return;
        apply();
        dirty = true;
      });
    })
    .catch(() => {
      // no sky photograph: still show the city under the fog colour
      if (dead) return;
      apply();
      onReady();
      wake();
    });

  return () => {
    dead = true;
    cancelAnimationFrame(raf);
    themeWatch.disconnect();
    window.removeEventListener("resize", resize);
    window.removeEventListener("scroll", readScroll);
    window.removeEventListener("pointermove", onPointer);
    document.removeEventListener("visibilitychange", wake);
    pmrem.dispose();
    composer.dispose();
    renderer.dispose();
  };
}
