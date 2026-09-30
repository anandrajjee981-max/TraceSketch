import { Link } from "react-router-dom";

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[12px] flex items-center gap-1.5 py-1.5 mb-3" style={{ color: "var(--text-dim)" }}>
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="flex items-center gap-1.5">
          {i > 0 && (
            <span style={{ color: "var(--border)" }} className="select-none" aria-hidden="true">
              /
            </span>
          )}
          {item.to ? (
            <Link
              to={item.to}
              className="no-underline transition-colors duration-150 hover:!text-[var(--accent-text)]"
              style={{ color: "var(--text-dim)" }}
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium truncate" style={{ color: "var(--text-secondary)" }} aria-current="page">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
