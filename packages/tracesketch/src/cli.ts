#!/usr/bin/env node
import express from 'express';
import path from 'path';
import { startCollector } from './collector';

const args = process.argv.slice(2);

if (args[0] === 'start') {
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
