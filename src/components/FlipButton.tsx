"use client";

import { useTheme } from "./ThemeProvider";

/** In-page button that changes the hour. The ink pours out of the button itself. */
export function FlipButton() {
  const { theme, toggle } = useTheme();
  return (
    <button type="button" className="flip" onClick={(e) => toggle(e.currentTarget)}>
      {theme === "dark" ? "Bring the sun back" : "See it after dark"}
    </button>
  );
}
