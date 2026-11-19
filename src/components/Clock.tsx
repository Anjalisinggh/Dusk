"use client";

import { useTheme } from "./ThemeProvider";

/** Same rooftop, two hours of the night. */
export function Clock() {
  const { theme } = useTheme();
  return <span className="top__clock">New York, {theme === "dark" ? "3:12 am" : "7:42 pm"}</span>;
}
