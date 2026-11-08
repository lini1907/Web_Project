import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import morgan from 'morgan';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { loadUser } from './middleware/auth.js';
import { csrfProtection, rejectMongoOperators } from './middleware/security.js';
import { errorHandler, notFoundApi } from './middleware/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import productRoutes from './modules/products/product.routes.js';
import farmRoutes from './modules/farms/farm.routes.js';
import mysteryRoutes from './modules/mystery/mystery.routes.js';
import cartRoutes from './modules/cart/cart.routes.js';
import orderRoutes from './modules/orders/order.routes.js';
import groupBuyRoutes from './modules/group-buys/groupbuy.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import kpiRoutes from './modules/kpi/kpi.routes.js';
import recommendRoutes from './modules/recommendations/recommend.routes.js';
import uploadRoutes from './modules/uploads/upload.routes.js';

/**
 * Tạo Express app. Tách khỏi server.js để test (supertest) dùng lại mà không mở cổng.
 * @param {{ mongoClient?: import('mongodb').MongoClient }} opts
 */
export function createApp({ mongoClient } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https://images.unsplash.com', 'https:'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));
  app.use(express.json({ limit: '200kb' }));

  app.use(
    session({
      name: 'sid',
      secret: env.sessionSecret,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: { httpOnly: true, sameSite: 'lax', secure: env.cookieSecure, maxAge: env.sessionMaxAgeMs },
      store: MongoStore.create({
        client: mongoClient || mongoose.connection.getClient(),
        collectionName: 'sessions',
        ttl: Math.round(env.sessionMaxAgeMs / 1000),
        autoRemove: 'native',
      }),
    }),
  );

  const api = express.Router();
  api.use(rejectMongoOperators);
  api.use(csrfProtection);
  api.use(loadUser);
  api.use('/auth', authRoutes);
  for (const r of [productRoutes, farmRoutes, mysteryRoutes, cartRoutes, orderRoutes, groupBuyRoutes, adminRoutes, kpiRoutes, recommendRoutes, uploadRoutes]) {
    api.use(r);
  }
  api.use(notFoundApi);
  app.use('/api/v1', api);
  app.use('/api', notFoundApi);

  app.use('/uploads', express.static(env.uploadDir, { maxAge: '7d', fallthrough: false }));

  // Khi demo: Express phục vụ luôn bản build Angular (cùng origin => cookie session hoạt động đơn giản).
  if (fs.existsSync(path.join(env.clientDist, 'index.html'))) {
    app.use(express.static(env.clientDist, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/api\/|\/uploads\/).*/, (req, res) => res.sendFile(path.join(env.clientDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
