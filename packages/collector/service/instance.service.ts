import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { db } from '../config/db';
const CONFIG_DIR = path.join(os.homedir(), '.tracesketch', 'config');
const INSTANCE_FILE = path.join(CONFIG_DIR, 'instance.json');

interface InstanceConfig {
  instance_id: string;
  secret: string;
}

function readInstanceFile(): InstanceConfig | null {
  if (!fs.existsSync(INSTANCE_FILE)) {
    return null;
  }
  const raw = fs.readFileSync(INSTANCE_FILE, 'utf-8');
  return JSON.parse(raw) as InstanceConfig;
}

function writeInstanceFile(data: InstanceConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(INSTANCE_FILE, JSON.stringify(data, null, 2));
}

function createNewInstance(): InstanceConfig {
  const instanceId = "TS_" + crypto.randomUUID().replace(/-/g, '').toUpperCase();
  const secret = crypto.randomUUID();
  const secretHash = crypto.createHash('sha256').update(secret).digest('hex');

  const sql = `INSERT INTO instances (instance_id, secret_hash, created_at) VALUES (?, ?, ?)`;
  db.prepare(sql).run(instanceId, secretHash, Date.now());

  const config: InstanceConfig = { instance_id: instanceId, secret };
  writeInstanceFile(config);

  return config;
}

export function getOrCreateInstance(): InstanceConfig {
  const existing = readInstanceFile();
  if (existing) {
    return existing;
  }
  return createNewInstance();
}