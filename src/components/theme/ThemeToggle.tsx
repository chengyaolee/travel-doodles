"use client";

import { useTheme } from "next-themes";
import { InkIcon } from "@/components/ui/InkIcon";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const selectedTheme = theme ?? "system";

  return (
    <label className="theme-picker icon-button" title={`Appearance: ${selectedTheme}`}>
      <InkIcon name={selectedTheme === "dark" ? "moon" : selectedTheme === "light" ? "sun" : "system"} />
      <select aria-label="Appearance" value={selectedTheme} onChange={(event) => setTheme(event.target.value)}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </label>
  );
}
