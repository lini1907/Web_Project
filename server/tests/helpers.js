import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.ML_URL = 'http://127.0.0.1:9'; // cổng đóng => mô phỏng dịch vụ ML tắt
process.env.ML_TIMEOUT_MS = '300';
process.env.GROUPBUY_WORKER_MS = '0';

export const PASSWORD = process.env.SEED_DEMO_PASSWORD || 'FarmTable@2026';

let replSet;
export async function setup() {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri('farmtable_test'));
  const { createApp } = await import('../src/app.js');
  const { runSeed } = await import('../src/seed/seed.js');
  await runSeed({ reset: true });
  return createApp();
}

export async function teardown() {
  await mongoose.disconnect();
  if (replSet) await replSet.stop();
}

/** Client giữ cookie (session + XSRF) như một trình duyệt. */
export function client(app) {
  const agent = request.agent(app);
  let xsrf = '';
  const capture = (res) => {
    for (const c of res.headers['set-cookie'] || []) {
      const m = /^XSRF-TOKEN=([^;]*)/.exec(c);
      if (m) xsrf = decodeURIComponent(m[1]);
    }
    return res;
  };
  const write = (method) => async (url, body, headers = {}) => {
    if (!xsrf) capture(await agent.get('/api/v1/auth/csrf'));
    let req = agent[method](`/api/v1${url}`).set('X-XSRF-TOKEN', xsrf);
    for (const [k, v] of Object.entries(headers)) req = req.set(k, v);
    return capture(await (body !== undefined ? req.send(body) : req));
  };
  return {
    agent,
    get: async (url) => capture(await agent.get(`/api/v1${url}`)),
    post: write('post'),
    patch: write('patch'),
    put: write('put'),
    del: write('delete'),
    async login(email, password = PASSWORD) {
      const res = await this.post('/auth/login', { email, password });
      if (res.status !== 200) throw new Error(`login ${email} failed: ${res.status} ${JSON.stringify(res.body)}`);
      return res.body;
    },
    rawXsrf: () => xsrf,
  };
}

export const uuid = () => crypto.randomUUID();
