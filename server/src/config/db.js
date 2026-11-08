import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

export async function connectDb(uri = env.mongoUri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  return mongoose.connection;
}

export function dbState() {
  return mongoose.connection.readyState === 1 ? 'ok' : 'down';
}

/** Chạy hàm trong một MongoDB transaction (tự thử lại khi gặp lỗi tạm thời). */
export async function withTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
