interface Props {
  code: number;
  showDot?: boolean;
}

type Tone = { color: string; bg: string; border: string; dot: string };

const statusTone = (code: number): Tone => {
  if (code >= 200 && code < 300) {
    return { color: "var(--green)", bg: "var(--green-bg)", border: "var(--green-border)", dot: "var(--green)" };
  }
  if (code >= 300 && code < 400) {
    return { color: "var(--blue)", bg: "var(--blue-bg)", border: "var(--blue-border)", dot: "var(--blue)" };
  }
  if (code >= 400 && code < 500) {
    return { color: "var(--amber)", bg: "var(--amber-bg)", border: "var(--amber-border)", dot: "var(--amber)" };
  }
  if (code >= 500) {
    return { color: "var(--red)", bg: "var(--red-bg)", border: "var(--red-border)", dot: "var(--red)" };
  }
  return { color: "var(--text-dim)", bg: "var(--bg-surface-2)", border: "var(--border)", dot: "var(--text-dim)" };
};

export function StatusBadge({ code, showDot = true }: Props) {
  const tone = statusTone(code);

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono leading-none tracking-[0.02em] select-none ts-numeric"
      style={{ color: tone.color, background: tone.bg, border: `1px solid ${tone.border}` }}
    >
      {showDot && (
        <span
          className="w-[5px] h-[5px] rounded-full shrink-0"
          style={{ background: tone.dot, boxShadow: `0 0 6px ${tone.dot}` }}
        />
      )}
      {code}
    </span>
  );
}

const resultTone = (status: "success" | "fail" | "warning" | "neutral"): Tone => {
  if (status === "success") {
    return { color: "var(--green)", bg: "var(--green-bg)", border: "var(--green-border)", dot: "var(--green)" };
  }
  if (status === "fail") {
    return { color: "var(--red)", bg: "var(--red-bg)", border: "var(--red-border)", dot: "var(--red)" };
  }
  if (status === "warning") {
    return { color: "var(--amber)", bg: "var(--amber-bg)", border: "var(--amber-border)", dot: "var(--amber)" };
  }
  return { color: "var(--text-secondary)", bg: "var(--bg-surface-2)", border: "var(--border)", dot: "var(--text-dim)" };
};

export function ResultBadge({
  status,
  label,
  showDot = true,
}: {
  status: "success" | "fail" | "warning" | "neutral";
  label: string;
  showDot?: boolean;
}) {
  const tone = resultTone(status);

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono leading-none uppercase tracking-[0.04em] select-none"
      style={{ color: tone.color, background: tone.bg, border: `1px solid ${tone.border}` }}
    >
      {showDot && (
        <span
          className="w-[5px] h-[5px] rounded-full shrink-0"
          style={{ background: tone.dot, boxShadow: `0 0 6px ${tone.dot}` }}
        />
      )}
      {label}
    </span>
  );
}
