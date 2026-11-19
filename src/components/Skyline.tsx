import { rng, r1 } from "@/lib/rand";

type Layer = { seed: number; min: number; max: number; towers: number; windows: boolean };

const W = 1600;
const H = 600;

/**
 * One row of rooftops as a single path: setback towers, water tanks on stilts, antennas.
 * Lit windows (near row only) are a second path so they can glow in their own colour.
 */
function buildRow({ seed, min, max, towers, windows }: Layer) {
  const r = rng(seed);
  let d = "";
  let win = "";
  let x = -20;
  while (x < W + 20) {
    const w = 34 + r() * 86;
    const h = min + r() * (max - min);
    const top = H - h;
    d += `M${r1(x)} ${H}V${r1(top)}H${r1(x + w)}V${H}Z`;

    // setbacks: two narrower steps on the taller buildings
    if (h > max * 0.72 && r() < 0.55) {
      const s1 = w * (0.62 + r() * 0.15);
      const h1 = 18 + r() * 34;
      const x1 = x + (w - s1) / 2;
      d += `M${r1(x1)} ${r1(top + 1)}V${r1(top - h1)}H${r1(x1 + s1)}V${r1(top + 1)}Z`;
      const s2 = s1 * 0.55;
      const h2 = 14 + r() * 26;
      const x2 = x + (w - s2) / 2;
      d += `M${r1(x2)} ${r1(top - h1 + 1)}V${r1(top - h1 - h2)}H${r1(x2 + s2)}V${r1(top - h1 + 1)}Z`;
      if (r() < 0.6) {
        const ax = x + w / 2;
        d += `M${r1(ax - 1.2)} ${r1(top - h1 - h2 + 1)}V${r1(top - h1 - h2 - 30 - r() * 50)}H${r1(ax + 1.2)}V${r1(top - h1 - h2 + 1)}Z`;
      }
    } else if (r() < towers) {
      // a wooden water tank on legs, the New York roofline
      const tw = 14 + r() * 8;
      const tx = x + 6 + r() * Math.max(1, w - tw - 12);
      const legs = 8 + r() * 6;
      const tank = 16 + r() * 8;
      const base = top - legs;
      d += `M${r1(tx + 1)} ${r1(top + 1)}V${r1(base)}H${r1(tx + 3)}V${r1(top + 1)}Z`;
      d += `M${r1(tx + tw - 3)} ${r1(top + 1)}V${r1(base)}H${r1(tx + tw - 1)}V${r1(top + 1)}Z`;
      d += `M${r1(tx)} ${r1(base + 1)}V${r1(base - tank)}H${r1(tx + tw)}V${r1(base + 1)}Z`;
      d += `M${r1(tx - 1)} ${r1(base - tank + 0.5)}L${r1(tx + tw / 2)} ${r1(base - tank - 9)}L${r1(tx + tw + 1)} ${r1(base - tank + 0.5)}Z`;
    }

    if (windows) {
      for (let wy = top + 10; wy < H - 8; wy += 13) {
        for (let wx = x + 6; wx < x + w - 8; wx += 9) {
          if (r() < 0.16) win += `M${r1(wx)} ${r1(wy)}h3.4v5.2h-3.4Z`;
        }
      }
    }
    x += w + (r() < 0.3 ? 4 + r() * 10 : 0);
  }
  return { d, win };
}

const FAR = buildRow({ seed: 11, min: 150, max: 380, towers: 0.15, windows: false });
const MID = buildRow({ seed: 23, min: 90, max: 300, towers: 0.35, windows: false });
const NEAR = buildRow({ seed: 37, min: 40, max: 190, towers: 0.5, windows: true });

export function Skyline() {
  return (
    <div className="skyline" aria-hidden>
      <svg className="skyline__row layer" style={{ "--depth": 6 } as React.CSSProperties} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
        <path d={FAR.d} fill="var(--city-far)" />
      </svg>
      <svg className="skyline__row layer" style={{ "--depth": 14 } as React.CSSProperties} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
        <path d={MID.d} fill="var(--city-mid)" />
      </svg>
      <svg className="skyline__row skyline__row--near layer" style={{ "--depth": 26 } as React.CSSProperties} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
        <path d={NEAR.d} fill="var(--city-near)" />
        <path className="skyline__windows" d={NEAR.win} fill="var(--window)" />
      </svg>
    </div>
  );
}
