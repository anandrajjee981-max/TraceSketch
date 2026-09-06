import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConfigProvider } from "./context/ConfigContext";
import { Layout } from "./components/Layout";
import { TracesList } from "./pages/TracesList";
import { TraceDetail } from "./pages/TraceDetail";
import { Settings } from "./pages/Settings";

export default function App() {
  return (
    <ConfigProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<TracesList />} />
            <Route path="/traces/:traceId" element={<TraceDetail />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}
