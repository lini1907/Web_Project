/**
 * Kênh thông báo thời gian thực bằng Server-Sent Events (SSE).
 *  - Mỗi tab trình duyệt mở 1 kết nối GET /api/v1/realtime/stream (text/event-stream).
 *  - Server giữ kết nối theo userId; khi có thay đổi (đổi trạng thái đơn, thanh toán...)
 *    gọi publish(userId, type, data) để đẩy sự kiện xuống đúng người.
 * Lưu trong bộ nhớ tiến trình: đủ cho 1 máy chủ; chạy nhiều instance thì cần Redis pub/sub.
 */
const clients = new Map(); // userId -> Set<res>
let nextId = 1;

function write(res, type, data) {
  res.write(`id: ${nextId++}\nevent: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function subscribe(userId, res) {
  const key = String(userId);
  if (!clients.has(key)) clients.set(key, new Set());
  clients.get(key).add(res);
  return () => {
    const set = clients.get(key);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) clients.delete(key);
  };
}

/** Gửi sự kiện cho 1 hoặc nhiều người dùng. Không có kết nối nào thì bỏ qua (người dùng xem lại khi tải trang). */
export function publish(userIds, type, data) {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  const payload = { ...data, at: new Date().toISOString() };
  for (const id of new Set(ids.map(String))) {
    for (const res of clients.get(id) || []) {
      try {
        write(res, type, payload);
      } catch {
        /* kết nối đã đóng */
      }
    }
  }
}

export function connectionCount(userId) {
  return userId ? clients.get(String(userId))?.size || 0 : [...clients.values()].reduce((s, x) => s + x.size, 0);
}

/** Express handler mở luồng SSE cho người dùng đang đăng nhập. */
export function streamHandler(req, res) {
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // tắt buffer nếu đặt sau Nginx
  });
  res.flushHeaders();
  res.write('retry: 5000\n\n'); // trình duyệt tự kết nối lại sau 5 giây nếu rớt mạng
  write(res, 'ready', { userId: String(req.user._id), role: req.user.role });
  const unsubscribe = subscribe(req.user._id, res);
  // Gửi comment định kỳ để proxy/trình duyệt không cắt kết nối "im lặng".
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25_000);
  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}
