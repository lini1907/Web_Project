/**
 * Đo thời gian phản hồi API cốt lõi trên bộ seed (AC09): mỗi endpoint gọi N lần tuần tự,
 * báo p50/p95/max/lỗi và ghi số đo thô ra backups/bench-<thời gian>.json.
 *   npm run bench                 # mặc định http://localhost:3000, 30 lần/endpoint
 *   BENCH_URL=... BENCH_N=50 npm run bench
 * Đây là đo độ trễ tuần tự trên một máy, KHÔNG phải kiểm thử tải.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = (process.env.BENCH_URL || 'http://localhost:3000').replace(/\/$/, '') + '/api/v1';
const N = Number(process.env.BENCH_N || 30);
const here = path.dirname(fileURLToPath(import.meta.url));

function pct(arr, q) {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.round(q * (s.length - 1)))];
}

async function timed(url, init) {
  const t0 = performance.now();
  try {
    const res = await fetch(url, init);
    await res.arrayBuffer();
    return { ms: performance.now() - t0, ok: res.ok, status: res.status };
  } catch {
    return { ms: performance.now() - t0, ok: false, status: 0 };
  }
}

const first = await (await fetch(`${BASE}/products?limit=1&sort=popular`)).json();
const product = first.data[0];
const gb = (await (await fetch(`${BASE}/group-buys`)).json())[0];

const endpoints = [
  ['GET /health', `${BASE}/health`],
  ['GET /products (trang 1)', `${BASE}/products?limit=12`],
  ['GET /products?q=ca chua', `${BASE}/products?q=${encodeURIComponent('ca chua')}`],
  ['GET /products/:slug', `${BASE}/products/${product.slug}`],
  ['GET /rescue', `${BASE}/rescue`],
  ['GET /mystery-boxes', `${BASE}/mystery-boxes`],
  ['GET /group-buys', `${BASE}/group-buys`],
  ...(gb ? [['GET /group-buys/:id', `${BASE}/group-buys/${gb.id}`]] : []),
  ['GET /farms', `${BASE}/farms`],
  ['GET /recommendations/similar/:id', `${BASE}/recommendations/similar/${product.id}`],
];

const results = [];
for (const [name, url] of endpoints) {
  await timed(url); // khởi động (không tính)
  const samples = [];
  for (let i = 0; i < N; i += 1) samples.push(await timed(url));
  const ms = samples.map((s) => s.ms);
  results.push({
    endpoint: name,
    n: N,
    errors: samples.filter((s) => !s.ok).length,
    p50: +pct(ms, 0.5).toFixed(1),
    p95: +pct(ms, 0.95).toFixed(1),
    max: +Math.max(...ms).toFixed(1),
    raw: ms.map((x) => +x.toFixed(1)),
  });
}

const env = { date: new Date().toISOString(), base: BASE, node: process.version, cpu: os.cpus()[0]?.model, cores: os.cpus().length, ramGB: Math.round(os.totalmem() / 1e9) };
console.log('Môi trường:', env);
console.table(results.map(({ raw, ...r }) => ({ ...r, 'p95<1s': r.p95 < 1000 ? 'Đạt' : 'Không' })));
const outDir = path.resolve(here, '..', 'backups');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `bench-${Date.now()}.json`);
fs.writeFileSync(out, JSON.stringify({ env, results }, null, 2));
console.log('Đã ghi số đo thô:', out);
