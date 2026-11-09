/**
 * Kiểm thử nhóm 3: chatbot (Gemini được giả lập, không gọi Internet) và trang nội dung (công thức, blog).
 */
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { setup, teardown, client, uuid } from './helpers.js';
import { Article, Product } from '../src/models/index.js';
import { setChatClient } from '../src/modules/chatbot/chatbot.service.js';

let app;
before(async () => {
  app = await setup();
});
after(teardown);

async function admin() {
  const c = client(app);
  await c.login('admin@farmtable.vn');
  return c;
}

/** Client Gemini giả: trả lần lượt các phản hồi dựng sẵn, ghi lại request để kiểm tra. */
const callResp = (calls) => ({
  candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: calls.map((c) => ({ functionCall: c })) } }],
  functionCalls: calls,
});
const textResp = (text) => ({ candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text }] } }], text });

function fakeGemini(responses) {
  const calls = [];
  setChatClient({
    models: {
      generateContent: async (params) => {
        calls.push(JSON.parse(JSON.stringify(params)));
        const r = responses.shift();
        if (r instanceof Error) throw r;
        return r;
      },
    },
  });
  return calls;
}
const lastParts = (calls, n) => calls[n].contents.at(-1).parts;

describe('Chatbot tư vấn (Gemini + function calling)', () => {
  test('Gemini gọi hàm tìm sản phẩm => server chạy truy vấn thật, trả câu trả lời kèm thẻ sản phẩm', async () => {
    const calls = fakeGemini([
      callResp([
        { id: 'c1', name: 'search_products', args: { query: 'cam' } },
        { id: 'c2', name: 'get_shop_policies', args: {} },
      ]),
      textResp('Bên mình có Cam sành 25.000đ/kg, đơn từ 200.000đ được miễn ship.'),
    ]);
    const r = await client(app).post('/chatbot/messages', { messages: [{ role: 'user', content: 'Có cam không shop?' }] });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.match(r.body.reply, /Cam sành/);
    assert.ok(r.body.products.length > 0);
    assert.ok(r.body.products.every((p) => p.slug && p.price > 0));
    // Lượt 2: gửi lại phần model + kết quả của CẢ HAI hàm trong một lượt user
    assert.equal(calls.length, 2);
    assert.equal(calls[1].contents.at(-2).role, 'model');
    const parts = lastParts(calls, 1);
    assert.deepEqual(parts.map((x) => x.functionResponse.name), ['search_products', 'get_shop_policies']);
    assert.match(JSON.stringify(parts[1].functionResponse.response), /Phí giao hàng/);
    assert.equal(calls[0].model, 'gemini-2.5-flash');
    assert.equal(calls[0].config.tools[0].functionDeclarations.length, 5);
    assert.match(calls[0].config.systemInstruction, /chưa đăng nhập/);
  });

  test('lịch sử chuyển vai trò assistant -> model; đơn hàng chỉ đọc được của chính người mua', async () => {
    let calls = fakeGemini([callResp([{ id: 'c', name: 'get_my_orders', args: {} }]), textResp('Bạn cần đăng nhập.')]);
    await client(app).post('/chatbot/messages', {
      messages: [
        { role: 'user', content: 'Chào' },
        { role: 'assistant', content: 'Chào bạn!' },
        { role: 'user', content: 'Đơn của tôi đâu?' },
      ],
    });
    assert.deepEqual(calls[0].contents.map((c) => c.role), ['user', 'model', 'user']);
    assert.match(JSON.stringify(lastParts(calls, 1)), /chưa đăng nhập/);

    const b = client(app);
    await b.login('bich.tran@example.com');
    calls = fakeGemini([callResp([{ id: 'c', name: 'get_my_orders', args: {} }]), textResp('Đây là đơn của bạn.')]);
    await b.post('/chatbot/messages', { messages: [{ role: 'user', content: 'Đơn của tôi đâu?' }] });
    assert.ok(Array.isArray(lastParts(calls, 1)[0].functionResponse.response.output.items));
    assert.match(calls[0].config.systemInstruction, /Trần Thị Bích/);
  });

  test('validate hội thoại; bị chặn an toàn => trả lời lịch sự; lỗi mạng => 502', async () => {
    fakeGemini([]);
    const c = client(app);
    assert.equal((await c.post('/chatbot/messages', { messages: [] })).status, 400);
    assert.equal((await c.post('/chatbot/messages', { messages: [{ role: 'assistant', content: 'x' }] })).status, 400);
    assert.equal((await c.post('/chatbot/messages', { messages: [{ role: 'user', content: 'x'.repeat(2001) }] })).status, 400);

    fakeGemini([{ candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }] }]);
    let r = await c.post('/chatbot/messages', { messages: [{ role: 'user', content: 'abc' }] });
    assert.equal(r.status, 200);
    assert.match(r.body.reply, /không thể hỗ trợ/);

    fakeGemini([new Error('fetch failed')]);
    r = await c.post('/chatbot/messages', { messages: [{ role: 'user', content: 'abc' }] });
    assert.equal(r.status, 502);
    assert.equal(r.body.error.code, 'CHATBOT_ERROR');
  });

  test('hàm tìm công thức trả dữ liệu bài viết đã đăng', async () => {
    const calls = fakeGemini([callResp([{ id: 'c', name: 'search_recipes', args: { query: 'trứng' } }]), textResp('Bạn thử món trứng chiên cà chua nhé.')]);
    const r = await client(app).post('/chatbot/messages', { messages: [{ role: 'user', content: 'Nấu gì với trứng?' }] });
    assert.ok(r.body.recipes.some((x) => /trung/.test(x.slug)));
    assert.match(JSON.stringify(lastParts(calls, 1)), /Trứng gà/);
  });
});

