import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTraceSimulator } from "../context/TraceSimulatorContext";
import { TSLogoMarkFilled } from "../components/TSLogo";
import { ThemeToggle } from "../components/ThemeToggle";
import heroImg from "../assets/hero.png";

/* ══════════════════════════════════════════════════════════════════════════
   Icons — inline SVG only, no emoji-as-icon anywhere in this page.
   ══════════════════════════════════════════════════════════════════════════ */

const Icon = {
  bolt: (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M11 1 3 11h5l-1 8 8-10h-5l1-8Z" />
    </svg>
  ),
  chat: (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M18 10c0 3.3-3.6 6-8 6-.9 0-1.8-.1-2.6-.4L3 17l1.3-3A5.6 5.6 0 0 1 2 10c0-3.3 3.6-6 8-6s8 2.7 8 6Z" strokeLinejoin="round" />
    </svg>
  ),
  shield: (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M10 2 3.5 4.5v5c0 4 2.8 7.4 6.5 8.5 3.7-1.1 6.5-4.5 6.5-8.5v-5L10 2Z" strokeLinejoin="round" />
    </svg>
  ),
  play: (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M5 3.5v13l11-6.5-11-6.5Z" />
    </svg>
  ),
  arrow: (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 10h12M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chevron: (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  copy: (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M13 5.5A2.5 2.5 0 0 0 10.5 3H5.5A2.5 2.5 0 0 0 3 5.5v5A2.5 2.5 0 0 0 5.5 13" strokeLinecap="round" />
    </svg>
  ),
  check: (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <path d="M4 10.5 8 14.5 16 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  cross: (
    <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M5 5l10 10M15 5 5 15" strokeLinecap="round" />
    </svg>
  ),
  search: (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="9" cy="9" r="5.5" />
      <path d="m13.5 13.5 3 3" strokeLinecap="round" />
    </svg>
  ),
  wave: (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M2 7h3l2-4 3 12 2.5-8 2 4h3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  db: (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <ellipse cx="10" cy="5" rx="6" ry="2.4" />
      <path d="M4 5v10c0 1.3 2.7 2.4 6 2.4s6-1.1 6-2.4V5" />
      <path d="M4 10c0 1.3 2.7 2.4 6 2.4s6-1.1 6-2.4" />
    </svg>
  ),
  link: (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M8.5 11.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5l-1 1" strokeLinecap="round" />
      <path d="M11.5 8.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 1 0 5 5l1-1" strokeLinecap="round" />
    </svg>
  ),
  clock: (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4.2l2.6 1.6" strokeLinecap="round" />
    </svg>
  ),
};

/* ══════════════════════════════════════════════════════════════════════════
   Site navigation — fixed, pill-outlined CTA, keyboard-safe dropdown.
   ══════════════════════════════════════════════════════════════════════════ */

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Features", href: "#features" },
  { label: "Live Chat", href: "#chat" },
];

const NAV_RESOURCES = [
  { label: "How It Works", href: "#loop", hint: "The four-step golden loop" },
  { label: "Comparison", href: "#comparison", hint: "vs Postman & Sentry" },
  { label: "Quickstart", href: "#quickstart", hint: "Two lines of code" },
  { label: "The sketch CLI", href: "#quickstart", hint: "Test from your terminal" },
];

function SiteNav() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDropdownOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [dropdownOpen]);

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b-2 border-[var(--border)] bg-[var(--bg-page)]/90 backdrop-blur-md">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6"
      >
        {/* Brand + title pill badge */}
        <Link to="/overview" className="flex items-center gap-2.5 no-underline shrink-0">
          <span
            className="ts-icon-badge shrink-0"
            style={{ width: 38, height: 38, padding: 4 }}
          >
            <TSLogoMarkFilled size={28} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[16px] font-extrabold tracking-[-0.03em] text-[var(--text-primary)]">
              Trace<span className="text-[var(--accent)]">Sketch</span>
            </span>
            <span className="mt-1 hidden rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-[2px] font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)] sm:inline-block">
              v0.0.6 · Early Access
            </span>
          </span>
        </Link>

        {/* Central navigation — desktop */}
        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-[var(--text-secondary)] no-underline transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
            >
              {l.label}
            </a>
          ))}

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
            >
              Resources
              <span
                style={{
                  transform: dropdownOpen ? "rotate(180deg)" : "none",
                  transition: "transform 180ms var(--ease-out)",
                }}
                className="inline-flex"
              >
                {Icon.chevron}
              </span>
            </button>
            {dropdownOpen && (
              <div className="nb-card absolute right-0 top-[calc(100%+10px)] z-50 w-64 p-2 shadow-[var(--shadow-md)]">
                {NAV_RESOURCES.map((r) => (
                  <a
                    key={r.label}
                    href={r.href}
                    onClick={() => setDropdownOpen(false)}
                    className="block rounded-[12px] px-3 py-2 no-underline transition-colors hover:bg-[var(--accent-light)]"
                  >
                    <span className="block text-[13px] font-bold text-[var(--text-primary)]">
                      {r.label}
                    </span>
                    <span className="block text-[11px] text-[var(--text-secondary)]">
                      {r.hint}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CTA pill */}
        <div className="flex items-center gap-2">
          {/* Same control as the console navbar, so the two never disagree
              about what theme is active. */}
          <ThemeToggle className="mr-1" />
          <Link
            to="/"
            className="nb-pill nb-pill-solid hidden text-[12px] sm:inline-flex"
          >
            Launch Console
            <span className="inline-flex">{Icon.arrow}</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation menu"
            className="nb-pill h-[38px] w-[38px] justify-center !px-0 lg:hidden"
          >
            <span className="flex flex-col gap-[3px]" aria-hidden="true">
              <span className="block h-[2px] w-4 rounded-full bg-[var(--text-primary)]" />
              <span className="block h-[2px] w-4 rounded-full bg-[var(--text-primary)]" />
              <span className="block h-[2px] w-4 rounded-full bg-[var(--text-primary)]" />
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile navigation drawer */}
      {mobileOpen && (
        <div className="border-t-2 border-[var(--border)] bg-[var(--bg-surface)] px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-2">
            {[...NAV_LINKS, ...NAV_RESOURCES].map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="nb-chip w-full justify-start"
              >
                {l.label}
              </a>
            ))}
            <Link to="/" onClick={() => setMobileOpen(false)} className="nb-pill nb-pill-solid mt-1 justify-center">
              Launch Console
            </Link>
            {/* Theme control gets a row of its own in the drawer so it stays a
                comfortable tap target instead of being squeezed beside the CTA. */}
            <div className="mt-2 flex items-center justify-between border-t-2 border-[var(--border)] pt-3">
              <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                Theme
              </span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Hero — floating pill badge, curly-brace headline frame, sticker elements.
   ══════════════════════════════════════════════════════════════════════════ */

const HERO_KEYWORDS = ["Record", "Replay", "Lock"];

function Hero({ copiedCode, onCopy }: { copiedCode: string | null; onCopy: (t: string, id: string) => void }) {
  return (
    <section
      id="home"
      className="bg-grid-lg relative overflow-hidden px-4 pt-32 pb-20 sm:px-6 sm:pt-40"
    >
      {/* Floating floating badge — date / tagline capsule */}
      <div className="mx-auto mb-8 flex justify-center">
        <span className="nb-pill animate-float text-[12px]">
          <span className="nb-dot nb-dot-live" aria-hidden="true" />
          Early Access — v0.0.6 is live
          <span className="nb-dot-sep" aria-hidden="true" />
          <span className="font-mono text-[11px]">npm i tracesketch</span>
        </span>
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* Floating sticker graphics overlapping the hero edges */}
        <div
          className="nb-sticker hidden lg:inline-flex"
          style={{ top: "18%", left: "-6%", transform: "rotate(-8deg)", background: "var(--accent)", color: "var(--on-accent)", animationDelay: "0s" }}
          aria-hidden="true"
        >
          {Icon.wave}
          <span>Live Waterfall</span>
        </div>
        <div
          className="nb-sticker hidden lg:inline-flex"
          style={{ top: "62%", left: "-9%", transform: "rotate(6deg)", background: "var(--flare-deep)", color: "var(--on-flare)", animationDelay: "0.8s" }}
          aria-hidden="true"
        >
          {Icon.bolt}
          <span>1-Click Replay</span>
        </div>
        <div
          className="nb-sticker hidden lg:inline-flex"
          style={{ top: "26%", right: "-4%", transform: "rotate(9deg)", background: "var(--bg-surface)", animationDelay: "0.4s" }}
          aria-hidden="true"
        >
          {Icon.shield}
          <span>Zero Cloud</span>
        </div>
        <div
          className="nb-sticker hidden lg:inline-flex"
          style={{ top: "70%", right: "-7%", transform: "rotate(-5deg)", background: "var(--green)", color: "var(--on-green)", animationDelay: "1.2s" }}
          aria-hidden="true"
        >
          {Icon.check}
          <span>Bug Locked</span>
        </div>

        {/* Oversized curly braces enclosing the headline */}
        <div className="flex items-center justify-center gap-2 sm:gap-5">
          <span className="nb-brace text-[92px] sm:text-[150px] lg:text-[200px]" aria-hidden="true">
            {"{"}
          </span>

          <div className="text-center">
            <h1 className="text-[34px] font-extrabold uppercase leading-[0.95] tracking-[-0.04em] text-[var(--text-primary)] sm:text-[58px] lg:text-[78px]">
              Stop Guessing
              <br />
              Why Your API
              <br />
              <span className="nb-capsule">Broke</span>
            </h1>
          </div>

          <span
            className="nb-brace text-[92px] sm:text-[150px] lg:text-[200px]"
            style={{ color: "var(--flare)", animationDelay: "1s" }}
            aria-hidden="true"
          >
            {"}"}
          </span>
        </div>

        {/* Sub-headline keywords separated by centered dots */}
        <div className="nb-dots mt-10">
          {HERO_KEYWORDS.map((k, i) => (
            <span key={k} className="flex items-center gap-3 sm:gap-4">
              {i > 0 && <span className="nb-dot-sep" aria-hidden="true" />}
              <span>{k}</span>
            </span>
          ))}
        </div>

        {/* Brief two-line intro */}
        <p className="mx-auto mt-7 max-w-2xl text-center text-[14px] leading-relaxed text-[var(--text-secondary)] sm:text-[15px]">
          Capture every failing request with its exact headers, body and internal DB/Cache timing — automatically, on your machine.
          <br className="hidden sm:block" />
          Replay it anywhere, fix the bug, then lock it as a regression test that never lets it come back.
        </p>

        {/* Actions */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="nb-pill nb-pill-solid !px-6 !py-3 !text-[14px]">
            Launch Developer Console
            <span className="inline-flex">{Icon.arrow}</span>
          </Link>
          <a href="#chat" className="nb-pill !px-6 !py-3 !text-[14px]">
            {Icon.chat}
            Try Team Chat
          </a>
        </div>

        {/* Install snippet */}
        <div className="nb-code mx-auto mt-10 flex max-w-md items-center gap-3">
          <span className="font-bold text-[var(--accent)]" aria-hidden="true">
            $
          </span>
          <code className="flex-1 text-left">npm i tracesketch</code>
          <button
            type="button"
            onClick={() => onCopy("npm i tracesketch", "hero-npm")}
            className="nb-chip !px-2.5 !py-1 !text-[11px]"
            aria-label="Copy install command"
          >
            {copiedCode === "hero-npm" ? (
              <>
                {Icon.check} Copied
              </>
            ) : (
              <>
                {Icon.copy} Copy
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Highlights / Experience — two-column, stat pills + showcase card.
   ══════════════════════════════════════════════════════════════════════════ */

const HIGHLIGHT_STATS = [
  { value: "2", label: "Lines to install", dot: "nb-dot-accent" },
  { value: "<1ms", label: "Span resolution", dot: "nb-dot-flare" },
  { value: "24h", label: "Local retention", dot: "nb-dot-green" },
  { value: "0", label: "Cloud calls", dot: "nb-dot-ink" },
];

function Highlights() {
  return (
    <section id="about" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-16">
        {/* ── Left column ── */}
        <div>
          <span className="nb-chip">
            <span className="nb-dot nb-dot-flare" aria-hidden="true" />
            The Experience
          </span>

          <h2 className="mt-6 text-[34px] font-extrabold uppercase leading-[1] tracking-[-0.04em] text-[var(--text-primary)] sm:text-[46px] lg:text-[54px]">
            Debugging that
            <br />
            feels like{" "}
            <span className="nb-word">reading</span>{" "}
            <span className="nb-word" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
              a stack trace
            </span>
          </h2>

          <p className="mt-7 max-w-[56ch] text-[14px] leading-relaxed text-[var(--text-secondary)]">
            Most tools hand you a 500 and wish you luck. TraceSketch installs as one Express
            middleware and records the whole story: the exact payload, the SQL query that crawled,
            the cache hit that missed, the third-party call that timed out.
          </p>
          <p className="mt-4 max-w-[56ch] text-[14px] leading-relaxed text-[var(--text-secondary)]">
            Nothing leaves your laptop. Sensitive fields are redacted before they are ever
            written, so you can share a trace with your team without leaking a single credential.
          </p>

          {/* Stat pill grid */}
          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4">
            {HIGHLIGHT_STATS.map((s) => (
              <div key={s.label} className="nb-stat">
                <span className="nb-stat-value">{s.value}</span>
                <span className="nb-stat-label">
                  <span className={`nb-dot ${s.dot}`} aria-hidden="true" />
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right column: showcase card with offset panels ── */}
        <div className="relative">
          {/* Offset accent backdrop panels */}
          <div
            className="nb-panel hidden sm:block"
            style={{ inset: "-22px -22px 22px 22px", background: "var(--accent-light)", transform: "rotate(3deg)" }}
            aria-hidden="true"
          />
          <div
            className="nb-panel hidden sm:block"
            style={{ inset: "22px 22px -22px -22px", background: "var(--flare-light)", transform: "rotate(-3deg)" }}
            aria-hidden="true"
          />

          <div className="nb-showcase relative">
            <div className="flex items-center justify-between gap-3 border-b-2 border-[var(--border)] bg-[var(--bg-surface-2)] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="nb-dot nb-dot-red" aria-hidden="true" />
                <span className="nb-dot nb-dot-amber" aria-hidden="true" />
                <span className="nb-dot nb-dot-green" aria-hidden="true" />
              </div>
              <span className="font-mono text-[11px] font-bold text-[var(--text-secondary)]">
                tracesketch · dashboard
              </span>
            </div>

            <img
              src={heroImg}
              alt="TraceSketch dashboard showing a captured request waterfall with the failing payment gateway span highlighted"
              className="block h-auto w-full"
              loading="lazy"
              width={1200}
              height={750}
            />

            {/* Overlapping bottom detail pill widget */}
            <div className="absolute -bottom-5 left-4 right-4 sm:left-6 sm:right-6">
              <div className="nb-pill !w-full justify-start gap-3 !bg-[var(--bg-surface)]">
                <span className="nb-dot nb-dot-red" aria-hidden="true" />
                <span className="font-mono text-[11px] font-bold">POST /api/v1/checkout/charge</span>
                <span className="ml-auto rounded-full border-2 border-[var(--border)] bg-[var(--red-bg)] px-2 py-[2px] font-mono text-[10px] font-bold text-[var(--red-text)]">
                  504
                </span>
                <span className="hidden rounded-full border border-[var(--border)] bg-[var(--bg-surface-2)] px-2 py-[2px] font-mono text-[10px] font-bold text-[var(--text-secondary)] sm:inline">
                  342ms
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Interactive simulator — waterfall / redaction / replay.
   ══════════════════════════════════════════════════════════════════════════ */

type Scenario = "checkout" | "auth" | "db";
type SimTab = "waterfall" | "payload" | "replay";

const SCENARIOS: Record<Scenario, { label: string; path: string; status: string; ms: string; tone: string }> = {
  checkout: { label: "Checkout 500", path: "/api/v1/checkout/charge", status: "504", ms: "342ms", tone: "red" },
  auth: { label: "Auth 401", path: "/api/v1/auth/jwt/refresh", status: "401", ms: "62ms", tone: "amber" },
  db: { label: "Slow Query", path: "/api/v1/reports/monthly-aggregation", status: "200", ms: "1,240ms", tone: "blue" },
};

const SPANS: Record<Scenario, { op: string; dur: string; width: number; offset: number; culprit: boolean; dot: string; note: string }[]> = {
  checkout: [
    { op: "http: api-gateway (POST /api/v1/checkout/charge)", dur: "342 ms", width: 100, offset: 0, culprit: false, dot: "nb-dot-blue", note: "" },
    { op: "db: postgres (SELECT * FROM orders WHERE id = $1)", dur: "64 ms", width: 19, offset: 4, culprit: false, dot: "nb-dot-green", note: "" },
    { op: "cache: redis (HGET rate_limit:user_789)", dur: "4 ms", width: 3, offset: 24, culprit: false, dot: "nb-dot-accent", note: "" },
    { op: "external: stripe-payments (PaymentGatewayTimeout)", dur: "220 ms — CULPRIT", width: 64, offset: 28, culprit: true, dot: "nb-dot-red", note: "Root cause identified: external gateway timed out while creating the card payment intent." },
  ],
  auth: [
    { op: "http: auth-service (POST /api/v1/auth/jwt/refresh)", dur: "62 ms", width: 100, offset: 0, culprit: false, dot: "nb-dot-blue", note: "" },
    { op: "cache: redis (GET blacklist:jwt_token_99)", dur: "8 ms — REVOKED", width: 13, offset: 8, culprit: true, dot: "nb-dot-amber", note: "Rejection reason: token signature expired 45 minutes ago. Refresh denied." },
  ],
  db: [
    { op: "http: reporting-svc (GET /api/v1/reports/monthly-aggregation)", dur: "1,240 ms", width: 100, offset: 0, culprit: false, dot: "nb-dot-blue", note: "" },
    { op: "db: postgres (SELECT date_trunc('day', created_at), sum(amount) FROM ledger)", dur: "1,180 ms — SLOW QUERY", width: 95, offset: 2, culprit: true, dot: "nb-dot-amber", note: "Full table scan on 'ledger' — 450,200 rows read. Missing index on created_at." },
  ],
};

const TONE_TINT: Record<string, string> = {
  red: "var(--red-bg)",
  amber: "var(--amber-bg)",
  blue: "var(--blue-bg)",
};

function Simulator() {
  const [scenario, setScenario] = useState<Scenario>("checkout");
  const [tab, setTab] = useState<SimTab>("waterfall");
  const [redact, setRedact] = useState(true);
  const [replaying, setReplaying] = useState(false);
  const [result, setResult] = useState<{ status: number; ms: number } | null>(null);

  const runReplay = () => {
    setReplaying(true);
    setResult(null);
    setTimeout(() => {
      setReplaying(false);
      setResult({ status: 200, ms: scenario === "db" ? 96 : scenario === "auth" ? 41 : 48 });
    }, 700);
  };

  const meta = SCENARIOS[scenario];

  return (
    <section id="features" className="scroll-mt-24 border-t-2 border-[var(--border)] bg-grid px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <span className="nb-chip">
            <span className="nb-dot nb-dot-accent" aria-hidden="true" />
            Interactive Simulator
          </span>
          <h2 className="mt-6 text-[30px] font-extrabold uppercase leading-[1.05] tracking-[-0.04em] sm:text-[42px]">
            The anatomy of a captured trace
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[14px] leading-relaxed text-[var(--text-secondary)]">
            Switch scenarios and inspect how TraceSketch records spans, redacts secrets and replays
            a failed request.
          </p>
        </div>

        {/* Scenario chips */}
        <div className="mt-9 flex flex-wrap justify-center gap-2.5">
          {(Object.keys(SCENARIOS) as Scenario[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setScenario(k);
                setResult(null);
              }}
              aria-pressed={scenario === k}
              className={`nb-chip ${scenario === k ? "!bg-[var(--text-primary)] !text-[var(--bg-page)]" : ""}`}
            >
              <span className={`nb-dot ${SCENARIOS[k].tone === "red" ? "nb-dot-red" : SCENARIOS[k].tone === "amber" ? "nb-dot-amber" : "nb-dot-blue"}`} aria-hidden="true" />
              {SCENARIOS[k].label}
            </button>
          ))}
        </div>

        {/* Simulator frame */}
        <div className="nb-frame mt-7 overflow-hidden">
          {/* Tab bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[var(--border)] bg-[var(--bg-surface-2)] px-4 py-3">
            <div className="ts-segmented" role="tablist" aria-label="Simulator view">
              {(
                [
                  ["waterfall", "Waterfall"],
                  ["payload", "Redaction"],
                  ["replay", "Replay"],
                ] as [SimTab, string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={tab === k}
                  onClick={() => setTab(k)}
                  className="ts-segment"
                  style={tab === k ? undefined : {}}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-[var(--text-secondary)]">
              <span className="nb-dot nb-dot-live" aria-hidden="true" />
              target&nbsp;
              <code className="text-[var(--accent-text)]">localhost:3000</code>
            </div>
          </div>

          <div className="p-5 sm:p-7">
            {tab === "waterfall" && (
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="ts-overline">Latency waterfall spans</span>
                  <span className="text-[11px] text-[var(--text-secondary)]">sub-millisecond breakdown</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {SPANS[scenario].map((s) => (
                    <div
                      key={s.op}
                      className="rounded-[14px] border-2 border-[var(--border)] p-3"
                      style={{
                        marginLeft: s.offset === 0 ? 0 : `${Math.min(s.offset / 2, 22)}px`,
                        background: s.culprit ? TONE_TINT[meta.tone] : "var(--bg-surface)",
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[12px]">
                        <span className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                          <span className={`nb-dot ${s.dot}`} aria-hidden="true" />
                          {s.op}
                        </span>
                        <span className={s.culprit ? "font-bold text-[var(--red-text)]" : "text-[var(--text-secondary)]"}>
                          {s.dur}
                        </span>
                      </div>
                      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full border-2 border-[var(--border)] bg-[var(--bg-page)]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${s.width}%`,
                            marginLeft: `${s.offset}%`,
                            background: s.culprit ? "var(--red)" : "var(--accent)",
                          }}
                        />
                      </div>
                      {s.note && (
                        <p className="mt-2.5 font-sans text-[11px] leading-relaxed text-[var(--text-secondary)]">
                          {s.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "payload" && (
              <div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[15px] font-extrabold uppercase tracking-[-0.02em]">
                      Security redaction preview
                    </h3>
                    <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                      Toggle privacy mode to see how secrets are sanitised before storage.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRedact((v) => !v)}
                    aria-pressed={redact}
                    className={`nb-chip ${redact ? "!bg-[var(--green)] !text-white" : "!bg-[var(--red)] !text-white"}`}
                  >
                    {redact ? "Redaction ON" : "Redaction OFF"}
                  </button>
                </div>
                <div className="nb-code">
                  <div className="mb-2 text-[var(--text-dim)]">// captured headers &amp; body</div>
                  <pre className="text-[var(--text-primary)]">
                    <code>{JSON.stringify(
                      {
                        headers: {
                          "content-type": "application/json",
                          authorization: redact ? "Bearer [REDACTED_JWT_TOKEN]" : "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...",
                          "x-api-key": redact ? "[REDACTED_API_KEY]" : "sk_live_99481028471",
                        },
                        body: {
                          user_id: "usr_7890",
                          account_email: "developer@tracesketch.dev",
                          password: redact ? "[REDACTED]" : "SuperSecretPass123!",
                          amount_cents: 4900,
                          currency: "USD",
                        },
                      },
                      null,
                      2,
                    )}</code>
                  </pre>
                </div>
              </div>
            )}

            {tab === "replay" && (
              <div>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[15px] font-extrabold uppercase tracking-[-0.02em]">
                      Replay engine sandbox
                    </h3>
                    <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                      Resend the captured request to your local development server.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={runReplay}
                    disabled={replaying}
                    className="nb-pill nb-pill-accent disabled:!opacity-50"
                  >
                    <span className="inline-flex">{Icon.play}</span>
                    {replaying ? "Replaying…" : "Trigger replay"}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="nb-code !p-4">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-dim)]">
                      Original trace
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div>Method: <span className="font-bold text-[var(--blue)]">POST</span></div>
                      <div>Path: <code>{meta.path}</code></div>
                      <div>
                        Status:{" "}
                        <span className="font-bold text-[var(--red)]">
                          {meta.status} {meta.status === "200" ? "OK" : "Failed"}
                        </span>
                      </div>
                      <div>Duration: <span className="font-bold text-[var(--amber)]">{meta.ms}</span></div>
                    </div>
                  </div>

                  <div className="nb-code !p-4">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-dim)]">
                      Replay result
                    </div>
                    {replaying && (
                      <div className="ts-chat-in flex flex-col gap-1.5 text-[var(--text-secondary)]">
                        <div>→ dispatching to http://localhost:3000…</div>
                        <div>→ injecting original headers &amp; payload…</div>
                      </div>
                    )}
                    {!replaying && result && (
                      <div className="ts-chat-in flex flex-col gap-1.5">
                        <div>
                          Target: <code className="text-[var(--green)]">http://localhost:3000</code>
                        </div>
                        <div>
                          Status:{" "}
                          <span className="font-bold text-[var(--green)]">{result.status} OK</span>
                        </div>
                        <div>
                          Duration: <span className="font-bold text-[var(--green)]">{result.ms}ms</span>
                        </div>
                        <div className="mt-1 rounded-[10px] border-2 border-[var(--border)] bg-[var(--green-bg)] p-2 font-sans text-[11px] font-semibold text-[var(--green-text)]">
                          Replay succeeded — latency delta calculated against the original.
                        </div>
                      </div>
                    )}
                    {!replaying && !result && (
                      <p className="py-4 text-center text-[12px] italic text-[var(--text-dim)]">
                        Trigger a replay to see the side-by-side result.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Team chat — the Relay feature: group rooms, typed messages, ephemeral chat.
   ══════════════════════════════════════════════════════════════════════════ */

type ChatKind = "note" | "trace_share" | "replay_result" | "crazy";

const KIND_META: Record<ChatKind, { label: string; dot: string; tint: string }> = {
  note: { label: "Note", dot: "nb-dot-accent", tint: "var(--accent-light)" },
  trace_share: { label: "Trace share", dot: "nb-dot-flare", tint: "var(--flare-light)" },
  replay_result: { label: "Replay result", dot: "nb-dot-green", tint: "var(--green-bg)" },
  crazy: { label: "Ephemeral", dot: "nb-dot-amber", tint: "var(--amber-bg)" },
};

/** Your own messages keep the plain surface so they read as "sent", not "received". */
const SELF_TINT = "var(--bg-surface)";

const SEED_MESSAGES: { who: string; kind: ChatKind; text: string; time: string; self?: boolean }[] = [
  { who: "Priya", kind: "trace_share", text: "POST /api/v1/checkout/charge → 504. Whole waterfall attached.", time: "09:41" },
  { who: "Marco", kind: "note", text: "Looks like stripe is the culprit — 220ms then timeout.", time: "09:42" },
  { who: "You", kind: "replay_result", text: "Replayed against localhost:3000 → 200 OK in 48ms. Bug fixed.", time: "09:47", self: true },
  { who: "Priya", kind: "crazy", text: "shipping the regression test now 🚀", time: "09:48" },
];

const CHAT_CAPABILITIES = [
  { icon: Icon.chat, title: "Group rooms", body: "Share a 6-character group code and your whole squad lands in the same debug room." },
  { icon: Icon.link, title: "Share real traces", body: "Drop a captured request straight into chat — redaction already applied." },
  { icon: Icon.clock, title: "Ephemeral messages", body: "Send ephemeral chatter that broadcasts instantly and is never written to storage." },
  { icon: Icon.db, title: "Durable history", body: "Notes, trace shares and replay results persist in Mongo so nobody re-asks." },
];

function ChatSection() {
  const [messages, setMessages] = useState(SEED_MESSAGES);
  const [draft, setDraft] = useState("");
  const [kind, setKind] = useState<ChatKind>("note");

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [
      ...m,
      {
        who: "You",
        kind,
        text,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        self: true,
      },
    ]);
    setDraft("");
  };

  return (
    <section id="chat" className="scroll-mt-24 border-t-2 border-[var(--border)] px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[1fr_minmax(0,460px)] lg:gap-16">
          {/* ── Left: copy + capability grid ── */}
          <div>
            <span className="nb-chip">
              <span className="nb-dot nb-dot-flare" aria-hidden="true" />
              Team Chat · Built In
            </span>

            <h2 className="mt-6 text-[32px] font-extrabold uppercase leading-[1.05] tracking-[-0.04em] sm:text-[44px]">
              Debug it
              <span className="nb-capsule">together</span>
            </h2>

            <p className="mt-6 max-w-[54ch] text-[14px] leading-relaxed text-[var(--text-secondary)]">
              A production bug is never a one-person problem. TraceSketch ships with a group chat
              built directly into the relay, so the trace, the theory and the fix stay in one
              thread instead of three disconnected tools.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CHAT_CAPABILITIES.map((c) => (
                <div key={c.title} className="nb-card !p-5">
                  <span className="nb-index !h-9 !w-9 !text-[13px]" aria-hidden="true">
                    {c.icon}
                  </span>
                  <h3 className="mt-4 text-[14px] font-extrabold uppercase tracking-[-0.01em]">
                    {c.title}
                  </h3>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                    {c.body}
                  </p>
                </div>
              ))}
            </div>

            <Link to="/relay" className="nb-pill nb-pill-solid mt-9">
              Open the live relay
              <span className="inline-flex">{Icon.arrow}</span>
            </Link>
          </div>

          {/* ── Right: live chat demo ── */}
          <div className="nb-frame overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b-2 border-[var(--border)] bg-[var(--bg-surface-2)] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="nb-dot nb-dot-live" aria-hidden="true" />
                <span className="font-mono text-[12px] font-bold"># checkout-500</span>
              </div>
              <span className="rounded-full border-2 border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-[2px] font-mono text-[10px] font-bold text-[var(--text-secondary)]">
                3 online
              </span>
            </div>

            {/* Message thread */}
            <div
              className="ts-scroll-fade flex max-h-[420px] flex-col gap-3 p-4"
              role="log"
              aria-live="polite"
              aria-label="Chat message thread"
            >
              {messages.map((m, i) => (
                <div key={i} className={`ts-chat-in flex flex-col gap-1 ${m.self ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-2 px-1">
                    <span className="font-mono text-[10px] font-bold text-[var(--text-secondary)]">
                      {m.who}
                    </span>
                    <span className="nb-chip !px-2 !py-0 !text-[9px] !font-bold !uppercase !tracking-[0.08em]">
                      <span className={`nb-dot !h-[6px] !w-[6px] ${KIND_META[m.kind].dot}`} aria-hidden="true" />
                      {KIND_META[m.kind].label}
                    </span>
                    <span className="font-mono text-[9px] text-[var(--text-dim)]">{m.time}</span>
                  </div>
                  <div
                    className="nb-bubble"
                    style={{ background: m.self ? SELF_TINT : KIND_META[m.kind].tint }}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Composer */}
            <form onSubmit={send} className="border-t-2 border-[var(--border)] bg-[var(--bg-surface-2)] p-3">
              <div className="mb-2.5 flex flex-wrap gap-2">
                {(Object.keys(KIND_META) as ChatKind[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    aria-pressed={kind === k}
                    className={`nb-chip !px-2.5 !py-1 !text-[10px] !font-bold !uppercase !tracking-[0.06em] ${
                      kind === k ? "!bg-[var(--text-primary)] !text-[var(--bg-page)]" : ""
                    }`}
                  >
                    <span className={`nb-dot !h-[6px] !w-[6px] ${KIND_META[k].dot}`} aria-hidden="true" />
                    {KIND_META[k].label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="chat-draft" className="sr-only">
                  Message
                </label>
                <input
                  id="chat-draft"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Share a trace, a theory, a fix…"
                  className="ts-input !h-[38px] flex-1"
                />
                <button type="submit" className="nb-pill nb-pill-accent shrink-0" disabled={!draft.trim()}>
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   The golden loop — four numbered stages.
   ══════════════════════════════════════════════════════════════════════════ */

const LOOP_STAGES = [
  { n: "01", title: "Record", body: "Every request, response, header and status code lands in your local store. Zero per-route code.", tone: "var(--accent)" },
  { n: "02", title: "Understand", body: "Read sub-millisecond DB, cache and third-party spans. The culprit span is flagged for you.", tone: "var(--blue)" },
  { n: "03", title: "Replay", body: "Resend the exact failing request to any target URL and compare status and latency side by side.", tone: "var(--flare-deep)" },
  { n: "04", title: "Lock", body: "Save the fixed trace as a regression test. If the bug ever returns, you know instantly.", tone: "var(--green)" },
];

function LoopSection() {
  return (
    <section id="loop" className="scroll-mt-24 border-t-2 border-[var(--border)] bg-grid px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <span className="nb-chip">
            <span className="nb-dot nb-dot-green" aria-hidden="true" />
            The Golden Loop
          </span>
          <h2 className="mt-6 text-[30px] font-extrabold uppercase leading-[1.05] tracking-[-0.04em] sm:text-[42px]">
            Four steps, zero guesswork
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[14px] text-[var(--text-secondary)]">
            A tight workflow built for developers who debug APIs every single day.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {LOOP_STAGES.map((s) => (
            <div key={s.n} className="nb-card">
              <span
                className="nb-index"
                style={{ background: s.tone, color: "var(--on-status)" }}
                aria-hidden="true"
              >
                {s.n}
              </span>
              <h3 className="mt-5 text-[17px] font-extrabold uppercase tracking-[-0.02em]">
                {s.title}
              </h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Comparison matrix.
   ══════════════════════════════════════════════════════════════════════════ */

type Cell = { text: string; tone: "yes" | "no" | "part" };

const COMPARE_ROWS: { label: string; net: Cell; postman: Cell; sentry: Cell; ours: Cell }[] = [
  { label: "Internal timing (DB / Cache)", net: { text: "No visibility", tone: "no" }, postman: { text: "No visibility", tone: "no" }, sentry: { text: "Stack traces", tone: "part" }, ours: { text: "Sub-ms waterfall", tone: "yes" } },
  { label: "One-click local replay", net: { text: "Manual copy", tone: "no" }, postman: { text: "Manual setup", tone: "part" }, sentry: { text: "No replay", tone: "no" }, ours: { text: "Instant replay", tone: "yes" } },
  { label: "Local-first privacy", net: { text: "Browser only", tone: "part" }, postman: { text: "Cloud sync", tone: "no" }, sentry: { text: "Cloud ingest", tone: "no" }, ours: { text: "100% on-device", tone: "yes" } },
  { label: "Bug → regression test", net: { text: "None", tone: "no" }, postman: { text: "Complex scripts", tone: "part" }, sentry: { text: "Alert only", tone: "no" }, ours: { text: "One-click lock", tone: "yes" } },
  { label: "Team chat for traces", net: { text: "None", tone: "no" }, postman: { text: "None", tone: "no" }, sentry: { text: "Issues", tone: "part" }, ours: { text: "Built-in relay", tone: "yes" } },
  { label: "Setup friction", net: { text: "0s", tone: "part" }, postman: { text: "Collections", tone: "part" }, sentry: { text: "Account + DSN", tone: "no" }, ours: { text: "Two lines", tone: "yes" } },
];

function CellView({ cell }: { cell: Cell }) {
  const tone =
    cell.tone === "yes"
      ? { color: "var(--green-text)", mark: Icon.check }
      : cell.tone === "no"
        ? { color: "var(--red-text)", mark: Icon.cross }
        : { color: "var(--amber-text)", mark: null };
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: tone.color }}>
      {tone.mark && <span className="inline-flex shrink-0">{tone.mark}</span>}
      {cell.text}
    </span>
  );
}

function Comparison() {
  return (
    <section id="comparison" className="scroll-mt-24 border-t-2 border-[var(--border)] px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <span className="nb-chip">
            <span className="nb-dot nb-dot-ink" aria-hidden="true" />
            Honest Comparison
          </span>
          <h2 className="mt-6 text-[30px] font-extrabold uppercase leading-[1.05] tracking-[-0.04em] sm:text-[40px]">
            How TraceSketch compares
          </h2>
        </div>

        {/* Horizontally scrollable on small screens — never a page-level scroll */}
        <div className="ts-table-wrap mt-12 !max-h-none overflow-x-auto rounded-[var(--radius-md)] border-2 border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
          <table className="ts-table min-w-[640px]">
            <thead>
              <tr>
                <th scope="col">Capability</th>
                <th scope="col">Network tab</th>
                <th scope="col">Postman</th>
                <th scope="col">Sentry</th>
                <th
                  scope="col"
                  className="!bg-[var(--accent)] !text-white"
                >
                  TraceSketch
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((r) => (
                <tr key={r.label}>
                  <th scope="row" className="px-4 py-3 text-left text-[12.5px] font-bold text-[var(--text-primary)]">
                    {r.label}
                  </th>
                  <td className="px-4 py-3 text-[12.5px]"><CellView cell={r.net} /></td>
                  <td className="px-4 py-3 text-[12.5px]"><CellView cell={r.postman} /></td>
                  <td className="px-4 py-3 text-[12.5px]"><CellView cell={r.sentry} /></td>
                  <td className="bg-[var(--accent-light)] px-4 py-3 text-[12.5px] font-bold">
                    <CellView cell={r.ours} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Quickstart — install, middleware, CLI.
   ══════════════════════════════════════════════════════════════════════════ */

type CliTab = "port" | "url" | "body";

const CLI_TABS: Record<CliTab, { label: string; cmd: string; resolved: string }> = {
  port: { label: "Local port", cmd: "sketch post /api/payment 5000", resolved: "Resolved target: http://localhost:5000/api/payment" },
  url: { label: "Remote URL", cmd: "sketch post /api/payment http://yourapp.com", resolved: "Executing against http://yourapp.com/api/payment" },
  body: { label: "With body", cmd: `sketch post /api/payment 5000 --body '{"amount":100}'`, resolved: "Payload parsed and sent as application/json" },
};

function Quickstart({ copiedCode, onCopy }: { copiedCode: string | null; onCopy: (t: string, id: string) => void }) {
  const [cliTab, setCliTab] = useState<CliTab>("port");
  const tab = CLI_TABS[cliTab];

  return (
    <section id="quickstart" className="scroll-mt-24 border-t-2 border-[var(--border)] bg-grid px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <span className="nb-chip">
            <span className="nb-dot nb-dot-amber" aria-hidden="true" />
            Quick Setup
          </span>
          <h2 className="mt-6 text-[30px] font-extrabold uppercase leading-[1.05] tracking-[-0.04em] sm:text-[42px]">
            Running in 60 seconds
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[14px] text-[var(--text-secondary)]">
            No cloud account, no DSN, no configuration file.
          </p>
        </div>

        <div className="mt-14 flex flex-col gap-6">
          {/* Step 1 */}
          <div className="nb-card !p-6 sm:!p-8">
            <div className="mb-4 flex items-center gap-3">
              <span className="nb-index !h-9 !w-9 !text-[13px]">1</span>
              <h3 className="text-[17px] font-extrabold uppercase tracking-[-0.02em] sm:text-[20px]">
                Add the middleware
              </h3>
            </div>
            <p className="mb-5 max-w-[62ch] text-[13px] leading-relaxed text-[var(--text-secondary)]">
              <code className="ts-code">express.json()</code> must be registered first so request
              bodies are captured. Every route is then recorded automatically — no per-route code.
            </p>
            <div className="nb-code !p-0">
              <div className="flex items-center justify-between gap-3 border-b-2 border-[var(--border)] bg-[var(--bg-surface-2)] px-4 py-2.5">
                <span className="font-mono text-[11px] font-bold text-[var(--text-secondary)]">
                  server.ts
                </span>
                <button
                  type="button"
                  onClick={() => onCopy(tab.cmd, "qs-mw")}
                  className="nb-chip !px-2.5 !py-1 !text-[11px]"
                >
                  {copiedCode === "qs-mw" ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="!p-4 leading-relaxed"><code>{`import express from 'express';
import { traceSketch } from 'tracesketch';

const app = express();

app.use(express.json());   // must come first
app.use(traceSketch());     // then this

app.get('/api/hello', (req, res) => {
  res.json({ message: "hello" });
});

app.listen(3000);`}</code></pre>
            </div>
          </div>

          {/* Step 2 */}
          <div className="nb-card !p-6 sm:!p-8">
            <div className="mb-4 flex items-center gap-3">
              <span className="nb-index !h-9 !w-9 !text-[13px]" style={{ background: "var(--green)" }}>2</span>
              <h3 className="text-[17px] font-extrabold uppercase tracking-[-0.02em] sm:text-[20px]">
                Start collector + dashboard
              </h3>
            </div>
            <div className="nb-code">
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold">
                  <span className="text-[var(--accent)]">$</span> npx tracesketch start
                </span>
                <button
                  type="button"
                  onClick={() => onCopy("npx tracesketch start", "qs-start")}
                  className="nb-chip !px-2.5 !py-1 !text-[11px]"
                >
                  {copiedCode === "qs-start" ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-1.5 border-t-2 border-[var(--border)] pt-3 text-[12px] text-[var(--green)]">
                <span>Storage server — <code className="ts-code !text-[var(--green-text)]">localhost:4000</code></span>
                <span>Dashboard — <code className="ts-code !text-[var(--green-text)]">localhost:8470</code></span>
              </div>
            </div>
            <div
              className="mt-4 flex items-start gap-3 rounded-[var(--radius-sm)] border-2 border-[var(--border)] p-3.5 text-[12px]"
              style={{ background: "var(--amber-bg)" }}
            >
              <span className="nb-dot nb-dot-amber mt-[3px]" aria-hidden="true" />
              <p className="leading-relaxed text-[var(--amber-text)]">
                <strong className="font-extrabold">Heads up:</strong> ports{" "}
                <code className="font-mono font-bold">4000</code> and{" "}
                <code className="font-mono font-bold">8470</code> are reserved by TraceSketch. Run
                your own app on a different port.
              </p>
            </div>
          </div>

          {/* Step 3 — CLI */}
          <div className="nb-card !p-6 sm:!p-8">
            <div className="mb-4 flex items-center gap-3">
              <span className="nb-index !h-9 !w-9 !text-[13px]" style={{ background: "var(--flare-deep)" }}>3</span>
              <h3 className="text-[17px] font-extrabold uppercase tracking-[-0.02em] sm:text-[20px]">
                Or use the sketch CLI
              </h3>
            </div>
            <p className="mb-5 max-w-[62ch] text-[13px] leading-relaxed text-[var(--text-secondary)]">
              Test any endpoint straight from your terminal. The CLI picks up your local instance
              credentials automatically, so authenticated calls just work.
            </p>

            <div className="mb-4 flex flex-wrap gap-2">
              {(Object.keys(CLI_TABS) as CliTab[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setCliTab(k)}
                  aria-pressed={cliTab === k}
                  className={`nb-chip !text-[11px] ${
                    cliTab === k ? "!bg-[var(--text-primary)] !text-[var(--bg-page)]" : ""
                  }`}
                >
                  {CLI_TABS[k].label}
                </button>
              ))}
            </div>

            <div className="nb-code !p-0">
              <div className="flex items-center justify-between gap-3 border-b-2 border-[var(--border)] bg-[var(--bg-surface-2)] px-4 py-2.5">
                <span className="font-mono text-[11px] font-bold text-[var(--text-secondary)]">
                  terminal
                </span>
                <button
                  type="button"
                  onClick={() => onCopy(tab.cmd, "qs-cli")}
                  className="nb-chip !px-2.5 !py-1 !text-[11px]"
                >
                  {copiedCode === "qs-cli" ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="!p-4 leading-relaxed"><code><span className="text-[var(--accent)] font-bold">$</span> {tab.cmd}</code></pre>
              <div className="flex flex-col gap-1.5 border-t-2 border-[var(--border)] px-4 py-3 text-[12px]">
                <span className="flex items-center gap-2 font-semibold text-[var(--green)]">
                  <span className="inline-flex">{Icon.check}</span>
                  {tab.resolved}
                </span>
                <span className="text-[var(--text-secondary)]">
                  Response 200 OK · credentials attached automatically
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Footer
   ══════════════════════════════════════════════════════════════════════════ */

function Footer() {
  return (
    <footer className="border-t-2 border-[var(--border)] bg-[var(--bg-surface-2)] px-4 py-14 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <span
          className="ts-icon-badge mb-5"
          style={{ width: 52, height: 52, padding: 7 }}
        >
          <TSLogoMarkFilled size={36} />
        </span>
        <h2 className="text-[24px] font-extrabold uppercase leading-tight tracking-[-0.03em] sm:text-[30px]">
          Ready to stop guessing?
        </h2>
        <p className="mt-3 max-w-md text-[13px] leading-relaxed text-[var(--text-secondary)]">
          Spin TraceSketch up locally in under a minute. Free, open source, and private by default.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/" className="nb-pill nb-pill-solid !px-6 !py-3">
            Enter Console
            <span className="inline-flex">{Icon.arrow}</span>
          </Link>
          <Link to="/relay" className="nb-pill !px-6 !py-3">
            {Icon.chat}
            Team Relay
          </Link>
        </div>
        <p className="mt-9 font-mono text-[11px] text-[var(--text-dim)]">
          TraceSketch · v0.0.6 · Crafted for engineers who build fast and break things less.
        </p>
      </div>
    </footer>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Page
   ══════════════════════════════════════════════════════════════════════════ */

export function WebsiteLanding() {
  const navigate = useNavigate();
  const { simulateTrace } = useTraceSimulator();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const inspectDemo = () => {
    simulateTrace("checkout-500");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)]">
      <SiteNav />
      <main>
        <Hero copiedCode={copiedCode} onCopy={copyToClipboard} />
        <Highlights />
        <Simulator />

        <section className="border-t-2 border-[var(--border)] px-4 py-14 sm:px-6">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-4">
            <p className="w-full text-center text-[13px] text-[var(--text-secondary)]">
              Saw enough? Inspect a fully simulated failing trace in the console.
            </p>
            <button type="button" onClick={inspectDemo} className="nb-pill nb-pill-flare !px-6 !py-3">
              {Icon.search}
              Inspect a live trace
            </button>
          </div>
        </section>

        <ChatSection />
        <LoopSection />
        <Comparison />
        <Quickstart copiedCode={copiedCode} onCopy={copyToClipboard} />
      </main>
      <Footer />
    </div>
  );
}