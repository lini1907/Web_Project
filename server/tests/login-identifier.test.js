/**
 * Đăng nhập bằng email HOẶC số điện thoại (field "identifier"), vẫn tương thích field "email" cũ.
 */
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { setup, teardown, client, uuid, PASSWORD } from './helpers.js';
import { User } from '../src/models/index.js';

let app;
before(async () => {
  app = await setup();
});
after(teardown);

describe('Đăng nhập bằng email hoặc số điện thoại', () => {
  test('số điện thoại (0..., +84..., có khoảng trắng) và email đều đăng nhập được', async () => {
    for (const identifier of ['0901234567', '+84901234567', '090 123 4567', 'BICH.TRAN@example.com']) {
      const c = client(app);
      const r = await c.post('/auth/login', { identifier, password: PASSWORD });
      assert.equal(r.status, 200, `${identifier}: ${JSON.stringify(r.body)}`);
      assert.equal(r.body.email, 'bich.tran@example.com');
      assert.equal((await c.get('/auth/me')).body.role, 'buyer');
    }
    // Field cũ "email" vẫn dùng được.
    assert.equal((await client(app).post('/auth/login', { email: 'admin@farmtable.vn', password: PASSWORD })).status, 200);
  });

  test('sai mật khẩu (qua SĐT hoặc email) => 401 với thông báo chung', async () => {
    for (const identifier of ['0901234567', 'bich.tran@example.com', '0999999999']) {
      const r = await client(app).post('/auth/login', { identifier, password: 'SaiMatKhau123' });
      assert.equal(r.status, 401);
      assert.equal(r.body.error.code, 'INVALID_CREDENTIALS');
      assert.equal(r.body.error.message, 'Tài khoản hoặc mật khẩu không đúng');
    }
  });

  test('định danh sai định dạng => 400', async () => {
    for (const identifier of ['abc', '12345', 'a@b']) {
      const r = await client(app).post('/auth/login', { identifier, password: PASSWORD });
      assert.equal(r.status, 400, identifier);
    }
    assert.equal((await client(app).post('/auth/login', { password: PASSWORD })).status, 400);
    // Field "email" chỉ nhận email.
    assert.equal((await client(app).post('/auth/login', { email: '0901234567', password: PASSWORD })).status, 400);
  });

  test('số điện thoại là duy nhất: seed không trùng, đăng ký / cập nhật số đã dùng => 409', async () => {
    const dup = await User.aggregate([
      { $match: { phone: { $type: 'string', $gt: '' } } },
      { $group: { _id: '$phone', n: { $sum: 1 } } },
      { $match: { n: { $gt: 1 } } },
    ]);
    assert.deepEqual(dup, []);

    const c = client(app);
    const email = `p-${uuid().slice(0, 8)}@example.com`;
    let r = await c.post('/auth/register', { name: 'Trùng Số', email, password: 'Matkhau123', phone: '+84 901 234 567' });
    assert.equal(r.status, 409);
    assert.equal(r.body.error.code, 'PHONE_TAKEN');

    r = await c.post('/auth/register', { name: 'Số Mới', email, password: 'Matkhau123', phone: '+84 988 111 222' });
    assert.equal(r.status, 201);
    assert.equal(r.body.phone, '0988111222', 'lưu dạng chuẩn hóa');
    assert.equal((await c.patch('/auth/me', { phone: '0901234567' })).status, 409);
    assert.equal((await c.patch('/auth/me', { phone: '0988111222' })).status, 200, 'giữ nguyên số của chính mình');

    const again = client(app);
    assert.equal((await again.post('/auth/login', { identifier: '0988111222', password: 'Matkhau123' })).status, 200);
  });
});
