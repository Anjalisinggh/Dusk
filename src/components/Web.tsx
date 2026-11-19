/** A web strung across the top-left corner, only visible in Hero mode. */
const CX = 0;
const CY = 0;
const SPOKES = 11;
const RINGS = 14;

function web() {
  const spokes: string[] = [];
  const angles: number[] = [];
  for (let i = 0; i < SPOKES; i++) {
    // fan from just past horizontal to just past vertical, slightly uneven like a real web
    const a = -0.08 + (i / (SPOKES - 1)) * (Math.PI / 2 + 0.16) + Math.sin(i * 2.3) * 0.04;
    angles.push(a);
    spokes.push(`M${CX} ${CY}L${(Math.cos(a) * 760).toFixed(1)} ${(Math.sin(a) * 760).toFixed(1)}`);
  }
  // spiral threads sag a little between spokes
  const rings: string[] = [];
  for (let k = 1; k <= RINGS; k++) {
    const r = 34 * k + k * k * 1.6;
    let d = "";
    for (let i = 0; i < SPOKES; i++) {
      const a = angles[i];
      const rr = r * (1 + Math.sin(i * 1.7 + k) * 0.03);
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
      else {
        const am = (angles[i - 1] + a) / 2;
        const sag = rr * 0.9;
        d += `Q${(Math.cos(am) * sag).toFixed(1)} ${(Math.sin(am) * sag).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
    }
    rings.push(d);
  }
  return { spokes: spokes.join(""), rings: rings.join("") };
}

const WEB = web();

export function Web() {
  return (
    <svg className="web layer" style={{ "--depth": 10 } as React.CSSProperties} viewBox="0 0 760 760" aria-hidden>
      <path d={WEB.spokes} />
      <path d={WEB.rings} />
    </svg>
  );
}
