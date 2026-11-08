import { Router } from 'express';
import * as c from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.get('/csrf', c.csrf);
router.post('/register', c.register);
router.post('/login', c.login);
router.post('/logout', requireAuth, c.logout);
router.get('/me', requireAuth, c.me);
router.patch('/me', requireAuth, c.updateMe);
router.post('/me/password', requireAuth, c.changePassword);

export default router;
