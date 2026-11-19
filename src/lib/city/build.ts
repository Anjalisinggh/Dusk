import * as THREE from "three";
import { AVENUE, HALF_X, HALF_Z, NX, NZ, PX, PZ, SIDEWALK, STREET, mulberry32 } from "./layout";

/**
 * Builds the whole city as one mesh: every building is one to three stacked boxes
 * (setbacks), with facade coordinates measured in window bays and floors so the
 * shader can draw the windows. Also returns where the rooftop tanks and aircraft
 * beacons go.
 */
export type CityData = {
  geometry: THREE.BufferGeometry;
  tanks: { x: number; y: number; z: number; s: number }[];
  beacons: number[]; // x, y, z, phase
};

const MASONRY = 0;
const CURTAIN = 1;
const RIBBON = 2;
const PLAIN = 3;

// where the tall towers gather: x, z, spread, strength
const CLUSTERS = [
  [-40, -420, 300, 1.0],
  [220, 260, 230, 0.85],
  [-330, 620, 200, 0.6],
  [520, -900, 260, 0.7],
  [-640, -1200, 240, 0.6],
];

function density(x: number, z: number) {
  let d = 0.06;
  for (const [cx, cz, s, k] of CLUSTERS) {
    const q = ((x - cx) ** 2 + (z - cz) ** 2) / (2 * s * s);
    d = Math.max(d, k * Math.exp(-q));
  }
  return d;
}

