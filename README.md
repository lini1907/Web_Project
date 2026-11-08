# FarmTable v2 — Sàn nông sản full-stack

Đồ án môn **Phát triển Web kinh doanh nâng cao (BIE5061)**. Nâng cấp bản HTML/CSS/JS cũ (thư mục `FarmTable/`, giữ nguyên để đối chiếu) thành ứng dụng:

| Phần | Công nghệ | Thư mục |
|---|---|---|
| Frontend | Angular 21 (standalone, signals, Router, HttpClient, Reactive + Template-driven Forms) | `client/` |
| Backend | Node.js + Express 5 + Mongoose, session cookie HttpOnly lưu MongoDB, CSRF | `server/` |
| Database | MongoDB replica set (bắt buộc để dùng transaction) | — |
| Máy học | Python + scikit-learn (TF-IDF + cosine) + FastAPI | `ml/` |

Ba vai trò: **người mua**, **nhà bán** (cần admin duyệt), **quản trị viên**. Ba tính năng đặc trưng có logic thật ở server:
**Giải cứu nông sản** (giá giảm 30–50% do server tính, có hạn bán), **Mystery Box** (ẩn thành phần, trừ kho nguyên liệu trong transaction),
**Mua chung** (cam kết + giữ chỗ; đạt ngưỡng tự sinh đơn COD đúng một lần, không đạt thì trả giữ chỗ).

## Chạy trên máy mới

Yêu cầu: Node.js ≥ 20, Python ≥ 3.10. Không cần cài MongoDB (có script bật replica set cục bộ).

```bash
# 1) Backend
cd server
npm install
cp .env.example .env          # Windows: copy .env.example .env
npm run db                    # cửa sổ 1: MongoDB replica set cục bộ (lần đầu tải mongod ~70MB), dữ liệu ở server/.data/db
npm run seed -- --reset       # cửa sổ 2: nạp dữ liệu demo từ FarmTable/XML+Json, xuất ml/data/catalog.json
npm run dev                   # API http://localhost:3000/api/v1  (health: /api/v1/health)

# 2) Dịch vụ gợi ý
cd ../ml
pip install -r requirements.txt
python train.py               # huấn luyện từ catalog
python -m uvicorn service:app --port 8000

# 3) Frontend
cd ../client
npm install
npm start                     # http://localhost:4200 (proxy /api sang :3000)
# hoặc demo 1 cổng: npm run build rồi mở http://localhost:3000 (Express phục vụ bản build)
```

Đã có MongoDB/Atlas: bỏ bước `npm run db`, sửa `MONGODB_URI` trong `server/.env` (phải là replica set/Atlas).

**Tài khoản demo** (mật khẩu chung = `SEED_DEMO_PASSWORD` trong `server/.env`):
`bich.tran@example.com` (người mua) · `dalatxanh@farmtable.vn` (nhà bán đã duyệt) · `tamdao@farmtable.vn` (nhà bán chờ duyệt) · `admin@farmtable.vn` (quản trị).

## Kiểm thử và số đo

```bash
cd server && npm test          # 29 ca API: phân quyền, CSRF, giao dịch đồng thời, Rescue, Mystery, Group Buy, ML fallback, KPI
cd server && npm run bench     # p50/p95 30 lần/endpoint, ghi số đo thô ra server/backups/
cd ml && python evaluate.py    # Precision@5, Recall@5, nDCG@5, coverage, độ trễ: mô hình vs phương pháp cơ sở
cd server && npm run backup    # sao lưu; khôi phục: npm run restore -- backups/<file>.json
```

Kết quả đánh giá gợi ý (35 sản phẩm, 26 truy vấn có nhãn độc lập — `ml/eval/labels.json`):

| Phương pháp | Precision@5 | Recall@5 | nDCG@5 | Coverage |
|---|---|---|---|---|
| Cơ sở: cùng danh mục + bán chạy | 0.246 | 0.504 | 0.396 | 57% |
| TF-IDF tên + mô tả | 0.269 | 0.617 | 0.584 | 100% |
| **TF-IDF đầy đủ đặc trưng (mô hình dùng)** | **0.392** | **0.824** | **0.747** | **100%** |

Giới hạn: catalog nhỏ (35 sản phẩm), nhãn do nhóm gán; Precision@5 có trần < 1 vì mỗi truy vấn chỉ có 1–5 sản phẩm liên quan.
Dịch vụ ML tắt hoặc chậm hơn 1,5 s ⇒ API tự trả phương pháp cơ sở và ghi rõ `source: "fallback"`.

## Cấu trúc

```
server/src/  app.js · server.js · config/ · middleware/ (auth, CSRF, lỗi) · models/ · modules/<auth|products|farms|cart|orders|mystery|group-buys|admin|kpi|recommendations|uploads> · seed/
server/tests/  api.test.js (node:test + supertest + MongoDB replica set trong bộ nhớ)
client/src/app/  core/ · shared/ · layout/ · features/
ml/  recommender.py · train.py · service.py · evaluate.py · eval/labels.json
```
