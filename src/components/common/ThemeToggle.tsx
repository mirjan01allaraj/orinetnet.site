"use client";

import { useEffect, useState } from "react";

function setDarkClass(isDark: boolean) {
  const root = document.documentElement;
  if (isDark) root.classList.add("dark");
  else root.classList.remove("dark");
}

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(true); // default to dark (your current look)

  useEffect(() => {
    // load saved preference (or default to dark)
    const saved = localStorage.getItem("theme");
    const isDark = saved ? saved === "dark" : true;
    setDark(isDark);
    setDarkClass(isDark);
    setMounted(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    setDarkClass(next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  if (!mounted) return null; // avoids hydration mismatch

  return (
    <button
      type="button"
      onClick={toggle}
      className="
        inline-flex items-center gap-2
        px-3 py-2 rounded-xl
        border border-[var(--border)]
        bg-[var(--card)]
        text-[var(--text)]
        shadow-[0_12px_40px_rgba(0,0,0,0.18)]
        hover:opacity-90
      "
      aria-label="Toggle theme"
    >
      <span className="text-sm font-bold">
        {dark ? "Dark" : "Light"}
      </span>
      <span aria-hidden="true">{dark ? "🌙" : "☀️"}</span>
    </button>
  );
}