export function buildCity(): CityData {
  const r = mulberry32(20261119);
  const pos: number[] = [];
  const nor: number[] = [];
  const fuv: number[] = [];
  const info: number[] = [];
  const idx: number[] = [];
  const tanks: CityData["tanks"] = [];
  const beacons: number[] = [];

  const quad = (
    p: number[][],
    n: [number, number, number],
    uv: number[][],
    seed: number,
    style: number,
    wall: number,
    floors: number,
  ) => {
    const base = pos.length / 3;
    for (let i = 0; i < 4; i++) {
      pos.push(p[i][0], p[i][1], p[i][2]);
      nor.push(n[0], n[1], n[2]);
      fuv.push(uv[i][0], uv[i][1]);
      info.push(seed, style, wall, floors);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  /** one box, walls and roof only. cellW/floorH set the window grid; floors caps the window rows. */
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, seed: number, style: number, cellW: number, floorH: number, floors: number) => {
    const wall = style === PLAIN ? 0 : 1;
    const v0 = y0 / floorH;
    const v1 = y1 / floorH;
    const face = (a: number[], b: number[], n: [number, number, number], k: number) => {
      const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
      const bays = Math.max(1, Math.round(len / cellW));
      const off = k * 37 + Math.floor(seed * 91);
      quad(
        [
          [a[0], y0, a[2]],
          [b[0], y0, b[2]],
          [b[0], y1, b[2]],
          [a[0], y1, a[2]],
        ],
        n,
        [
          [off, v0],
          [off + bays, v0],
          [off + bays, v1],
          [off, v1],
        ],
        seed,
        style,
        wall,
        floors,
      );
    };
    face([x0, 0, z1], [x1, 0, z1], [0, 0, 1], 0);
    face([x1, 0, z1], [x1, 0, z0], [1, 0, 0], 1);
    face([x1, 0, z0], [x0, 0, z0], [0, 0, -1], 2);
    face([x0, 0, z0], [x0, 0, z1], [-1, 0, 0], 3);
    quad(
      [
        [x0, y1, z1],
        [x1, y1, z1],
        [x1, y1, z0],
        [x0, y1, z0],
      ],
      [0, 1, 0],
      [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
      ],
      seed,
      PLAIN,
      0,
      0,
    );
  };

  const building = (x0: number, x1: number, z0: number, z1: number, h: number) => {
    const seed = r();
    const t = r();
    let style = MASONRY;
    if (h > 110) style = t < 0.68 ? CURTAIN : t < 0.84 ? RIBBON : MASONRY;
    else if (h > 40) style = t < 0.45 ? MASONRY : t < 0.72 ? RIBBON : CURTAIN;
    else style = t < 0.72 ? MASONRY : t < 0.9 ? RIBBON : CURTAIN;

    // these must match what the shader expects per style
    const cellW = style === MASONRY ? 3 + seed * 1.2 : style === CURTAIN ? 1.5 + ((seed * 7) % 1) * 0.6 : 6;
    const floorH = style === MASONRY ? 3.3 : style === CURTAIN ? 3.9 : 3.6;
    const parapet = style === CURTAIN ? 0.6 : 1.3;
    const floors = Math.max(2, Math.round(h / floorH));
    const top = floors * floorH + parapet;

    let rx0 = x0, rx1 = x1, rz0 = z0, rz1 = z1;
    const roofY = top;
    const w = x1 - x0;
    const d = z1 - z0;
    if (style !== CURTAIN && h > 70 && Math.min(w, d) > 22) {
      // wedding-cake setbacks, the old zoning-law silhouette
      const f1 = Math.round(floors * (0.5 + r() * 0.15));
      const f2 = Math.round(floors * (0.8 + r() * 0.08));
      const i1 = 3 + r() * 3;
      const i2 = i1 + 3 + r() * 4;
      box(x0, x1, 0, f1 * floorH + parapet, z0, z1, seed, style, cellW, floorH, f1);
      box(x0 + i1, x1 - i1, f1 * floorH, f2 * floorH + parapet, z0 + i1, z1 - i1, seed, style, cellW, floorH, f2);
      box(x0 + i2, x1 - i2, f2 * floorH, top, z0 + i2, z1 - i2, seed, style, cellW, floorH, floors);
      rx0 = x0 + i2; rx1 = x1 - i2; rz0 = z0 + i2; rz1 = z1 - i2;
    } else if (style === CURTAIN && h > 150 && r() < 0.6) {
      // glass tower with a slimmer upper shaft
      const f1 = Math.round(floors * (0.62 + r() * 0.2));
      const ix = w * (0.1 + r() * 0.12);
      const iz = d * (0.1 + r() * 0.12);
      box(x0, x1, 0, f1 * floorH + parapet, z0, z1, seed, style, cellW, floorH, f1);
      box(x0 + ix, x1 - ix, f1 * floorH, top, z0 + iz, z1 - iz, seed, style, cellW, floorH, floors);
      rx0 = x0 + ix; rx1 = x1 - ix; rz0 = z0 + iz; rz1 = z1 - iz;
    } else {
      box(x0, x1, 0, top, z0, z1, seed, style, cellW, floorH, floors);
    }

    // rooftop plant room
    const rw = rx1 - rx0;
    const rd = rz1 - rz0;
    if (rw > 8 && rd > 8) {
      const mw = rw * (0.3 + r() * 0.3);
      const md = rd * (0.3 + r() * 0.3);
      const mx = rx0 + 1.5 + r() * (rw - mw - 3);
      const mz = rz0 + 1.5 + r() * (rd - md - 3);
      const mh = 2.5 + r() * 3.5;
      box(mx, mx + mw, roofY, roofY + mh, mz, mz + md, seed, PLAIN, 1, 1, 0);
      if (h > 190 && r() < 0.75) {
        // mast with an aircraft warning light
        const ah = 22 + r() * 48;
        const ax = mx + mw / 2;
        const az = mz + md / 2;
        box(ax - 0.5, ax + 0.5, roofY + mh, roofY + mh + ah, az - 0.5, az + 0.5, seed, PLAIN, 1, 1, 0);
        beacons.push(ax, roofY + mh + ah + 0.6, az, r());
      } else if (h > 120) {
        beacons.push(rx0 + 1, roofY + 1.2, rz0 + 1, r());
      }
      if (style === MASONRY && h < 95 && r() < 0.6) {
        tanks.push({ x: rx0 + 3 + r() * (rw - 6), y: roofY, z: rz0 + 3 + r() * (rd - 6), s: 0.85 + r() * 0.4 });
      }
    }
  };

  for (let bi = -NX / 2; bi < NX / 2; bi++) {
    for (let bj = -NZ / 2; bj < NZ / 2; bj++) {
      const cx = (bi + 0.5) * PX;
      const cz = (bj + 0.5) * PZ;
      const x0 = cx - (PX - AVENUE) / 2 + SIDEWALK;
      const x1 = cx + (PX - AVENUE) / 2 - SIDEWALK;
      const zEnd = cz + (PZ - STREET) / 2 - SIDEWALK;
      let z = cz - (PZ - STREET) / 2 + SIDEWALK;
      while (z < zEnd - 10) {
        const left = zEnd - z;
        const d = density(cx, z);
        if (left > 50 && r() < d * 0.42) {
          // a full-width tower lot
          const len = Math.min(left, 42 + r() * 30);
          const h = 80 + d * (60 + r() * 230) + r() * 30;
          const inset = r() * 3;
          building(x0 + inset, x1 - inset, z + inset, z + len - inset, h);
          z += len;
        } else {
          let len = 16 + r() * 22;
          if (left - len < 14) len = left;
          const mid = (x0 + x1) / 2;
          for (const side of [0, 1]) {
            const h = 11 + r() * r() * 34 + d * r() * 120;
            const set = r() < 0.3 ? r() * 2.5 : 0;
            if (side === 0) building(x0 + set, mid, z, z + len, h);
            else building(mid, x1 - set, z, z + len, h);
          }
          z += len;
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geometry.setAttribute("aFuv", new THREE.Float32BufferAttribute(fuv, 2));
  geometry.setAttribute("aInfo", new THREE.Float32BufferAttribute(info, 4));
  geometry.setIndex(idx);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 150, 0), Math.hypot(HALF_X, HALF_Z) + 400);
  return { geometry, tanks, beacons };
}

/** traffic: one light per car. axis 0 drives along Z (avenues), 1 along X (streets). */
export function buildTraffic() {
  const r = mulberry32(99);
  const lane: number[] = [];
  const add = (axis: number, coord: number, dir: number, length: number, n: number) => {
    for (let i = 0; i < n; i++) lane.push(axis, coord, r() * length, dir * (7 + r() * 8));
  };
  for (let k = -NX / 2; k <= NX / 2; k++) {
    const x = k * PX;
    const busy = Math.abs(k) < 5 ? 34 : 16;
    add(0, x + 3.4, -1, HALF_Z * 2, busy);
    add(0, x + 9, -1, HALF_Z * 2, busy);
    add(0, x - 3.4, 1, HALF_Z * 2, busy);
    add(0, x - 9, 1, HALF_Z * 2, busy);
  }
  for (let m = -NZ / 2; m <= NZ / 2; m++) {
    const z = m * PZ;
    add(1, z + 3.2, 1, HALF_X * 2, 22);
    add(1, z - 3.2, -1, HALF_X * 2, 22);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array((lane.length / 4) * 3), 3));
  g.setAttribute("aLane", new THREE.Float32BufferAttribute(lane, 4));
  return g;
}
