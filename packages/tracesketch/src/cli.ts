#!/usr/bin/env node
import express from 'express';
import path from 'path';
import { startCollector } from './collector';
import { runSketch } from './sketch-runner';

const args = process.argv.slice(2);

// Robust invocation detection (defense-in-depth).
// Primary fix is separate entry points: dist/cli.js for `tracesketch` and
// dist/sketch.js for `sketch`, so no argv[1] disambiguation is needed.
// The logic below is kept only for backward-compat with 0.0.6 where both
// bins pointed to the same file. It uses path.basename + extension stripping
// + case-insensitive check as requested in the diagnosis steps.
function getInvokedBase(argv1: string | undefined): string {
  return path.basename(argv1 || '').toLowerCase().replace(/\.[^.]+$/, '');
}
const invokedBase = getInvokedBase(process.argv[1]);
const rawBasename = path.basename(process.argv[1] || '').toLowerCase();
const isDirectSketch = invokedBase === 'sketch' || rawBasename === 'sketch.js' || rawBasename === 'sketch.cmd';

if (isDirectSketch) {
  runSketch(args);
} else if (args[0] === 'start') {
  startCollector(); // starts on port 4000, as it already does

  const dashboardApp = express();
  dashboardApp.use(express.static(path.join(__dirname, '../dashboard-dist')));
  dashboardApp.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(__dirname, '../dashboard-dist/index.html'));
  });
  dashboardApp.listen(8470, () => {
    console.log('traceSketch Dashboard: http://localhost:8470');
  });
} else {
  console.log('Usage: npx tracesketch start');
}
