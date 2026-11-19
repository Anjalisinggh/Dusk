"use client";

import { useEffect } from "react";

/**
 * Feeds the cursor into two CSS variables (--mx, --my, -1..1) with a little lag, so every
 * `.layer` can shift by its own depth. On touch screens the scene drifts slowly instead.
 */
export function Parallax() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const cur = { x: 0, y: 0 };
    const tgt = { x: 0, y: 0 };
    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      if (!fine) {
        const t = (now - start) / 1000;
        tgt.x = Math.sin(t * 0.21) * 0.5;
        tgt.y = Math.sin(t * 0.17 + 1) * 0.3;
      }
      cur.x += (tgt.x - cur.x) * 0.06;
      cur.y += (tgt.y - cur.y) * 0.06;
      root.style.setProperty("--mx", cur.x.toFixed(4));
      root.style.setProperty("--my", cur.y.toFixed(4));
      const settled = Math.abs(tgt.x - cur.x) < 0.001 && Math.abs(tgt.y - cur.y) < 0.001;
      raf = fine && settled ? 0 : requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      tgt.x = (e.clientX / window.innerWidth) * 2 - 1;
      tgt.y = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    if (fine) window.addEventListener("pointermove", onMove);
    else raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);
  return null;
}
