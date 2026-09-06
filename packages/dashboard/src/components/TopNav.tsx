import { Link } from "react-router-dom";

export function TopNav() {
  return (
    <header
      className="h-[52px] shrink-0 sticky top-0 z-30 flex items-center px-5 gap-4"
      style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <Link to="/" className="flex items-center gap-2.5 no-underline">
        {/* Logo mark — caramel square */}
        <span
          className="w-[28px] h-[28px] rounded-[5px] flex items-center justify-center text-[13px] font-bold text-white shrink-0"
          style={{ background: "var(--accent)" }}
        >
          ◈
        </span>
        <span
          className="text-[15px] font-semibold tracking-[-0.02em]"
          style={{ color: "var(--text-primary)" }}
        >
          traceSketch
        </span>
        <span
          className="text-[11px] font-normal ml-0.5 hidden sm:inline"
          style={{ color: "var(--text-dim)" }}
        >
          Developer Console
        </span>
      </Link>

      <div className="flex-1" />

      {/* Region chip */}
      <div
        className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full"
        style={{
          color: "var(--text-secondary)",
          background: "var(--bg-surface-2)",
          border: "1px solid var(--border)",
        }}
      >
        <span
          className="w-[6px] h-[6px] rounded-full"
          style={{ background: "var(--green)" }}
        />
        <span>us-east-1</span>
      </div>

      {/* Avatar */}
      <div
        className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-[11px] font-bold text-white"
        style={{ background: "var(--accent)" }}
      >
        U
      </div>
    </header>
  );
}
