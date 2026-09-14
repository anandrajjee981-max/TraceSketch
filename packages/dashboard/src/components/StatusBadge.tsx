interface Props {
  code: number;
  showDot?: boolean;
}

export function StatusBadge({ code, showDot = true }: Props) {
  let color: string;
  let bg: string;
  let border: string;
  let dotColor: string;

  if (code >= 200 && code < 300) {
    color = "var(--green)";
    bg = "var(--green-bg)";
    border = "var(--green-border)";
    dotColor = "#10B981";
  } else if (code >= 300 && code < 400) {
    color = "var(--blue)";
    bg = "var(--blue-bg)";
    border = "var(--blue-border)";
    dotColor = "#38BDF8";
  } else if (code >= 400 && code < 500) {
    color = "var(--amber)";
    bg = "var(--amber-bg)";
    border = "var(--amber-border)";
    dotColor = "#F59E0B";
  } else if (code >= 500) {
    color = "var(--red)";
    bg = "var(--red-bg)";
    border = "var(--red-border)";
    dotColor = "#F43F5E";
  } else {
    color = "var(--text-dim)";
    bg = "var(--bg-surface-2)";
    border = "var(--border)";
    dotColor = "var(--text-dim)";
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-[8px] py-[3px] rounded-full text-[11px] font-semibold font-mono leading-none tracking-[0.03em] transition-all duration-150 hover:scale-[1.04]"
      style={{
        color,
        background: bg,
        border: `1px solid ${border}`,
        boxShadow: `0 0 10px ${bg}`,
      }}
    >
      {showDot && (
        <span
          className="w-[5px] h-[5px] rounded-full shrink-0"
          style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }}
        />
      )}
      {code}
    </span>
  );
}
