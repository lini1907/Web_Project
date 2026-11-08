# FarmTable · Client (Angular 21)

```bash
npm install
npm start          # http://localhost:4200, proxy /api -> http://localhost:3000 (proxy.conf.json)
npm run build      # dist/client/browser — Express phục vụ bản build này tại http://localhost:3000
```

Cấu trúc `src/app`:

| Thư mục | Nội dung |
|---|---|
| `core/` | models, `api.ts` (ApiError, idempotency), services (auth, catalog, cart, order, vendor, admin, toast), interceptor lỗi, guards |
| `shared/` | product-card, state (loading/empty/error), pagination, qty, countdown, bar-chart, pipes, validators, directive ảnh dự phòng |
| `layout/` | header, footer |
| `features/` | home, catalog (shop, product, farms), rescue, mystery, group-buy, cart/checkout, orders, account, recommend, vendor (lazy), admin (lazy) |

Kỹ thuật theo đề cương: standalone component + signals, property/class/style/event/two-way binding, `@if/@for/@switch`,
component interaction (`input()/output()/model()`), service + HttpClient + xử lý lỗi tập trung, routing (`:slug`, query params,
redirect, wildcard 404, nested routes, lazy loading, guards `canActivate/canMatch`), Template-driven form (checkout) và
Reactive form (đăng nhập, đăng ký, sản phẩm, mua chung) với custom + cross-field validator.
