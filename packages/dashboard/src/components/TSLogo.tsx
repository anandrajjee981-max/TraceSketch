/**
 * TSLogo — inline SVG replicating the TraceSketch "TS" logomark from logo.png.
 *
 * Shapes:
 *  - T: dark charcoal (#1D2235) with a skewed parallelogram top-bar + vertical stem
 *  - S: vibrant violet (#6C47FF) interlocked S-curve overlapping the T stem
 */

interface TSLogoProps {
  size?: number;
  /** Show "TraceSketch" wordmark next to/below the mark */
  wordmark?: boolean;
  /** Render wordmark inline (flex-row) instead of below */
  inline?: boolean;
  className?: string;
}

/** Precise recreation using filled/stroked paths matching logo.png geometry */
export function TSLogoMarkFilled({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="TraceSketch logomark"
    >
      {/* ── T: Skewed parallelogram top bar (angled right side matching logo) */}
      <path
        d="M16 10 L98 10 L106 27 L24 27 Z"
        fill="#1D2235"
      />
      {/* T: vertical stem */}
      <rect x="30" y="27" width="20" height="68" rx="2" fill="#1D2235" />

      {/* ── S: upper arc — top arm sweeps right then curves down */}
      <path
        d="M54 27 L88 27 C102 27 112 37 112 50 C112 63 102 70 88 70 L58 70"
        stroke="#6C47FF"
        strokeWidth="17"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* S: lower arc — bottom arm sweeps left then curves down-right */}
      <path
        d="M58 70 C50 70 48 74 48 78 C48 82 50 86 58 86 L92 86 C100 86 104 82 104 78"
        stroke="#6C47FF"
        strokeWidth="17"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* S: middle connection back up — completes the S loop */}
      <path
        d="M58 70 C50 70 48 66 48 62 C48 58 50 55 58 55 L88 55 C96 55 100 48 100 42 C100 36 97 27 88 27"
        stroke="#6C47FF"
        strokeWidth="17"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Full logo: mark + optional wordmark */
export function TSLogo({
  size = 32,
  wordmark = false,
  inline = true,
  className = "",
}: TSLogoProps) {
  const gap = inline ? "gap-2.5" : "gap-1.5";
  const dir = inline ? "flex-row items-center" : "flex-col items-center";
  return (
    <div className={`flex ${dir} ${gap} ${className}`}>
      <TSLogoMarkFilled size={size} />
      {wordmark && (
        <span
          style={{
            fontSize: inline ? `${Math.round(size * 0.52)}px` : `${Math.round(size * 0.46)}px`,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          <span style={{ color: "#FFFFFF" }}>Trace</span>
          <span style={{ color: "#6C47FF" }}>Sketch</span>
        </span>
      )}
    </div>
  );
}
