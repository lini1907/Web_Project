import { Router } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { requireRole } from '../../middleware/auth.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';

fs.mkdirSync(env.uploadDir, { recursive: true });

const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const upload = multer({
  storage: multer.diskStorage({
    destination: env.uploadDir,
    // Tên file ngẫu nhiên, không dùng tên người dùng gửi (tránh path traversal / ghi đè).
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ALLOWED[file.mimetype]}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED[file.mimetype]) return cb(new AppError(400, 'VALIDATION_ERROR', 'Chỉ nhận ảnh JPG, PNG hoặc WEBP'));
    return cb(null, true);
  },
});

const router = Router();

router.post('/vendor/uploads', requireRole('vendor'), upload.single('file'), (req, res) => {
  if (!req.file) throw new AppError(400, 'VALIDATION_ERROR', 'Chưa chọn ảnh (field "file")');
  res.status(201).json({ url: `/uploads/${path.basename(req.file.path)}` });
});

export default router;
