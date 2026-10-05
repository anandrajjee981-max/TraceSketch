import { useTheme } from "../context/ThemeContext";

/**
 * Sun / moon switch, shared by the console TopNav and the website SiteNav so
 * the affordance is identical in both places.
 *
 * A sliding knob rather than two separate icons: the knob's position *is* the
 * state, which reads faster than an icon swap and animates for free. Both
 * states are always labelled for screen readers, and the accessible name says
 * what the button will do ("Switch to dark theme") rather than what it is.
 *
 * All color comes from tokens, so the control re-themes along with everything
 * else instead of keeping a fixed dark chip in a light navbar.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      role="switch"
      aria-checked={isDark}
      className={`relative flex h-[26px] w-[52px] shrink-0 items-center rounded-full border-[var(--stroke)] border-[var(--border)] ${className}`}
      style={{ background: "var(--bg-surface-2)", boxShadow: "var(--shadow-sm)" }}
    >
      {/* Track fills from the side the knob is heading to, giving the flip a
          colour read as well as a position read. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full transition-opacity duration-200"
        style={{
          background: isDark ? "var(--accent)" : "var(--flare)",
          opacity: 0.16,
        }}
      />

      <span className="relative z-10 flex w-1/2 items-center justify-center">
        <svg
          width="13"
          height="13"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className="transition-colors duration-200"
          style={{ color: isDark ? "var(--accent)" : "var(--flare)" }}
        >
          {isDark ? (
            <path
              d="M16.5 12.4A7 7 0 0 1 7.6 3.5a7 7 0 1 0 8.9 8.9Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          ) : (
            <>
              <circle cx="10" cy="10" r="3.6" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M10 1.6v2.2M10 16.2v2.2M18.4 10h-2.2M3.8 10H1.6M15.9 4.1l-1.6 1.6M5.7 14.3l-1.6 1.6M15.9 15.9l-1.6-1.6M5.7 5.7 4.1 4.1"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </>
          )}
        </svg>
      </span>

      <span className="relative z-10 flex w-1/2 items-center justify-center">
        <svg
          width="13"
          height="13"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className="transition-colors duration-200"
          style={{ color: isDark ? "var(--text-dim)" : "var(--accent)" }}
        >
          {isDark ? (
            <>
              <circle cx="10" cy="10" r="3.6" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M10 1.6v2.2M10 16.2v2.2M18.4 10h-2.2M3.8 10H1.6M15.9 4.1l-1.6 1.6M5.7 14.3l-1.6 1.6M15.9 15.9l-1.6-1.6M5.7 5.7 4.1 4.1"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </>
          ) : (
            <path
              d="M16.5 12.4A7 7 0 0 1 7.6 3.5a7 7 0 1 0 8.9 8.9Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </span>

      {/* Knob sits above the icons and physically moves between them. */}
      <span
        aria-hidden="true"
        className="absolute top-1/2 z-20 h-[18px] w-[18px] -translate-y-1/2 rounded-full border-[var(--stroke)] border-[var(--border)] transition-[left] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          left: isDark ? "calc(100% - 22px)" : "4px",
          background: "var(--bg-surface)",
        }}
      />
    </button>
  );
}
