#!/usr/bin/env node
import { runSketch } from './sketch-runner';

const args = process.argv.slice(2);
runSketch(args);
