/**
 * Khôi phục dữ liệu từ file sao lưu (GHI ĐÈ các collection nghiệp vụ hiện có).
 *   npm run restore -- backups/farmtable-....json
 */
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { EJSON } from 'bson';
import { connectDb } from '../src/config/db.js';

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error('Cách dùng: npm run restore -- <file sao lưu .json>');
  process.exit(1);
}
const dump = EJSON.parse(fs.readFileSync(path.resolve(file), 'utf8'), { relaxed: false });
await connectDb();
const db = mongoose.connection.db;
for (const [name, docs] of Object.entries(dump.collections)) {
  await db.collection(name).deleteMany({});
  if (docs.length) await db.collection(name).insertMany(docs);
  console.log(`  ${name}: ${docs.length}`);
}
await db.collection('sessions').deleteMany({}).catch(() => {});
console.log(`Đã khôi phục từ ${file} (bản sao lưu lúc ${dump.createdAt}). Các phiên đăng nhập cũ đã bị xóa.`);
await mongoose.disconnect();
