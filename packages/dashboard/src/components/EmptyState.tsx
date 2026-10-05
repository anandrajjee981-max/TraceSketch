import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="py-14 px-6 text-center flex flex-col items-center ts-stagger" style={{ ["--stagger-i" as string]: 0 }}>
      <div
        className="mb-4 w-[54px] h-[54px] rounded-full flex items-center justify-center ts-pop"
        style={{
          background: "var(--accent-light)",
          border: "1px solid var(--border-accent)",
          boxShadow: "0 0 24px -8px var(--accent-glow)",
        }}
      >
        {icon ?? <IconDefaultEmpty />}
      </div>
      <h3 className="text-[15px] font-semibold mb-1.5 text-[var(--text-primary)]">{title}</h3>
      <p className="text-[13px] max-w-[480px] leading-[20px] mb-5 text-[var(--text-dim)]">{description}</p>
      {action && <div className="mb-4">{action}</div>}
      {children}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  detail,
  action,
}: {
  title: string;
  description: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[12px] overflow-hidden ts-stagger">
      <div
        className="px-6 py-8"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--red-border)",
          borderLeft: "4px solid var(--red)",
        }}
      >
        <div className="flex flex-col items-center text-center max-w-[560px] mx-auto">
          <div
            className="w-[44px] h-[44px] rounded-full flex items-center justify-center mb-3.5"
            style={{ background: "var(--red-bg)", border: "1px solid var(--red-border)" }}
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 5.2V8.6" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="11" r="1.1" fill="var(--red)" />
              <path d="M8 2.4L13.6 12.4H2.4L8 2.4Z" stroke="var(--red)" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-[15px] font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>
            {title}
          </h3>
          <p className="text-[13px] leading-[20px] mb-3" style={{ color: "var(--text-secondary)" }}>
            {description}
          </p>
          {detail && (
            <div
              className="font-mono text-[12px] px-3 py-2 rounded-[5px] break-all max-w-full mt-1 text-left"
              style={{
                color: "var(--red)",
                background: "var(--red-bg)",
                border: "1px solid var(--red-border)",
              }}
            >
              {detail}
            </div>
          )}
          <p className="text-[12px] mt-3" style={{ color: "var(--text-dim)" }}>
            Ensure the collector is running at{" "}
            <span className="font-mono font-medium" style={{ color: "var(--text-secondary)" }}>
              http://localhost:4000
            </span>{" "}
            and the x-instance-id header is accepted.
          </p>
          {action && <div className="mt-4">{action}</div>}
        </div>
      </div>
    </div>
  );
}

export function IconEmptyTraces() {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="12" y="10" width="24" height="28" rx="3" stroke="var(--accent)" strokeWidth="1.6" />
      <path d="M18 18H30M18 24H30M18 30H26" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M28 10V14H32" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function IconNoResults() {
  return (
    <svg width="28" height="28" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="17" cy="17" r="10" stroke="var(--accent)" strokeWidth="1.6" />
      <path d="M24.5 24.5L30 30" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 17H22" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" opacity={0.6} />
      <path d="M17 12V22" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" opacity={0.35} />
    </svg>
  );
}

export function IconDefaultEmpty() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="var(--accent)" strokeWidth="1.5" />
      <path d="M8 12h8" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconEmptyReplays() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21a9 9 0 1 0-7.8-4.5" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 12v5h5" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 12l2 2 4-4" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconEmptyTests() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 3h6M10 3v6l-5 8.5A2 2 0 0 0 6.7 20h10.6a2 2 0 0 0 1.7-2.5L14 9V3" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 15h7" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconEmptyGroup() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" stroke="var(--accent)" strokeWidth="1.5" />
      <path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="17" cy="8" r="2.5" stroke="var(--accent)" strokeWidth="1.4" opacity={0.7} />
      <path d="M17 13.5c1.8.4 3 2 3 3.5" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" opacity={0.7} />
    </svg>
  );
}
