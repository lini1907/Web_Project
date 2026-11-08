// Khởi động MongoDB replica set 1 node ngay trong máy (không cần cài MongoDB).
// Dữ liệu lưu bền tại server/.data/db nên tắt/mở lại vẫn còn.
// Lần chạy đầu tiên thư viện sẽ tải binary mongod chính thức (~70 MB) từ fastdl.mongodb.org.
// Nếu máy đã có MongoDB (replica set) hoặc dùng Atlas thì KHÔNG cần script này.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const here = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(here, '..', '.data', 'db');
const port = Number(process.env.LOCAL_DB_PORT || 27017);
fs.mkdirSync(dbPath, { recursive: true });

const replSet = await MongoMemoryReplSet.create({
  replSet: { name: 'rs0', count: 1, storageEngine: 'wiredTiger' },
  instanceOpts: [{ port, dbPath }],
});

const uri = `mongodb://127.0.0.1:${port}/farmtable?replicaSet=rs0`;
console.log('MongoDB replica set đang chạy.');
console.log('  MONGODB_URI=' + uri);
console.log('  Dữ liệu: ' + dbPath);
console.log('Nhấn Ctrl+C để dừng.');

async function shutdown() {
  console.log('\nĐang dừng MongoDB...');
  await replSet.stop({ doCleanup: false, force: false });
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
