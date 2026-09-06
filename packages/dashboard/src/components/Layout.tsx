import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-page)" }}>
      <TopNav />
      <div className="flex flex-1 min-h-0">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
        <main className="flex-1 min-w-0 px-5 sm:px-7 py-5 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
