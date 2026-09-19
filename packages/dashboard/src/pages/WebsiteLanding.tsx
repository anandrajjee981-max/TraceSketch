import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTraceSimulator } from "../context/TraceSimulatorContext";
import { TSLogoMarkFilled } from "../components/TSLogo";

export function WebsiteLanding() {
  const navigate = useNavigate();
  const { simulateTrace } = useTraceSimulator();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [demoScenario, setDemoScenario] = useState<"checkout" | "auth" | "db">("checkout");
  const [demoTraceId, setDemoTraceId] = useState<string | null>(null);
  const [activeSimTab, setActiveSimTab] = useState<"waterfall" | "payload" | "replay">("waterfall");
  const [redactPrivacy, setRedactPrivacy] = useState(true);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayResult, setReplayResult] = useState<{ statusCode: number; durationMs: number; statusText: string } | null>(null);
  const [activeCliTab, setActiveCliTab] = useState<"port" | "url" | "body">("port");

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const runLiveSimulatedReplay = () => {
    setIsReplaying(true);
    setReplayResult(null);
    setTimeout(() => {
      setIsReplaying(false);
      setReplayResult({
        statusCode: demoScenario === "checkout" ? 200 : demoScenario === "auth" ? 200 : 200,
        durationMs: demoScenario === "checkout" ? 48 : demoScenario === "auth" ? 35 : 120,
        statusText: "OK",
      });
    }, 700);
  };

  return (
    <div className="min-h-screen bg-[#0A0D14] text-[#F8FAFC] selection:bg-[#6C47FF]/30 selection:text-[#C4B5FD] relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(108,71,255,0.22),transparent_70%)] pointer-events-none -z-10" />
      <div className="absolute top-[800px] right-[-200px] w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.08),transparent_70%)] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-grid-cyber pointer-events-none -z-20 opacity-40" />

      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0A0D14]/80 border-b border-[#1E253A] px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/overview" className="flex items-center gap-3 no-underline group">
            <div className="ts-icon-badge group-hover:scale-105" style={{ width: 38, height: 38, padding: 4 }}>
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

          <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] font-semibold text-white bg-[#6C47FF] hover:bg-[#7D5BFF] transition-all shadow-[0_0_20px_rgba(108,71,255,0.45)]">
            <span>Launch Console</span>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
        </div>
      </header>

      <section className="pt-16 pb-20 px-6 max-w-7xl mx-auto text-center relative">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#161B2B] border border-[#6C47FF]/30 text-[#C4B5FD] text-[12px] font-medium mb-6 shadow-[0_0_20px_rgba(108,71,255,0.2)] animate-float">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
          <span>Local-First SQLite Engine</span>
          <span className="text-slate-500">•</span>
          <span className="text-white font-mono text-[11px]">Zero Cloud Leaks</span>
        </div>
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 max-w-4xl mx-auto">
          Debug Failing APIs at the <br className="hidden sm:inline" />
          <span className="gradient-text-hero">Speed of Thought.</span>
        </h1>
        <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          The developer-first flight recorder for backend APIs. <br className="hidden sm:inline" />
          Capture exact request payloads, analyze internal DB/Cache waterfalls, and replay failed requests directly to <code className="text-[#A78BFA] font-mono font-medium">localhost:3000</code> in one click.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
          <Link to="/" className="flex items-center gap-2.5 px-6 py-3.5 rounded-[10px] text-[15px] font-semibold text-white bg-[#6C47FF] hover:bg-[#7D5BFF] transition-all shadow-[0_4px_30px_rgba(108,71,255,0.5)] hover:scale-[1.03] active:scale-[0.98]">
            <span>Open Developer Console</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/20">Local</span>
          </Link>
          <button onClick={() => document.getElementById("interactive-preview")?.scrollIntoView({ behavior: "smooth" })} className="flex items-center gap-2 px-5 py-3.5 rounded-[10px] text-[14px] font-medium text-slate-200 bg-[#161B2B] hover:bg-[#1E253A] border border-[#262E44] transition-all hover:border-[#6C47FF]/50">
            <span>Try Interactive Sandbox</span><span>⚡</span>
          </button>
        </div>
        <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-[10px] bg-[#111422] border border-[#262E44] shadow-lg max-w-md mx-auto">
          <span className="text-[#6C47FF] font-mono text-[13px] font-semibold">$</span>
          <code className="text-[13px] font-mono text-slate-200">npm i tracesketch</code>
          <button onClick={() => copyToClipboard("npm i tracesketch", "hero-npm")} className="ml-auto text-[12px] text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors font-medium">
            {copiedCode === "hero-npm" ? "Copied! ✨" : "Copy"}
          </button>
        </div>
      </section>

      <section id="interactive-preview" className="py-14 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#A78BFA] mb-2 font-semibold">Interactive Simulator</div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">The Anatomy of a Captured Trace</h2>
          <p className="text-slate-400 text-sm mt-2 max-w-lg mx-auto">Switch scenarios and view modes below to inspect how TraceSketch records spans, auto-redacts secrets, and replays failed requests.</p>
        </div>

        {/* Scenario Selectors */}
        <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
          <button onClick={() => { setDemoScenario("checkout"); setReplayResult(null); }} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${demoScenario === "checkout" ? "bg-[#F43F5E]/20 text-[#F43F5E] border border-[#F43F5E]/50" : "bg-[#161B2B] text-slate-400 border border-[#262E44] hover:text-white"}`}>💥 Checkout 500 (Payment Timeout)</button>
          <button onClick={() => { setDemoScenario("auth"); setReplayResult(null); }} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${demoScenario === "auth" ? "bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/50" : "bg-[#161B2B] text-slate-400 border border-[#262E44] hover:text-white"}`}>🔒 Auth 401 (JWT Token Expired)</button>
          <button onClick={() => { setDemoScenario("db"); setReplayResult(null); }} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${demoScenario === "db" ? "bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/50" : "bg-[#161B2B] text-slate-400 border border-[#262E44] hover:text-white"}`}>🐢 Slow DB Query (1.24s Waterfall)</button>
        </div>

        {/* Outer Container with View Tabs */}
        <div className="rounded-[16px] bg-[#111422] border border-[#262E44] overflow-hidden shadow-2xl">
          {/* Top Bar with View Mode Tabs */}
          <div className="px-5 py-3 bg-[#161B2B] border-b border-[#262E44] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSimTab("waterfall")}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all ${activeSimTab === "waterfall" ? "bg-[#6C47FF] text-white shadow-[0_0_12px_rgba(108,71,255,0.4)]" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
              >
                📊 Waterfall Spans
              </button>
              <button
                onClick={() => setActiveSimTab("payload")}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all ${activeSimTab === "payload" ? "bg-[#6C47FF] text-white shadow-[0_0_12px_rgba(108,71,255,0.4)]" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
              >
                🛡️ Payload & Security Redaction
              </button>
              <button
                onClick={() => setActiveSimTab("replay")}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all ${activeSimTab === "replay" ? "bg-[#6C47FF] text-white shadow-[0_0_12px_rgba(108,71,255,0.4)]" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
              >
                ↺ Replay Sandbox
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span>Target: <code className="text-[#A78BFA]">localhost:3000</code></span>
            </div>
          </div>

          <div className="p-6">
            {/* Tab 1: Waterfall */}
            {activeSimTab === "waterfall" && (
              <div>
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center justify-between">
                  <span>Latency Waterfall Spans</span>
                  <span className="text-[11px] text-slate-400 font-normal">Sub-millisecond trace breakdown</span>
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
              </div>
            )}

            {/* Tab 2: Payload & Redaction */}
            {activeSimTab === "payload" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-white">Interactive Security Redaction Preview</h4>
                    <p className="text-xs text-slate-400">Toggle privacy mode below to see how TraceSketch sanitizes passwords & API keys before storing.</p>
                  </div>
                  <button
                    onClick={() => setRedactPrivacy(!redactPrivacy)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold transition-all flex items-center gap-2 ${redactPrivacy ? "bg-[#10B981]/20 text-[#6EE7B7] border border-[#10B981]/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]" : "bg-rose-500/20 text-rose-300 border border-rose-500/40"}`}
                  >
                    <span>{redactPrivacy ? "🔒 Privacy Redaction: ON" : "🔓 Privacy Redaction: OFF"}</span>
                  </button>
                </div>

                <div className="rounded-[12px] bg-[#0A0D14] border border-[#262E44] p-5 font-mono text-xs overflow-x-auto">
                  <div className="text-slate-400 mb-2">// Captured HTTP Headers & Body Payload</div>
                  <pre className="text-slate-200 leading-relaxed">
                    <code>
                      {JSON.stringify(
                        {
                          headers: {
                            "content-type": "application/json",
                            authorization: redactPrivacy ? "Bearer [REDACTED_JWT_TOKEN]" : "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...",
                            "x-api-key": redactPrivacy ? "[REDACTED_API_KEY]" : "sk_live_99481028471"
                          },
                          body: {
                            user_id: "usr_7890",
                            account_email: "developer@tracesketch.dev",
                            password: redactPrivacy ? "[REDACTED]" : "SuperSecretPass123!",
                            amount_cents: 4900,
                            currency: "USD"
                          }
                        },
                        null,
                        2
                      )}
                    </code>
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 3: Replay Sandbox */}
            {activeSimTab === "replay" && (
              <div>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-white">Live Replay Engine Sandbox</h4>
                    <p className="text-xs text-slate-400">Simulate sending this trace directly to your local development server.</p>
                  </div>
                  <button
                    onClick={runLiveSimulatedReplay}
                    disabled={isReplaying}
                    className="px-4 py-2 rounded-[8px] bg-[#6C47FF] hover:bg-[#7D5BFF] disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-[0_0_16px_rgba(108,71,255,0.4)] flex items-center gap-2"
                  >
                    {isReplaying ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Executing Replay...</span>
                      </>
                    ) : (
                      <>
                        <span>▶ Trigger 1-Click Replay</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#0A0D14] border border-[#262E44] rounded-[10px] p-4 font-mono text-xs">
                    <div className="text-slate-400 mb-2 font-bold text-[11px] uppercase tracking-wider">Original Recorded Trace</div>
                    <div className="space-y-1.5 text-slate-300">
                      <div>Method: <span className="text-[#38BDF8]">POST</span></div>
                      <div>Path: <code className="text-[#A78BFA]">/api/v1/checkout/charge</code></div>
                      <div>Status: <span className="text-rose-400 font-bold">{demoScenario === "checkout" ? "504 Gateway Timeout" : demoScenario === "auth" ? "401 Unauthorized" : "200 OK"}</span></div>
                      <div>Duration: <span className="text-amber-400 font-bold">{demoScenario === "checkout" ? "342ms" : demoScenario === "auth" ? "62ms" : "1,240ms"}</span></div>
                    </div>
                  </div>

                  <div className="bg-[#0A0D14] border border-[#262E44] rounded-[10px] p-4 font-mono text-xs relative overflow-hidden">
                    <div className="text-slate-400 mb-2 font-bold text-[11px] uppercase tracking-wider">Replay Execution Result</div>
                    {isReplaying && (
                      <div className="space-y-2 py-3 text-slate-400 animate-pulse">
                        <div className="text-xs text-[#38BDF8]">→ Dispatching HTTP request to http://localhost:3000...</div>
                        <div className="text-xs text-slate-500">→ Injecting original headers & payload...</div>
                      </div>
                    )}
                    {!isReplaying && replayResult && (
                      <div className="space-y-1.5 text-slate-300">
                        <div>Target: <code className="text-[#6EE7B7]">http://localhost:3000</code></div>
                        <div>Status: <span className="text-[#10B981] font-bold">{replayResult.statusCode} {replayResult.statusText}</span></div>
                        <div>Replay Duration: <span className="text-[#10B981] font-bold">{replayResult.durationMs}ms</span></div>
                        <div className="mt-2 text-[11px] text-[#6EE7B7] bg-[#10B981]/10 p-2 rounded border border-[#10B981]/30">
                          ✓ Replay completed successfully! Side-by-side latency delta calculated.
                        </div>
                      </div>
                    )}
                    {!isReplaying && !replayResult && (
                      <div className="text-slate-500 text-xs py-4 text-center italic">
                        Click "Trigger 1-Click Replay" above to simulate resending the request payload.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom action inside simulator */}
            <div className="mt-6 pt-4 border-t border-[#262E44] flex items-center justify-between text-xs text-slate-400">
              <span>Trace ID: <code className="text-[#A78BFA]">{demoTraceId ?? "generated on inspect"}</code></span>
              <button
                onClick={() => {
                  const trace = simulateTrace(demoScenario === "checkout" ? "checkout-500" : demoScenario === "auth" ? "auth-401" : "db-slow");
                  setDemoTraceId(trace.trace_id);
                  navigate("/");
                }}
                className="text-[#6C47FF] hover:text-[#9A72FF] font-medium flex items-center gap-1.5 transition-colors group"
              >
                <span>Inspect in Full Dashboard Console</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
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
      <section id="quickstart" className="py-20 px-6 max-w-5xl mx-auto border-t border-[#1E253A]">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#6C47FF]/10 border border-[#6C47FF]/30 text-[#A78BFA] text-[11px] font-mono uppercase tracking-widest font-bold mb-4 shadow-[0_0_15px_rgba(108,71,255,0.2)]">
            ⚡ Quick Setup Guide
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            Quick Start
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Get TraceSketch running in under a minute with zero complex setup or cloud configuration.
          </p>
        </div>

        <div className="space-y-12">
          {/* Step 1 */}
          <div className="rounded-[16px] bg-[#111422] border border-[#262E44] p-6 sm:p-8 shadow-2xl relative overflow-hidden group hover:border-[#6C47FF]/40 transition-all">
            <div className="flex items-center gap-3.5 mb-4">
              <span className="w-8 h-8 rounded-full bg-[#6C47FF]/20 border border-[#6C47FF]/50 text-[#C4B5FD] flex items-center justify-center text-sm font-bold shadow-[0_0_12px_rgba(108,71,255,0.3)]">
                1
              </span>
              <h3 className="text-xl font-bold text-white">Add the middleware to your app</h3>
            </div>
            <p className="text-slate-400 text-sm mb-5 leading-relaxed">
              Express JSON parsing must come first. Every request your app receives is now automatically captured. No extra code per route.
            </p>
            <div className="rounded-[12px] bg-[#0A0D14] border border-[#262E44] overflow-hidden shadow-inner">
              <div className="px-4 py-2.5 bg-[#161B2B] border-b border-[#262E44] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="ml-2 text-xs text-slate-400 font-mono">server.ts</span>
                </div>
                <button
                  onClick={() => copyToClipboard(`import express from 'express';\nimport { traceSketch } from 'tracesketch';\n\nconst app = express();\n\napp.use(express.json());   // must come first\napp.use(traceSketch());     // then this\n\napp.get('/api/hello', (req, res) => {\n  res.json({ message: "hello" });\n});\n\napp.listen(3000);`, "qs-step1")}
                  className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-[#111422] border border-[#262E44] hover:bg-[#1E253A] transition-all font-mono"
                >
                  {copiedCode === "qs-step1" ? "Copied! ✓" : "Copy Code"}
                </button>
              </div>
              <pre className="p-5 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed">
                <code>
                  <span className="text-[#F472B6]">import</span> express <span className="text-[#F472B6]">from</span> <span className="text-[#A78BFA]">'express'</span>;{"\n"}
                  <span className="text-[#F472B6]">import</span> &#123; traceSketch &#125; <span className="text-[#F472B6]">from</span> <span className="text-[#A78BFA]">'tracesketch'</span>;{"\n\n"}
                  <span className="text-[#F472B6]">const</span> app = express();{"\n\n"}
                  app.use(express.json());   <span className="text-slate-500">// must come first</span>{"\n"}
                  app.use(traceSketch());     <span className="text-slate-500">// then this</span>{"\n\n"}
                  app.get(<span className="text-[#A78BFA]">'/api/hello'</span>, (req, res) =&gt; &#123;{"\n"}
                  {"  "}res.json(&#123; message: <span className="text-[#A78BFA]">"hello"</span> &#125;);{"\n"}
                  &#125;);{"\n\n"}
                  app.listen(<span className="text-[#F59E0B]">3000</span>);
                </code>
              </pre>
            </div>
          </div>

          {/* Step 2 */}
          <div className="rounded-[16px] bg-[#111422] border border-[#262E44] p-6 sm:p-8 shadow-2xl relative overflow-hidden group hover:border-[#10B981]/40 transition-all">
            <div className="flex items-center gap-3.5 mb-4">
              <span className="w-8 h-8 rounded-full bg-[#10B981]/20 border border-[#10B981]/50 text-[#6EE7B7] flex items-center justify-center text-sm font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                2
              </span>
              <h3 className="text-xl font-bold text-white">Start the collector and dashboard</h3>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Run this single command in your terminal to start the background collector & dashboard engine:
            </p>
            <div className="rounded-[12px] bg-[#0A0D14] border border-[#262E44] p-5 font-mono text-sm text-slate-200 shadow-inner mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-white font-bold">
                  <span className="text-[#6C47FF]">$</span> npx tracesketch start
                </div>
                <button
                  onClick={() => copyToClipboard("npx tracesketch start", "qs-step2")}
                  className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-[#111422] border border-[#262E44] hover:bg-[#1E253A] transition-all font-mono"
                >
                  {copiedCode === "qs-step2" ? "Copied! ✓" : "Copy"}
                </button>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-[#1E253A]">
                <div className="text-[#6EE7B7] text-xs flex items-center gap-2">
                  <span>✓</span> <span>The local storage server — <code className="bg-[#10B981]/10 text-[#6EE7B7] px-1.5 py-0.5 rounded">http://localhost:4000</code></span>
                </div>
                <div className="text-[#6EE7B7] text-xs flex items-center gap-2">
                  <span>✓</span> <span>The dashboard — <code className="bg-[#10B981]/10 text-[#6EE7B7] px-1.5 py-0.5 rounded">http://localhost:8470</code></span>
                </div>
              </div>
            </div>

            {/* Reserved Ports Warning */}
            <div className="rounded-[10px] bg-[#F59E0B]/10 border border-[#F59E0B]/30 p-3.5 flex items-start gap-3 text-xs text-[#FDE68A]">
              <span className="text-base leading-none">⚠️</span>
              <div>
                <strong className="text-amber-400 font-semibold">Note:</strong> Ports <code className="font-mono text-amber-300 font-bold">4000</code> and <code className="font-mono text-amber-300 font-bold">8470</code> are reserved by traceSketch. Please choose a different port for your own application.
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="rounded-[16px] bg-[#111422] border border-[#262E44] p-6 sm:p-8 shadow-2xl relative overflow-hidden group hover:border-[#38BDF8]/40 transition-all">
            <div className="flex items-center gap-3.5 mb-2">
              <span className="w-8 h-8 rounded-full bg-[#38BDF8]/20 border border-[#38BDF8]/50 text-[#7DD3FC] flex items-center justify-center text-sm font-bold shadow-[0_0_12px_rgba(56,189,248,0.3)]">
                3
              </span>
              <h3 className="text-xl font-bold text-white">Use your app normally</h3>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Hit your routes however you normally would. Every request shows up in the dashboard automatically.
            </p>
          </div>

          {/* Dashboard Capability Section */}
          <div className="border-t border-[#262E44] pt-12">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-[#6C47FF] uppercase tracking-wider font-bold">Dashboard Overview</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-6">Dashboard</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-8">
              <div className="bg-[#111422] border border-[#262E44] rounded-[12px] p-5 hover:border-[#6C47FF]/40 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-base">Traces</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#6C47FF]/20 text-[#C4B5FD] border border-[#6C47FF]/30">Live Feed</span>
                </div>
                <div className="text-xs text-slate-400 leading-relaxed">Every request — method, path, status code, duration</div>
              </div>

              <div className="bg-[#111422] border border-[#262E44] rounded-[12px] p-5 hover:border-[#38BDF8]/40 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-base">Trace Detail</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#38BDF8]/20 text-[#7DD3FC] border border-[#38BDF8]/30">Inspection</span>
                </div>
                <div className="text-xs text-slate-400 leading-relaxed">Full breakdown of one request, including headers and body</div>
              </div>

              <div className="bg-[#111422] border border-[#262E44] rounded-[12px] p-5 hover:border-[#10B981]/40 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-base">Replay</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10B981]/20 text-[#6EE7B7] border border-[#10B981]/30">Execution</span>
                </div>
                <div className="text-xs text-slate-400 leading-relaxed">Re-run any captured request against a target URL</div>
              </div>

              <div className="bg-[#111422] border border-[#262E44] rounded-[12px] p-5 hover:border-[#F59E0B]/40 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-base">Regression Tests</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#FDE68A] border border-[#F59E0B]/30">Protection</span>
                </div>
                <div className="text-xs text-slate-400 leading-relaxed">Saved checks you can re-run anytime to confirm a bug hasn't returned</div>
              </div>
            </div>

            {/* Replay vs Regression Workflows */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#111422] border border-[#262E44] rounded-[14px] p-6 shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded bg-[#38BDF8]/20 border border-[#38BDF8]/40 text-[#38BDF8] flex items-center justify-center text-xs font-bold">↺</span>
                  <h4 className="text-lg font-bold text-white">Replaying a request</h4>
                </div>
                <ol className="space-y-2.5 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
                  <li><strong className="text-white">Open any trace</strong></li>
                  <li>Click <strong className="text-[#38BDF8]">Replay</strong></li>
                  <li>Enter a target base URL (e.g. <code className="text-[#A78BFA] font-mono">http://localhost:3000</code>)</li>
                  <li><strong className="text-white">Compare original vs replay</strong> — status code and duration, side by side</li>
                </ol>
              </div>

              <div className="bg-[#111422] border border-[#262E44] rounded-[14px] p-6 shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] flex items-center justify-center text-xs font-bold">🛡️</span>
                  <h4 className="text-lg font-bold text-white">Saving a regression test</h4>
                </div>
                <ol className="space-y-2.5 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
                  <li><strong className="text-white">Pick a trace</strong> you've fixed</li>
                  <li>Click <strong className="text-[#10B981]">Save as Regression Test</strong>, set the expected status code</li>
                  <li>Click <strong className="text-white">Run anytime</strong> — instant <span className="text-[#10B981] font-bold">PASS</span> or <span className="text-[#F43F5E] font-bold">FAIL</span></li>
                </ol>
              </div>
            </div>
          </div>

          {/* The sketch CLI */}
          <div className="border-t border-[#262E44] pt-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6C47FF]/10 border border-[#6C47FF]/30 text-[#C4B5FD] text-[11px] font-mono mb-3">
              ⚡ CLI Utility
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">The sketch CLI</h3>
            <p className="text-sm text-slate-400 mb-6">
              A command-line tool for quickly testing any endpoint, without Postman or curl.
            </p>

            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setActiveCliTab("port")}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-mono transition-all ${activeCliTab === "port" ? "bg-[#6C47FF] text-white shadow-[0_0_12px_rgba(108,71,255,0.4)]" : "bg-[#111422] text-slate-400 hover:text-white border border-[#262E44]"}`}
              >
                Local testing (Port 5000)
              </button>
              <button
                onClick={() => setActiveCliTab("url")}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-mono transition-all ${activeCliTab === "url" ? "bg-[#6C47FF] text-white shadow-[0_0_12px_rgba(108,71,255,0.4)]" : "bg-[#111422] text-slate-400 hover:text-white border border-[#262E44]"}`}
              >
                Remote testing (Full URL)
              </button>
              <button
                onClick={() => setActiveCliTab("body")}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-mono transition-all ${activeCliTab === "body" ? "bg-[#6C47FF] text-white shadow-[0_0_12px_rgba(108,71,255,0.4)]" : "bg-[#111422] text-slate-400 hover:text-white border border-[#262E44]"}`}
              >
                With Request Body (--body)
              </button>
            </div>

            <div className="rounded-[14px] bg-[#0A0D14] border border-[#262E44] overflow-hidden shadow-2xl mb-4">
              <div className="px-4 py-3 bg-[#161B2B] border-b border-[#262E44] flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                  <span className="text-[#6C47FF]">$</span> terminal demo
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(
                      activeCliTab === "port"
                        ? "sketch post /api/payment 5000"
                        : activeCliTab === "url"
                        ? "sketch post /api/payment http://yourapp.com"
                        : `sketch post /api/payment 5000 --body '{"amount":100}'`,
                      "qs-cli-cmd"
                    )
                  }
                  className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-[#111422] border border-[#262E44] hover:bg-[#1E253A] transition-all font-mono"
                >
                  {copiedCode === "qs-cli-cmd" ? "Copied! ✓" : "Copy Command"}
                </button>
              </div>

              <div className="p-5 font-mono text-xs text-slate-200 leading-relaxed">
                {activeCliTab === "port" && (
                  <div>
                    <div className="text-slate-400 mb-1">// Local testing — pass just the port:</div>
                    <div className="text-white font-bold text-sm mb-3">
                      <span className="text-[#6C47FF]">sketch</span> post /api/payment <span className="text-[#F59E0B]">5000</span>
                    </div>
                    <div className="text-slate-500 pt-2 border-t border-[#1E253A] space-y-1">
                      <div className="text-[#6EE7B7]">✔ Resolved target: http://localhost:5000/api/payment</div>
                      <div className="text-slate-400">Response 200 OK (28ms) • Auth credentials automatically attached</div>
                      <div className="text-slate-300 bg-[#111422] p-2.5 rounded mt-2 border border-[#262E44]">
                        &#123; "success": true, "transaction_id": "tx_8849102" &#125;
                      </div>
                    </div>
                  </div>
                )}

                {activeCliTab === "url" && (
                  <div>
                    <div className="text-slate-400 mb-1">// Remote testing — pass the full URL:</div>
                    <div className="text-white font-bold text-sm mb-3">
                      <span className="text-[#6C47FF]">sketch</span> post /api/payment <span className="text-[#38BDF8]">http://yourapp.com</span>
                    </div>
                    <div className="text-slate-500 pt-2 border-t border-[#1E253A] space-y-1">
                      <div className="text-[#38BDF8]">✔ Executing remote request to http://yourapp.com/api/payment</div>
                      <div className="text-slate-400">Response 200 OK (110ms)</div>
                      <div className="text-slate-300 bg-[#111422] p-2.5 rounded mt-2 border border-[#262E44]">
                        &#123; "status": "processed", "gateway": "remote" &#125;
                      </div>
                    </div>
                  </div>
                )}

                {activeCliTab === "body" && (
                  <div>
                    <div className="text-slate-400 mb-1">// With a request body:</div>
                    <div className="text-white font-bold text-sm mb-3">
                      <span className="text-[#6C47FF]">sketch</span> post /api/payment <span className="text-[#F59E0B]">5000</span> --body <span className="text-[#10B981]">'&#123;"amount":100&#125;'</span>
                    </div>
                    <div className="text-slate-500 pt-2 border-t border-[#1E253A] space-y-1">
                      <div className="text-[#6EE7B7]">✔ Payload parsed & sent (application/json)</div>
                      <div className="text-slate-400">Response 200 OK (34ms)</div>
                      <div className="text-slate-300 bg-[#111422] p-2.5 rounded mt-2 border border-[#262E44]">
                        &#123; "charged": 100, "currency": "USD", "captured": true &#125;
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[10px] bg-[#111422] border border-[#6C47FF]/30 p-3.5 flex items-center gap-3 text-xs text-slate-300">
              <span className="text-[#6C47FF] text-base">🔑</span>
              <span>
                <code className="text-[#C4B5FD] font-mono font-bold">sketch</code> automatically uses your local instance credentials — no extra setup for authenticated calls to your own collector.
              </span>
            </div>
          </div>

          {/* What Gets Captured */}
          <div className="border-t border-[#262E44] pt-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[#6EE7B7] text-[11px] font-mono mb-3">
              🔒 Automated Ingestion & Privacy
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">What Gets Captured</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300 mb-6">
              <div className="bg-[#111422] border border-[#262E44] rounded-[12px] p-4 flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8]" />
                <span><strong className="text-white">HTTP method, path, status code, duration</strong></span>
              </div>
              <div className="bg-[#111422] border border-[#262E44] rounded-[12px] p-4 flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6C47FF]" />
                <span><strong className="text-white">Request headers, body, and query parameters</strong></span>
              </div>
            </div>

            {/* Redaction callout */}
            <div className="rounded-[14px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_70%)] bg-[#111422] border border-[#10B981]/40 p-5 shadow-xl">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] flex items-center justify-center text-sm font-bold shrink-0">
                  🛡️
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">Automatic Sensitive Field Redaction</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Sensitive fields (passwords, tokens, Authorization headers, API keys) are automatically redacted before anything is saved — including nested fields.
                  </p>
                </div>
              </div>
            </div>
          </div>
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
