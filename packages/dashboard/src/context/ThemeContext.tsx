import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Theme = the two Neo-Brutalist palettes defined in `index.css`.
 *
 * `:root` is light ("paper"), `:root.dark` is dark ("midnight blueprint"). This
 * provider owns exactly one thing: which of the two is on `<html>`, persisted
 * so a reload doesn't flash or lose the choice.
 *
 * Deliberately a class on <html> rather than a data-attribute or per-component
 * state: one class re-resolves every token in the stylesheet at once, so the
 * console and the website can never drift out of sync with each other, and
 * there is no partial-switch state to get wrong.
 *
 * `index.html` runs the same resolve() inline in <head> before first paint —
 * without it the app would render light, then snap dark on hydration.
 */
export type Theme = "light" | "dark";

const STORAGE_KEY = "tracesketch-theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

/**
 * Resolve the initial theme. Order: explicit user choice → OS preference →
 * light. Deliberately NOT exported — `index.html` inlines an identical copy
 * before first paint so there is no flash of the wrong theme, which means this
 * function and that script must be edited together.
 */
function resolveInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Private mode / blocked storage — fall through to the OS preference.
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Mirror the current theme onto <html> and keep the browser UI in step. */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  // Keep the mobile browser chrome / PWA title bar matching the active ground.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#0b0c10" : "#faf8f5");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(resolveInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Follow the OS while the user has not made an explicit choice. Once they
  // toggle, the stored value wins and this listener stops having any effect,
  // which is the behaviour people expect from an explicit override.
  useEffect(() => {
    if (window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = (e: MediaQueryListEvent) => {
        let stored: string | null = null;
        try {
          stored = window.localStorage.getItem(STORAGE_KEY);
        } catch {
          /* storage blocked */
        }
        if (stored !== "light" && stored !== "dark") setThemeState(e.matches ? "dark" : "light");
      };
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* storage blocked — the toggle still works for this session */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
