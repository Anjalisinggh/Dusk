"use client";

import { useTheme } from "./ThemeProvider";

/** A plain sun/moon switch in the top bar. The ink pours from wherever it sits. */
export function ThemeSwitch() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      data-theme-toggle
      className="switch"
      onClick={(e) => toggle(e.currentTarget)}
    >
      <svg className="switch__icon switch__icon--sun" viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
      </svg>
      <svg className="switch__icon switch__icon--moon" viewBox="0 0 24 24" aria-hidden>
        <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.2 8.2 0 1 0 10.2 10.2Z" />
      </svg>
      <span className="switch__knob" />
    </button>
  );
}
