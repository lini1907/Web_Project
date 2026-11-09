import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { createApp } from './app.js';
import { startWorker, stopWorker } from './modules/group-buys/groupbuy.service.js';

async function main() {
  try {
    await connectDb();
  } catch (err) {
    console.error(`Không kết nối được MongoDB (${env.mongoUri}).`);
    console.error('Gợi ý: chạy "npm run db" ở thư mục server để bật MongoDB cục bộ, hoặc sửa MONGODB_URI trong .env');
    console.error(err.message);
    process.exit(1);
  }
  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`FarmTable API chạy tại http://localhost:${env.port}/api/v1 (health: /api/v1/health)`);
  });
  startWorker();

  const shutdown = async () => {
    stopWorker();
    server.close();
    const { default: mongoose } = await import('mongoose');
    await mongoose.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
