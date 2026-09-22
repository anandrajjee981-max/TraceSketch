import express from 'express';
import path from 'path';
import { startCollector } from './collector';

console.log('[Dev Mode] Starting traceSketch collector & dashboard with auto-reload...');

// Starts collector API (port 4000)
startCollector();

// Serves dashboard statically (port 8470)
const dashboardApp = express();
const dashboardDistPath = path.join(__dirname, '../dashboard-dist');

dashboardApp.use(express.static(dashboardDistPath));
dashboardApp.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(dashboardDistPath, 'index.html'));
});

const DASHBOARD_PORT = Number(process.env.DASHBOARD_PORT ?? 8470);
dashboardApp.listen(DASHBOARD_PORT, () => {
  console.log(`[Dev Mode] traceSketch Dashboard: http://localhost:${DASHBOARD_PORT}`);
});
