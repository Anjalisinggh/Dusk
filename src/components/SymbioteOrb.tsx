"use client";

import { useEffect, useRef, useState } from "react";
import { ORB_FRAG, ORB_VERT } from "@/lib/orbShader";
import { useTheme } from "./ThemeProvider";

/** The toggle: a live black liquid orb. Tap it and the ink pours out of it. */
export function SymbioteOrb() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  const btn = useRef<HTMLButtonElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef({ dark: dark ? 1 : 0, pulse: 0 });
  const [flat, setFlat] = useState(false);

  useEffect(() => {
    const c = canvas.current!;
    const b = btn.current!;
    const gl = c.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: true });
    if (!gl) {
      setFlat(true);
      return;
    }
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, ORB_VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, ORB_FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setFlat(true);
      return;
    }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const U = (n: string) => gl.getUniformLocation(prog, n);
    const u = { res: U("uRes"), time: U("uTime"), mouse: U("uMouse"), hover: U("uHover"), pulse: U("uPulse"), dark: U("uDark") };

    const resize = () => {
      const r = c.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.max(64, Math.round(r.width * dpr));
      c.height = Math.max(64, Math.round(r.height * dpr));
      gl.viewport(0, 0, c.width, c.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const m = { x: 0, y: -0.3, tx: 0, ty: -0.3, hover: 0, th: 0 };
    const onMove = (e: PointerEvent) => {
      const r = b.getBoundingClientRect();
      const rad = r.width / 2;
      const dx = (e.clientX - (r.left + rad)) / rad;
      const dy = -(e.clientY - (r.top + r.height / 2)) / rad;
      const len = Math.hypot(dx, dy);
      const k = len > 1.2 ? 1.2 / len : 1;
      m.tx = dx * k;
      m.ty = dy * k;
      m.th = len < 1.6 ? 1 : 0;
    };
    const onLeave = () => {
      m.th = 0;
    };
    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);

    let raf = 0;
    let onScreen = true;
    const t0 = performance.now();
    const frame = (now: number) => {
      const s = state.current;
      m.x += (m.tx - m.x) * 0.08;
      m.y += (m.ty - m.y) * 0.08;
      m.hover += (m.th - m.hover) * 0.06;
      s.pulse *= 0.95;
      const target = document.documentElement.dataset.theme === "dark" ? 1 : 0;
      s.dark += (target - s.dark) * 0.05;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(u.res, c.width, c.height);
      gl.uniform1f(u.time, reduced ? 0 : (now - t0) / 1000);
      gl.uniform2f(u.mouse, m.x, m.y);
      gl.uniform1f(u.hover, Math.max(m.hover, s.pulse));
      gl.uniform1f(u.pulse, s.pulse);
      gl.uniform1f(u.dark, s.dark);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (onScreen && !document.hidden) raf = requestAnimationFrame(frame);
      else raf = 0;
    };
    const wake = () => {
      if (!raf && onScreen && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      wake();
    });
    io.observe(c);
    document.addEventListener("visibilitychange", wake);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);

  return (
    <div className="orb">
      <button
        ref={btn}
        type="button"
        data-theme-toggle
        className={`orb__button${flat ? " orb__button--flat" : ""}`}
        aria-label={dark ? "Switch to Hero mode" : "Switch to Symbiote mode"}
        aria-pressed={dark}
        onClick={(e) => {
          state.current.pulse = 1;
          toggle(e.currentTarget);
        }}
      >
        <canvas ref={canvas} className="orb__canvas" aria-hidden />
      </button>
      <p className="orb__caption" aria-live="polite">
        <span className="orb__mode">{dark ? "Symbiote" : "Hero"}</span>
        <span className="orb__hint">{dark ? "Touch it to break free" : "Touch it to let it in"}</span>
      </p>
    </div>
  );
}
