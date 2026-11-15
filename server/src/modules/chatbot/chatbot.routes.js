import { Router } from 'express';
import { parse, v } from '../../utils/validate.js';
import { Errors } from '../../utils/AppError.js';
import { rateLimit } from '../../middleware/security.js';
import { chat, chatbotEnabled } from './chatbot.service.js';

const router = Router();

// Mỗi tin nhắn tốn chi phí gọi model => giới hạn 15 tin/phút cho mỗi người dùng/IP.
const chatLimit = rateLimit({
  name: 'chatbot',
  windowMs: 60_000,
  max: 15,
  key: (req) => (req.user ? `u:${req.user._id}` : `ip:${req.ip}`),
  message: 'Bạn nhắn hơi nhanh, đợi một chút rồi hỏi tiếp nhé.',
});

router.get('/chatbot/status', (req, res) => {
  res.json({ enabled: chatbotEnabled() });
});

/** Lịch sử hội thoại do trình duyệt giữ và gửi lên mỗi lượt (server không lưu nội dung chat). */
router.post('/chatbot/messages', chatLimit, async (req, res) => {
  const { messages } = parse(
    {
      messages: v.array(v.object({ role: v.enum(['user', 'assistant']), content: v.string({ min: 1, max: 2000 }) }), { min: 1, max: 20 }),
    },
    req.body,
  );
  if (messages[0].role !== 'user' || messages.at(-1).role !== 'user' || messages.some((m, i) => i > 0 && m.role === messages[i - 1].role)) {
    throw Errors.validation([{ field: 'messages', message: 'Hội thoại phải xen kẽ người dùng / trợ lý, bắt đầu và kết thúc bằng tin của người dùng' }]);
  }
  res.json(await chat(messages, req.user));
});

export default router;
