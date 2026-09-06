interface Props {
  code: number;
}

export function StatusBadge({ code }: Props) {
  let color: string;
  let bg: string;
  let border: string;

  if (code >= 200 && code < 300) {
    color  = "var(--green)";
    bg     = "var(--green-bg)";
    border = "var(--green-border)";
  } else if (code >= 300 && code < 400) {
    color  = "var(--blue)";
    bg     = "var(--blue-bg)";
    border = "var(--blue-border)";
  } else if (code >= 400 && code < 500) {
    color  = "var(--amber)";
    bg     = "var(--amber-bg)";
    border = "var(--amber-border)";
  } else if (code >= 500) {
    color  = "var(--red)";
    bg     = "var(--red-bg)";
    border = "var(--red-border)";
  } else {
    color  = "var(--text-dim)";
    bg     = "var(--bg-surface-2)";
    border = "var(--border)";
  }

  return (
    <span
      className="inline-flex items-center px-[7px] py-[2px] rounded-[10px] text-[11px] font-semibold leading-[16px] tracking-[0.02em]"
      style={{ color, background: bg, border: `1px solid ${border}` }}
    >
      {code}
    </span>
  );
}
