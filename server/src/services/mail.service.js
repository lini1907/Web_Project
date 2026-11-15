import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

/**
 * Gửi email qua SMTP (nodemailer).
 *  - Có SMTP_HOST trong .env: gửi thật (Gmail App Password, Mailtrap, Ethereal...).
 *  - Không cấu hình: in nội dung ra console để demo/dev.
 *  - Khi chạy test: chỉ lưu vào hộp thư tạm `outbox` để kiểm thử đọc lại mã OTP.
 */
export const outbox = [];

let transporter = null;
function getTransporter() {
  if (!env.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
}

export async function sendMail({ to, subject, text, html }) {
  const msg = { from: env.smtp.from, to, subject, text, html };
  if (env.isTest) {
    outbox.push(msg);
    return { queued: true };
  }
  const t = getTransporter();
  if (!t) {
    console.log(`[mail] (chưa cấu hình SMTP, chỉ in ra console)\n  To: ${to}\n  Subject: ${subject}\n  ${text}`);
    return { queued: false };
  }
  await t.sendMail(msg);
  return { queued: true };
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function sendResetOtp({ to, name, otp, minutes }) {
  const text = `Xin chào ${name},\n\nMã đặt lại mật khẩu FarmTable của bạn là: ${otp}\nMã có hiệu lực trong ${minutes} phút. Không chia sẻ mã này cho bất kỳ ai.\n\nNếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.`;
  const html = `<p>Xin chào ${escapeHtml(name)},</p>
<p>Mã đặt lại mật khẩu FarmTable của bạn là:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px">${otp}</p>
<p>Mã có hiệu lực trong ${minutes} phút. Không chia sẻ mã này cho bất kỳ ai.</p>
<p style="color:#666">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>`;
  return sendMail({ to, subject: 'FarmTable - Mã đặt lại mật khẩu', text, html });
}