describe('Trang nội dung · công thức nấu ăn & blog (CRUD)', () => {
  test('công khai chỉ thấy bài đã đăng; chi tiết công thức có nguyên liệu gắn sản phẩm, đếm lượt xem', async () => {
    const anon = client(app);
    let r = await anon.get('/articles?kind=recipe');
    assert.equal(r.status, 200);
    assert.ok(r.body.total >= 3);
    r = await anon.get('/articles?q=ca chua');
    assert.ok(r.body.data.length >= 1);
    const slug = (await anon.get('/articles?kind=recipe')).body.data[0].slug;
    const d1 = (await anon.get(`/articles/${slug}`)).body;
    assert.ok(d1.recipe.steps.length > 0);
    assert.ok(d1.recipe.ingredients.some((i) => i.product && i.product.price > 0));
    const d2 = (await anon.get(`/articles/${slug}`)).body;
    assert.equal(d2.views, d1.views + 1);
    assert.equal((await anon.get('/articles/khong-co-bai-nay')).status, 404);
  });

  test('admin thêm / sửa / xóa; nháp không hiện công khai; validate; người khác bị chặn', async () => {
    const a = await admin();
    const p = await Product.findOne({ type: 'regular', isActive: true }).lean();
    const body = {
      kind: 'recipe',
      title: 'Rau muống xào tỏi giòn xanh',
      summary: 'Món rau xào quen thuộc',
      status: 'draft',
      tags: ['rau'],
      recipe: { servings: 2, cookMinutes: 10, difficulty: 'easy', ingredients: [{ name: 'Rau muống', amount: '1 bó', productId: String(p._id) }], steps: ['Nhặt rau, rửa sạch', 'Xào lửa lớn với tỏi'] },
    };
    // Công thức thiếu bước => 400; sản phẩm gắn không tồn tại => 400
    assert.equal((await a.post('/admin/articles', { ...body, recipe: { ...body.recipe, steps: [] } })).status, 400);
    assert.equal((await a.post('/admin/articles', { ...body, recipe: { ...body.recipe, ingredients: [{ name: 'X', productId: '0123456789abcdef01234567' }] } })).status, 400);
    let r = await a.post('/admin/articles', body);
    assert.equal(r.status, 201);
    const { id, slug } = r.body;
    assert.equal((await client(app).get(`/articles/${slug}`)).status, 404); // nháp
    r = await a.patch(`/admin/articles/${id}`, { status: 'published', title: 'Rau muống xào tỏi siêu giòn' });
    assert.equal(r.status, 200);
    assert.equal(r.body.slug, 'rau-muong-xao-toi-sieu-gion');
    assert.ok(r.body.publishedAt);
    assert.equal((await client(app).get('/articles/rau-muong-xao-toi-sieu-gion')).status, 200);
    // Blog không mang dữ liệu công thức
    r = await a.post('/admin/articles', { kind: 'blog', title: 'Tin mùa vải thiều 2026', content: 'Nội dung', status: 'published', recipe: body.recipe });
    assert.equal(r.body.recipe, null);
    // Người mua không quản trị được
    const buyer = client(app);
    await buyer.post('/auth/register', { name: 'Buyer B', email: `b-${uuid().slice(0, 6)}@example.com`, password: 'Matkhau123' });
    assert.equal((await buyer.post('/admin/articles', body)).status, 403);
    assert.equal((await buyer.del(`/admin/articles/${id}`)).status, 403);
    assert.equal((await a.del(`/admin/articles/${id}`)).status, 204);
    assert.equal(await Article.countDocuments({ _id: id }), 0);
    const logs = (await a.get('/admin/audit-logs')).body.data.map((l) => l.action);
    assert.ok(logs.includes('article.create') && logs.includes('article.delete'));
  });
});
