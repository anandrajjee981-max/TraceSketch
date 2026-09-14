import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConfigProvider } from "./context/ConfigContext";
import { TraceSimulatorProvider } from "./context/TraceSimulatorContext";
import { Layout } from "./components/Layout";
import { TracesList } from "./pages/TracesList";
import { TraceDetail } from "./pages/TraceDetail";
import { ReplaysList } from "./pages/ReplaysList";
import { Settings } from "./pages/Settings";
import { WebsiteLanding } from "./pages/WebsiteLanding";

export default function App() {
  return (
    <ConfigProvider>
      <TraceSimulatorProvider>
        <BrowserRouter>
          <Routes>
            {/* Fullscreen Product Landing / Website View */}
            <Route path="/overview" element={<WebsiteLanding />} />

            {/* Developer Console Dashboard */}
            <Route element={<Layout />}>
              <Route path="/" element={<TracesList />} />
              <Route path="/replays" element={<ReplaysList />} />
              <Route path="/traces/:traceId" element={<TraceDetail />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TraceSimulatorProvider>
    </ConfigProvider>
  );
}
