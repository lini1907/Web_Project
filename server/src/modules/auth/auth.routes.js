import { Router } from 'express';
import * as c from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { limits } from '../../middleware/security.js';

const router = Router();

router.get('/csrf', c.csrf);
router.post('/register', limits.register, c.register);
router.post('/login', c.login);
router.post('/logout', requireAuth, c.logout);
router.get('/remembered', c.remembered);
router.delete('/remembered', c.forgetRemembered);
router.get('/me', requireAuth, c.me);
router.patch('/me', requireAuth, c.updateMe);
router.post('/me/password', requireAuth, c.changePassword);
router.get('/providers', c.providers);
router.get('/google', c.googleStart);
router.get('/google/callback', c.googleCallback);
router.post('/forgot-password', limits.forgotPassword, c.forgotPassword);
router.post('/reset-password', limits.resetPassword, c.resetPassword);

export default router;
