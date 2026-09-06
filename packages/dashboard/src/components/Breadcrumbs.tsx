import { Link } from "react-router-dom";

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav className="text-[12px] flex items-center gap-1.5 py-1.5 mb-1" style={{ color: "var(--text-dim)" }}>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && (
            <span style={{ color: "var(--border)" }} className="select-none">
              /
            </span>
          )}
          {item.to ? (
            <Link
              to={item.to}
              className="no-underline transition-colors duration-120"
              style={{ color: "var(--text-dim)" }}
              onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
                e.currentTarget.style.color = "var(--accent)";
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
                e.currentTarget.style.color = "var(--text-dim)";
              }}
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium" style={{ color: "var(--text-secondary)" }}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
