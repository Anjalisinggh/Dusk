"use client";

import { useEffect, useRef, useState } from "react";

/** The 3D city, fixed behind the page. Scroll flies the camera; the theme changes the hour. */
export function City() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "flat">("loading");

  useEffect(() => {
    let stop = () => {};
    let dead = false;
    import("@/lib/city/scene")
      .then(({ startCity }) => {
        if (dead || !ref.current) return;
        stop = startCity(ref.current, () => setState("ready"));
      })
      .catch(() => setState("flat"));
    return () => {
      dead = true;
      stop();
    };
  }, []);

  return <canvas ref={ref} className={`city city--${state}`} aria-hidden />;
}
