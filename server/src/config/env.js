import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function num(name, fallback) {
  const raw = process.env[name];
  const n = raw === undefined || raw === '' ? fallback : Number(raw);
  if (!Number.isFinite(n)) throw new Error(`Biến môi trường ${name} phải là số`);
  return n;
}

export const env = {
  root,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: num('PORT', 3000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/farmtable?replicaSet=rs0',
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-secret-change-me-0123456789',
  sessionMaxAgeMs: num('SESSION_MAX_AGE_HOURS', 8) * 3600 * 1000,
  mlUrl: (process.env.ML_URL || 'http://127.0.0.1:8000').replace(/\/$/, ''),
  mlTimeoutMs: num('ML_TIMEOUT_MS', 1500),
  groupBuyWorkerMs: num('GROUPBUY_WORKER_MS', 60000),
  clientDist: path.resolve(root, process.env.CLIENT_DIST || '../client/dist/client/browser'),
  uploadDir: path.resolve(root, 'uploads'),
  seedPassword: process.env.SEED_DEMO_PASSWORD || 'FarmTable@2026',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
};

if (env.isProd && env.sessionSecret.startsWith('dev-only')) {
  throw new Error('Cần đặt SESSION_SECRET khi chạy production');
}
