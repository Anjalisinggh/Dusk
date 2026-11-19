import { rng, r1 } from "@/lib/rand";

/**
 * Symbiote tendrils growing in from the edges: each is a tapering ribbon along a
 * wandering centre line, with a few thin offshoots. Drawn as filled shapes so they
 * read as flesh, not strokes. Sizes are in a 400 x 1000 box per side edge.
 */
type Tendril = { d: string; ox: number; oy: number; delay: number };

function ribbon(r: () => number, x: number, y: number, ang: number, len: number, w0: number, steps: number) {
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  const centre: [number, number, number][] = [];
  const curl = (r() - 0.5) * 0.14;
  const wob = 0.6 + r() * 1.4;
  const ph = r() * 6.28;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // fat at the root, a slight swell a third of the way, a fine point at the tip
    const w = w0 * Math.pow(1 - t, 1.1) * (1 + 0.25 * Math.sin(t * 9.4)) + 0.5;
    centre.push([x, y, ang]);
    const nx = Math.cos(ang + Math.PI / 2);
    const ny = Math.sin(ang + Math.PI / 2);
    left.push([x + nx * w, y + ny * w]);
    right.push([x - nx * w, y - ny * w]);
    ang += curl + Math.sin(t * 5 * wob + ph) * 0.11;
    x += Math.cos(ang) * (len / steps);
    y += Math.sin(ang) * (len / steps);
  }
  const pts = [...left, ...right.reverse()];
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) d += `L${r1(pts[i][0])} ${r1(pts[i][1])}`;
  return { d: d + "Z", centre };
}

function grow(seed: number, count: number, anchor: (r: () => number, i: number) => [number, number, number], len: [number, number], width: [number, number]) {
  const r = rng(seed);
  const out: Tendril[] = [];
  for (let i = 0; i < count; i++) {
    const [x, y, ang] = anchor(r, i);
    const L = len[0] + r() * (len[1] - len[0]);
    const main = ribbon(r, x, y, ang, L, width[0] + r() * (width[1] - width[0]), 40);
    let d = main.d;
    // offshoots
    const n = Math.floor(r() * 2.4);
    for (let k = 0; k < n; k++) {
      const c = main.centre[8 + Math.floor(r() * 22)];
      const side = r() < 0.5 ? -1 : 1;
      d += ribbon(r, c[0], c[1], c[2] + side * (0.5 + r() * 0.7), L * (0.3 + r() * 0.3), 7 + r() * 6, 22).d;
    }
    out.push({ d, ox: x, oy: y, delay: -r() * 9 });
  }
  return out;
}

// left edge grows rightwards, right edge leftwards (mirrored), bottom upwards
const SIDE = grow(5, 6, (r, i) => [-12, 90 + i * 150 + r() * 70, (r() - 0.5) * 0.9], [220, 420], [20, 38]);
const SIDE_R = grow(7, 6, (r, i) => [-12, 60 + i * 150 + r() * 80, (r() - 0.5) * 0.9], [240, 440], [22, 40]);
const BOTTOM = grow(9, 9, (r, i) => [60 + i * 180 + r() * 90, 312, -Math.PI / 2 + (r() - 0.5) * 1.1], [110, 240], [16, 30]);

function Group({ list }: { list: Tendril[] }) {
  return list.map((t, i) => (
    <path
      key={i}
      className="tendril"
      d={t.d}
      style={{ transformOrigin: `${t.ox}px ${t.oy}px`, animationDelay: `${t.delay}s` } as React.CSSProperties}
    />
  ));
}

export function Tendrils() {
  return (
    <div className="tendrils" aria-hidden>
      <svg className="tendrils__side tendrils__side--left" viewBox="0 0 400 1000" preserveAspectRatio="xMinYMid meet">
        <Group list={SIDE} />
      </svg>
      <svg className="tendrils__side tendrils__side--right" viewBox="0 0 400 1000" preserveAspectRatio="xMinYMid meet">
        <Group list={SIDE_R} />
      </svg>
      <svg className="tendrils__bottom" viewBox="0 0 1600 300" preserveAspectRatio="xMidYMax slice">
        <Group list={BOTTOM} />
      </svg>
    </div>
  );
}
