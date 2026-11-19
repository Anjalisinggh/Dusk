/** The street grid, in metres. Avenues run along Z, cross streets along X. */
export const PX = 88; // avenue to avenue
export const PZ = 178; // street to street
export const AVENUE = 28;
export const STREET = 18;
export const SIDEWALK = 3;
export const NX = 26; // blocks across
export const NZ = 20; // blocks deep
export const HALF_X = (NX * PX) / 2;
export const HALF_Z = (NZ * PZ) / 2;

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
