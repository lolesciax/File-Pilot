import { create } from "zustand";
export type Theme = "light" | "dark" | "system";
function initial(): Theme {
  try {
    const t = localStorage.getItem("filepilot-theme");
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}
export const useTheme = create<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>((set) => ({
  theme: initial(),
  setTheme: (theme) => {
    try {
      localStorage.setItem("filepilot-theme", theme);
    } catch {
      /* Private browsing may block preferences. */
    }
    set({ theme });
  },
}));
