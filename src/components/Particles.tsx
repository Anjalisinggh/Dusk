"use client";

import { useEffect, useRef } from "react";

/**
 * Dust in the evening light (Hero) or drifting spores (Symbiote). Each mote has a depth that sets
 * its size, speed and how far it follows the cursor parallax. Colour comes from --particle.
 */
export function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;
    let w = 0;
    let h = 0;
    let dpr = 1;
    type Mote = { x: number; y: number; z: number; r: number; vx: number; vy: number; tw: number };
    let motes: Mote[] = [];
    let rgb = "246,193,119";

    const readColour = () => {
      rgb = getComputedStyle(root).getPropertyValue("--particle").trim() || rgb;
    };
    const seed = () => {
      const n = Math.round(Math.min(90, (w * h) / 16000));
      motes = Array.from({ length: n }, () => {
        const z = 0.2 + Math.random() * 0.8;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          z,
          r: 0.5 + z * 1.6,
          vx: (Math.random() - 0.5) * 0.12,
          vy: -(0.05 + z * 0.25),
          tw: Math.random() * 6.28,
        };
      });
    };
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      seed();
    };
    resize();
    readColour();
    window.addEventListener("resize", resize);
    const mo = new MutationObserver(readColour);
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    let raf = 0;
    let visible = true;
    const draw = (now: number) => {
      const mx = parseFloat(root.style.getPropertyValue("--mx")) || 0;
      const my = parseFloat(root.style.getPropertyValue("--my")) || 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        if (!reduced) {
          m.x += m.vx;
          m.y += m.vy;
          if (m.y < -10) {
            m.y = h + 10;
            m.x = Math.random() * w;
          }
          if (m.x < -10) m.x = w + 10;
          if (m.x > w + 10) m.x = -10;
        }
        const a = (0.25 + 0.5 * m.z) * (0.6 + 0.4 * Math.sin(now / 900 + m.tw));
        ctx.fillStyle = `rgba(${rgb},${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(m.x - mx * 40 * m.z, m.y - my * 26 * m.z, m.r, 0, 6.2832);
        ctx.fill();
      }
      if (!reduced && visible) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    const onVis = () => {
      visible = !document.hidden;
      if (visible && !reduced) raf = requestAnimationFrame(draw);
      else cancelAnimationFrame(raf);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} className="particles" aria-hidden />;
}
