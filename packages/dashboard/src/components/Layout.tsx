import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { CommandPalette } from "./CommandPalette";

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-page)", color: "var(--text-primary)" }}>
      <TopNav onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
      <div className="flex flex-1 min-h-0">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
        <main className="flex-1 min-w-0 px-4 sm:px-8 py-6 overflow-auto">
          {/* Keyed by pathname so each navigation replays the route transition. */}
          <div key={location.pathname} className="ts-route">
            <Outlet />
          </div>
        </main>
      </div>
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </div>
  );
}
