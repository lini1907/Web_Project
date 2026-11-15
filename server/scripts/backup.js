/**
 * Sao lưu toàn bộ dữ liệu nghiệp vụ ra JSON (Extended JSON giữ đúng ObjectId/Date).
 *   npm run backup            # => server/backups/farmtable-<thời gian>.json
 * Khôi phục: npm run restore -- <đường dẫn file>
 */
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { EJSON } from 'bson';
import { connectDb } from '../src/config/db.js';
import { env } from '../src/config/env.js';

export const COLLECTIONS = ['users', 'farms', 'products', 'mysteryboxes', 'carts', 'orders', 'groupbuys', 'groupbuymemberships', 'events', 'auditlogs', 'counters'];

await connectDb();
const db = mongoose.connection.db;
const dump = { createdAt: new Date().toISOString(), collections: {} };
for (const name of COLLECTIONS) {
  dump.collections[name] = await db.collection(name).find().toArray();
}
const dir = path.resolve(env.root, 'backups');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `farmtable-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(file, EJSON.stringify(dump, { relaxed: false }));
console.log('Đã sao lưu:', file);
for (const [k, v] of Object.entries(dump.collections)) console.log(`  ${k}: ${v.length}`);
await mongoose.disconnect();
