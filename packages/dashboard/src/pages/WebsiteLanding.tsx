import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTraceSimulator } from "../context/TraceSimulatorContext";
import { TSLogoMarkFilled } from "../components/TSLogo";

export function WebsiteLanding() {
  const navigate = useNavigate();
  const { simulateTrace } = useTraceSimulator();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"express" | "cli" | "nextjs">("express");
  const [demoScenario, setDemoScenario] = useState<"checkout" | "auth" | "db">("checkout");
  const [demoTraceId, setDemoTraceId] = useState<string | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [replaySuccess, setReplaySuccess] = useState(false);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSimulateReplay = () => {
    setReplaying(true);
    setReplaySuccess(false);
    setTimeout(() => {
      setReplaying(false);
      setReplaySuccess(true);
      setTimeout(() => setReplaySuccess(false), 3000);
    }, 900);
  };

  return (
    <div className="min-h-screen bg-[#0A0D14] text-[#F8FAFC] selection:bg-[#6C47FF]/30 selection:text-[#C4B5FD] relative overflow-hidden">
      {/* Background Radial Glow & Cyber Grid */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(108,71,255,0.22),transparent_70%)] pointer-events-none -z-10" />
      <div className="absolute top-[800px] right-[-200px] w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.08),transparent_70%)] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-grid-cyber pointer-events-none -z-20 opacity-40" />

      {/* Modern Top Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0A0D14]/80 border-b border-[#1E253A] px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/overview" className="flex items-center gap-3 no-underline group">
            {/* Angular TS icon badge — matches logo geometry */}
            <div
              className="ts-icon-badge group-hover:scale-105"
              style={{ width: 38, height: 38, padding: 4 }}
            >
              <TSLogoMarkFilled size={30} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-0 font-extrabold tracking-tight text-[17px] leading-tight">
                <span className="text-white">Trace</span>
                <span className="text-[#6C47FF]">Sketch</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Local-First API Flight Recorder</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium text-slate-300">
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#interactive-preview" className="hover:text-white transition-colors">Live Preview</a>
            <a href="#features" className="hover:text-white transition-colors">Architecture</a>
            <a href="#comparison" className="hover:text-white transition-colors">Why TraceSketch</a>
            <a href="#quickstart" className="hover:text-white transition-colors">Quickstart</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] font-semibold text-white bg-[#6C47FF] hover:bg-[#7D5BFF] transition-all shadow-[0_0_20px_rgba(108,71,255,0.45)] hover:shadow-[0_0_28px_rgba(108,71,255,0.65)] hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>Launch Console</span>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-6 max-w-7xl mx-auto text-center relative">
        {/* Gen-Z / Developer Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#161B2B] border border-[#6C47FF]/30 text-[#C4B5FD] text-[12px] font-medium mb-6 shadow-[0_0_20px_rgba(108,71,255,0.2)] animate-float">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
          <span>Local-First SQLite Engine</span>
          <span className="text-slate-500">•</span>
          <span className="text-white font-mono text-[11px]">Zero Cloud Leaks</span>
        </div>

        {/* Main Hero Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 max-w-4xl mx-auto">
          Debug Failing APIs at the <br className="hidden sm:inline" />
          <span className="gradient-text-hero">Speed of Thought.</span>
        </h1>

        <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          The developer-first flight recorder for backend APIs. <br className="hidden sm:inline" />
          Capture exact request payloads, analyze internal DB/Cache waterfalls, and replay failed requests directly to <code className="text-[#A78BFA] font-mono font-medium">localhost:3000</code> in one click.
        </p>

        {/* Hero Actions */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
          <Link
            to="/"
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-[10px] text-[15px] font-semibold text-white bg-[#6C47FF] hover:bg-[#7D5BFF] transition-all shadow-[0_4px_30px_rgba(108,71,255,0.5)] hover:scale-[1.03] active:scale-[0.98]"
          >
            <span>Open Developer Console</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/20">Local</span>
          </Link>

          <button
            onClick={() => {
              const el = document.getElementById("interactive-preview");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="flex items-center gap-2 px-5 py-3.5 rounded-[10px] text-[14px] font-medium text-slate-200 bg-[#161B2B] hover:bg-[#1E253A] border border-[#262E44] transition-all hover:border-[#6C47FF]/50"
          >
            <span>Try Interactive Sandbox</span>
            <span>⚡</span>
          </button>
        </div>

        {/* Quick Install Bar */}
        <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-[10px] bg-[#111422] border border-[#262E44] shadow-lg max-w-md mx-auto">
          <span className="text-[#6C47FF] font-mono text-[13px] font-semibold">$</span>
          <code className="text-[13px] font-mono text-slate-200">npm i @tracesketch/sdk</code>
          <button
            onClick={() => copyToClipboard("npm i @tracesketch/sdk", "hero-npm")}
            className="ml-auto text-[12px] text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors font-medium"
          >
            {copiedCode === "hero-npm" ? "Copied! ✨" : "Copy"}
          </button>
        </div>
      </section>

      {/* Interactive Trace Preview / Flight Recorder Showcase */}
      <section id="interactive-preview" className="py-14 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#A78BFA] mb-2 font-semibold">Interactive Simulator</div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">The Anatomy of a Captured Trace</h2>
          <p className="text-slate-400 text-sm mt-2 max-w-lg mx-auto">
            Switch scenarios below to inspect how TraceSketch records latency spans, pinpoints failing external services, and allows immediate replay.
          </p>
        </div>

        {/* Scenario Selectors */}
        <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setDemoScenario("checkout")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              demoScenario === "checkout"
                ? "bg-[#F43F5E]/20 text-[#F43F5E] border border-[#F43F5E]/50 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                : "bg-[#161B2B] text-slate-400 border border-[#262E44] hover:text-white"
            }`}
          >
            💥 Checkout 500 (Payment Timeout)
          </button>
          <button
            onClick={() => setDemoScenario("auth")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              demoScenario === "auth"
                ? "bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                : "bg-[#161B2B] text-slate-400 border border-[#262E44] hover:text-white"
            }`}
          >
            🔒 Auth 401 (JWT Token Expired)
          </button>
          <button
            onClick={() => setDemoScenario("db")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              demoScenario === "db"
                ? "bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                : "bg-[#161B2B] text-slate-400 border border-[#262E44] hover:text-white"
            }`}
          >
            🐢 Slow DB Query (1.24s Waterfall)
          </button>
        </div>

        {/* Simulated Trace Panel */}
        <div className="rounded-[16px] bg-[#111422] border border-[#262E44] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden transition-all hover:border-[#6C47FF]/40">
          {/* Header Bar */}
          <div className="px-5 py-4 bg-[#141828] border-b border-[#262E44] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                  demoScenario === "checkout"
                    ? "bg-[#F43F5E]/20 text-[#F43F5E] border border-[#F43F5E]/40"
                    : demoScenario === "auth"
                    ? "bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40"
                    : "bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40"
                }`}
              >
                {demoScenario === "checkout" ? "POST" : demoScenario === "auth" ? "POST" : "GET"}
              </span>
              <span className="font-mono text-sm font-semibold text-white">
                {demoScenario === "checkout"
                  ? "/api/v1/checkout/charge"
                  : demoScenario === "auth"
                  ? "/api/v1/auth/jwt/refresh"
                  : "/api/v1/reports/monthly-aggregation"}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-mono font-semibold ${
                  demoScenario === "checkout"
                    ? "bg-[#F43F5E]/20 text-[#F43F5E]"
                    : demoScenario === "auth"
                    ? "bg-[#F59E0B]/20 text-[#F59E0B]"
                    : "bg-[#10B981]/20 text-[#10B981]"
                }`}
              >
                {demoScenario === "checkout" ? "500 Error" : demoScenario === "auth" ? "401 Unauthorized" : "200 OK"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-mono">
                Duration: <strong className="text-white">{demoScenario === "checkout" ? "342ms" : demoScenario === "auth" ? "62ms" : "1,240ms"}</strong>
              </span>
              <button
                onClick={handleSimulateReplay}
                disabled={replaying}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium text-white bg-[#6C47FF] hover:bg-[#7D5BFF] transition-all disabled:opacity-50"
              >
                {replaying ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Replaying...</span>
                  </>
                ) : (
                  <>
                    <span>↺ Replay Request</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Replay Notification Banner */}
          {replaySuccess && (
            <div className="bg-[#10B981]/20 border-b border-[#10B981]/40 text-[#10B981] px-5 py-2 text-xs font-mono flex items-center justify-between animate-fade">
              <span>✓ Replay executed against http://localhost:3000 • Received exact response status!</span>
              <span className="font-bold">Match: 100%</span>
            </div>
          )}

          {/* Simulated Timeline Waterfall */}
          <div className="p-5">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Waterfall Spans</span>
              <span className="text-[11px] text-slate-400 font-normal">Sub-millisecond breakdown</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {demoScenario === "checkout" && (
                <>
                  <div className="bg-[#161B2B] p-3 rounded-[8px] border border-[#262E44]">
                    <div className="flex justify-between text-slate-300 mb-1.5">
                      <span className="text-[#38BDF8] font-bold">http: api-gateway (POST /api/v1/checkout/charge)</span>
                      <span>342 ms</span>
                    </div>
                    <div className="h-2 w-full bg-[#101420] rounded-full overflow-hidden">
                      <div className="h-full bg-[#38BDF8] rounded-full" style={{ width: "100%" }} />
                    </div>
                  </div>

                  <div className="bg-[#161B2B] p-3 rounded-[8px] border border-[#262E44] ml-4">
                    <div className="flex justify-between text-slate-300 mb-1.5">
                      <span className="text-[#10B981] font-bold">db: postgres (SELECT * FROM orders WHERE id = $1)</span>
                      <span>64 ms</span>
                    </div>
                    <div className="h-2 w-full bg-[#101420] rounded-full overflow-hidden">
                      <div className="h-full bg-[#10B981] rounded-full" style={{ width: "19%", marginLeft: "4%" }} />
                    </div>
                  </div>

                  <div className="bg-[#161B2B] p-3 rounded-[8px] border border-[#262E44] ml-4">
                    <div className="flex justify-between text-slate-300 mb-1.5">
                      <span className="text-[#A78BFA] font-bold">cache: redis (HGET rate_limit:user_789)</span>
                      <span>4 ms</span>
                    </div>
                    <div className="h-2 w-full bg-[#101420] rounded-full overflow-hidden">
                      <div className="h-full bg-[#A78BFA] rounded-full" style={{ width: "3%", marginLeft: "24%" }} />
                    </div>
                  </div>

                  <div className="bg-[#F43F5E]/10 p-3 rounded-[8px] border border-[#F43F5E]/40 ml-4 animate-pulse">
                    <div className="flex justify-between text-slate-200 mb-1.5 font-semibold">
                      <span className="text-[#F43F5E]">external: stripe-payments (PaymentGatewayTimeout: 504)</span>
                      <span className="text-[#F43F5E]">220 ms (CULPRIT)</span>
                    </div>
                    <div className="h-2 w-full bg-[#101420] rounded-full overflow-hidden">
                      <div className="h-full bg-[#F43F5E] rounded-full" style={{ width: "64%", marginLeft: "28%" }} />
                    </div>
                    <div className="mt-2 text-[11px] text-[#FCA5A5] font-sans">
                      Root cause identified: External gateway timed out after 220ms while executing card payment intent.
                    </div>
                  </div>
                </>
              )}

              {demoScenario === "auth" && (
                <>
                  <div className="bg-[#161B2B] p-3 rounded-[8px] border border-[#262E44]">
                    <div className="flex justify-between text-slate-300 mb-1.5">
                      <span className="text-[#38BDF8] font-bold">http: auth-service (POST /api/v1/auth/jwt/refresh)</span>
                      <span>62 ms</span>
                    </div>
                    <div className="h-2 w-full bg-[#101420] rounded-full overflow-hidden">
                      <div className="h-full bg-[#38BDF8] rounded-full" style={{ width: "100%" }} />
                    </div>
                  </div>

                  <div className="bg-[#F59E0B]/10 p-3 rounded-[8px] border border-[#F59E0B]/40 ml-4">
                    <div className="flex justify-between text-slate-200 mb-1.5 font-semibold">
                      <span className="text-[#F59E0B]">cache: redis (GET blacklist:jwt_token_99)</span>
                      <span className="text-[#F59E0B]">8 ms (REVOKED)</span>
                    </div>
                    <div className="h-2 w-full bg-[#101420] rounded-full overflow-hidden">
                      <div className="h-full bg-[#F59E0B] rounded-full" style={{ width: "13%", marginLeft: "8%" }} />
                    </div>
                    <div className="mt-2 text-[11px] text-[#FCD34D] font-sans">
                      Token rejection reason: Token signature expired 45 minutes ago. Refresh denied.
                    </div>
                  </div>
                </>
              )}

              {demoScenario === "db" && (
                <>
                  <div className="bg-[#161B2B] p-3 rounded-[8px] border border-[#262E44]">
                    <div className="flex justify-between text-slate-300 mb-1.5">
                      <span className="text-[#38BDF8] font-bold">http: reporting-svc (GET /api/v1/reports/monthly-aggregation)</span>
                      <span>1,240 ms</span>
                    </div>
                    <div className="h-2 w-full bg-[#101420] rounded-full overflow-hidden">
                      <div className="h-full bg-[#38BDF8] rounded-full" style={{ width: "100%" }} />
                    </div>
                  </div>

                  <div className="bg-[#F59E0B]/10 p-3 rounded-[8px] border border-[#F59E0B]/40 ml-4">
                    <div className="flex justify-between text-slate-200 mb-1.5 font-semibold">
                      <span className="text-[#F59E0B]">db: postgres (SELECT date_trunc('day', created_at), sum(amount) FROM ledger)</span>
                      <span className="text-[#F59E0B]">1,180 ms (SLOW QUERY)</span>
                    </div>
                    <div className="h-2 w-full bg-[#101420] rounded-full overflow-hidden">
                      <div className="h-full bg-[#F59E0B] rounded-full" style={{ width: "95%", marginLeft: "2%" }} />
                    </div>
                    <div className="mt-2 text-[11px] text-[#FCD34D] font-sans">
                      Diagnostic alert: Full table scan on table 'ledger' (450,200 rows scanned). Missing index on 'created_at'.
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Bottom action inside simulator */}
            <div className="mt-4 pt-3 border-t border-[#262E44] flex items-center justify-between text-xs text-slate-400">
              <span>Trace ID: <code className="text-[#A78BFA]">{demoTraceId ?? "generated on inspect"}</code></span>
              <button
                onClick={() => {
                  const trace = simulateTrace(demoScenario === "checkout" ? "checkout-500" : demoScenario === "auth" ? "auth-401" : "db-slow");
                  setDemoTraceId(trace.trace_id);
                  navigate("/");
                }}
                className="text-[#6C47FF] hover:text-[#9A72FF] font-medium flex items-center gap-1 transition-colors"
              >
                <span>Inspect in Full Dashboard Console →</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* The Core Loop: Record -> Understand -> Replay -> Protect */}
      <section id="how-it-works" className="py-20 px-6 max-w-7xl mx-auto border-t border-[#1E253A]">
        <div className="text-center mb-16">
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#6C47FF] mb-2 font-bold">The Golden Loop</div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">How TraceSketch Works</h2>
          <p className="text-slate-400 text-sm sm:text-base mt-3 max-w-xl mx-auto">
            A tight, laser-focused workflow built specifically for developers who write and debug APIs every day.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="rounded-[14px] bg-[#111422] p-6 border border-[#262E44] relative group hover:border-[#6C47FF]/50 transition-all hover:-translate-y-1">
            <div className="w-10 h-10 rounded-[10px] bg-[#6C47FF]/15 text-[#A78BFA] border border-[#6C47FF]/30 flex items-center justify-center text-lg font-bold mb-5 shadow-[0_0_15px_rgba(108,71,255,0.25)]">
              1
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Record Automatically</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Every incoming API request, response payload, status code, and header is recorded into your local SQLite store. No manual logging required.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-[14px] bg-[#111422] p-6 border border-[#262E44] relative group hover:border-[#6C47FF]/50 transition-all hover:-translate-y-1">
            <div className="w-10 h-10 rounded-[10px] bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 flex items-center justify-center text-lg font-bold mb-5 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
              2
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Understand the Waterfall</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              See exact microsecond spans: database queries, Redis cache lookups, and third-party API calls. Spot timeouts and bottlenecks instantly.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-[14px] bg-[#111422] p-6 border border-[#262E44] relative group hover:border-[#6C47FF]/50 transition-all hover:-translate-y-1">
            <div className="w-10 h-10 rounded-[10px] bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 flex items-center justify-center text-lg font-bold mb-5 shadow-[0_0_15px_rgba(56,189,248,0.25)]">
              3
            </div>
            <h3 className="text-lg font-bold text-white mb-2">1-Click Replay</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              No more copying curl commands or rebuilding Postman requests. Resend the exact failing request to your local dev server with one click.
            </p>
          </div>

          {/* Card 4 */}
          <div className="rounded-[14px] bg-[#111422] p-6 border border-[#262E44] relative group hover:border-[#6C47FF]/50 transition-all hover:-translate-y-1">
            <div className="w-10 h-10 rounded-[10px] bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 flex items-center justify-center text-lg font-bold mb-5 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
              4
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Lock with Regression</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Save any reproduced trace directly as an automated regression test so the exact bug never silently reappears in production.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison Matrix: Why TraceSketch */}
      <section id="comparison" className="py-20 px-6 max-w-5xl mx-auto border-t border-[#1E253A]">
        <div className="text-center mb-14">
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#6C47FF] mb-2 font-bold">Honest Comparison</div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">How TraceSketch Compares</h2>
          <p className="text-slate-400 text-sm mt-2">
            Why developers choose local-first flight recording over noisy dashboards.
          </p>
        </div>

        <div className="rounded-[14px] bg-[#111422] border border-[#262E44] overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#161B2B] border-b border-[#262E44] text-slate-300">
                <th className="p-4 font-semibold">Capability</th>
                <th className="p-4 font-semibold text-slate-400">Network Tab</th>
                <th className="p-4 font-semibold text-slate-400">Postman</th>
                <th className="p-4 font-semibold text-slate-400">Sentry</th>
                <th className="p-4 font-bold text-[#6C47FF] bg-[#6C47FF]/10">TraceSketch ⚡</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E253A] text-slate-300">
              <tr>
                <td className="p-4 font-medium text-white">Internal Server Timing (DB, Cache)</td>
                <td className="p-4 text-rose-400">✕ No visibility</td>
                <td className="p-4 text-rose-400">✕ No visibility</td>
                <td className="p-4 text-emerald-400">✓ Stack traces</td>
                <td className="p-4 font-semibold text-emerald-400 bg-[#6C47FF]/5">✓ Sub-ms Waterfall</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-white">1-Click Local Replay Engine</td>
                <td className="p-4 text-rose-400">✕ Manual copy</td>
                <td className="p-4 text-amber-400">~ Manual setup</td>
                <td className="p-4 text-rose-400">✕ No replay</td>
                <td className="p-4 font-semibold text-emerald-400 bg-[#6C47FF]/5">✓ 1-Click Instant Replay</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-white">Local-First Privacy (Zero Cloud)</td>
                <td className="p-4 text-emerald-400">✓ Browser only</td>
                <td className="p-4 text-rose-400">✕ Cloud sync</td>
                <td className="p-4 text-rose-400">✕ Cloud ingestion</td>
                <td className="p-4 font-semibold text-emerald-400 bg-[#6C47FF]/5">✓ 100% Local SQLite</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-white">Turn Bug into Regression Test</td>
                <td className="p-4 text-rose-400">✕ None</td>
                <td className="p-4 text-amber-400">~ Complex scripts</td>
                <td className="p-4 text-rose-400">✕ Alert only</td>
                <td className="p-4 font-semibold text-emerald-400 bg-[#6C47FF]/5">✓ One Click Lock</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-white">Setup Friction</td>
                <td className="p-4 text-slate-400">0s</td>
                <td className="p-4 text-slate-400">Collections setup</td>
                <td className="p-4 text-slate-400">Cloud account + DSN</td>
                <td className="p-4 font-semibold text-white bg-[#6C47FF]/5">2 Lines of Code</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Quickstart Integration Section */}
      <section id="quickstart" className="py-20 px-6 max-w-4xl mx-auto border-t border-[#1E253A]">
        <div className="text-center mb-10">
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#6C47FF] mb-2 font-bold">2-Minute Setup</div>
          <h2 className="text-3xl font-bold tracking-tight">Drop It In Your Codebase</h2>
        </div>

        {/* Tab Headers */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            onClick={() => setActiveTab("express")}
            className={`px-4 py-2 rounded-[8px] text-xs font-semibold transition-all ${
              activeTab === "express" ? "bg-[#6C47FF] text-white" : "bg-[#161B2B] text-slate-400 hover:text-white"
            }`}
          >
            Express.js / Node
          </button>
          <button
            onClick={() => setActiveTab("cli")}
            className={`px-4 py-2 rounded-[8px] text-xs font-semibold transition-all ${
              activeTab === "cli" ? "bg-[#6C47FF] text-white" : "bg-[#161B2B] text-slate-400 hover:text-white"
            }`}
          >
            CLI Collector
          </button>
          <button
            onClick={() => setActiveTab("nextjs")}
            className={`px-4 py-2 rounded-[8px] text-xs font-semibold transition-all ${
              activeTab === "nextjs" ? "bg-[#6C47FF] text-white" : "bg-[#161B2B] text-slate-400 hover:text-white"
            }`}
          >
            Next.js / Fastify
          </button>
        </div>

        {/* Code Snippet Box */}
        <div className="rounded-[14px] bg-[#111422] border border-[#262E44] overflow-hidden shadow-2xl">
          <div className="px-4 py-3 bg-[#161B2B] border-b border-[#262E44] flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">
              {activeTab === "express" ? "server.ts" : activeTab === "cli" ? "terminal" : "instrumentation.ts"}
            </span>
            <button
              onClick={() =>
                copyToClipboard(
                  activeTab === "express"
                    ? `import express from "express";\nimport { traceSketch } from "@tracesketch/sdk";\n\nconst app = express();\n\n// ⚡ TraceSketch Middleware\napp.use(traceSketch({\n  collectorUrl: "http://localhost:4000",\n}));\n\napp.listen(3000, () => console.log("Ready"));`
                    : activeTab === "cli"
                    ? "npx @tracesketch/cli init\nnpx @tracesketch/cli start"
                    : `import { traceSketch } from "@tracesketch/sdk";\n\nexport function register() {\n  traceSketch.init({\n    serviceName: "next-app",\n    collectorUrl: "http://localhost:4000",\n  });\n}`,
                  "tab-code"
                )
              }
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors font-mono"
            >
              {copiedCode === "tab-code" ? "Copied! ✓" : "Copy Code"}
            </button>
          </div>

          <pre className="p-5 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed">
            {activeTab === "express" && (
              <code>
                <span className="text-[#A78BFA]">import</span> express <span className="text-[#A78BFA]">from</span> <span className="text-[#10B981]">"express"</span>;{"\n"}
                <span className="text-[#A78BFA]">import</span> {"{ traceSketch }"} <span className="text-[#A78BFA]">from</span> <span className="text-[#10B981]">"@tracesketch/sdk"</span>;{"\n\n"}
                <span className="text-[#38BDF8]">const</span> app = express();{"\n\n"}
                <span className="text-slate-500">// ⚡ Record all incoming requests + timeline spans</span>{"\n"}
                app.use(traceSketch({"{\n"}
                {"  "}collectorUrl: <span className="text-[#10B981]">"http://localhost:4000"</span>,{"\n"}
                {"}"}));{"\n\n"}
                app.listen(<span className="text-[#F59E0B]">3000</span>, () =&gt; console.log(<span className="text-[#10B981]">"Ready to record traces 🚀"</span>));
              </code>
            )}

            {activeTab === "cli" && (
              <code>
                <span className="text-slate-500"># 1. Initialize local SQLite collector</span>{"\n"}
                <span className="text-[#6C47FF] font-bold">$</span> npx @tracesketch/cli init{"\n\n"}
                <span className="text-slate-500"># 2. Start collector server on localhost:4000</span>{"\n"}
                <span className="text-[#6C47FF] font-bold">$</span> npx @tracesketch/cli start{"\n\n"}
                <span className="text-slate-500"># 3. Open dashboard at localhost:5173</span>{"\n"}
                <span className="text-[#10B981]">✓ Collector listening on http://127.0.0.1:4000</span>{"\n"}
                <span className="text-[#10B981]">✓ SQLite database mounted at ~/.tracebox/tracebox.db</span>
              </code>
            )}

            {activeTab === "nextjs" && (
              <code>
                <span className="text-[#A78BFA]">import</span> {"{ traceSketch }"} <span className="text-[#A78BFA]">from</span> <span className="text-[#10B981]">"@tracesketch/sdk"</span>;{"\n\n"}
                <span className="text-[#38BDF8]">export function</span> register() {"{\n"}
                {"  "}traceSketch.init({"{\n"}
                {"    "}serviceName: <span className="text-[#10B981]">"next-frontend"</span>,{"\n"}
                {"    "}collectorUrl: <span className="text-[#10B981]">"http://localhost:4000"</span>,{"\n"}
                {"  }"});{"\n"}
                {"}"}
              </code>
            )}
          </pre>
        </div>
      </section>

      {/* Footer Banner */}
      <footer className="mt-20 py-12 px-6 border-t border-[#1E253A] bg-[#0A0D14] text-center">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <div className="w-12 h-12 rounded-[12px] bg-[#121624] border border-[#6C47FF]/40 p-2 flex items-center justify-center shadow-[0_0_25px_rgba(108,71,255,0.4)] mb-4">
            <img src="/logo.png" alt="TraceSketch" className="w-full h-full object-contain" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Ready to Stop Guessing Production Bugs?</h3>
          <p className="text-slate-400 text-xs sm:text-sm mb-6 max-w-md">
            Spin up TraceSketch locally in less than 60 seconds. Free, open, and private forever.
          </p>

          <div className="flex items-center gap-4 mb-8">
            <Link
              to="/"
              className="px-6 py-3 rounded-[8px] text-xs font-semibold text-white bg-[#6C47FF] hover:bg-[#7D5BFF] transition-all shadow-[0_0_20px_rgba(108,71,255,0.4)]"
            >
              Enter Console Now →
            </Link>
          </div>

          <div className="text-slate-500 text-[11px] font-mono">
            TraceSketch • v0.0.1 • Crafted for engineers who build fast and break things less.
          </div>
        </div>
      </footer>
    </div>
  );
}
