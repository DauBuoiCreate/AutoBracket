# AutoBracket

AutoBracket là nền tảng web quản lý giải thể thao theo kế hoạch khóa trong [`Plan/`](Plan/README.md). Mọi thay đổi phải tuân thủ [`AGENTS.md`](AGENTS.md).

## Yêu cầu môi trường

- Node.js `24.14.1` (xem `.nvmrc`)
- Corepack
- pnpm `11.12.0` (được khóa trong `package.json`)
- Docker Desktop đang chạy (PostgreSQL/Redis local và integration tests)

## Cài đặt sạch

```powershell
corepack enable
corepack prepare pnpm@11.12.0 --activate
corepack pnpm install --frozen-lockfile
Copy-Item .env.example .env
corepack pnpm infra:up
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm infra:ps
```

Không dùng npm, Yarn hoặc Bun và không tạo lockfile khác `pnpm-lock.yaml`. Cả ba process đều nạp file `.env` ở root trước khi validate; biến môi trường đã đặt trong shell có độ ưu tiên cao hơn.

Compose chỉ bind PostgreSQL/Redis vào loopback, mặc định lần lượt ở `55432` và `57379`. `infra:down` dừng stack nhưng giữ named volumes; không thêm `--volumes` nếu cần giữ dữ liệu local.

## Chạy local

```powershell
corepack pnpm dev
```

Các health entrypoint:

- Web shell: <http://localhost:3000>
- Web health page: <http://localhost:3000/health>
- Web health API: <http://localhost:3000/api/health>
- Web readiness API: <http://localhost:3000/api/ready>
- Realtime liveness: <http://localhost:3001/health>
- Realtime readiness: <http://localhost:3001/ready>
- Worker liveness: <http://localhost:3002/health>
- Worker readiness: <http://localhost:3002/ready>

`/health` chỉ kiểm tra process còn sống. `/ready` trả `200` khi dependency bắt buộc sẵn sàng và `503` khi PostgreSQL hoặc Redis không thể truy cập; response không chứa connection string hay stack trace.

Mọi HTTP response của health/readiness có `x-correlation-id`. Web, realtime và worker ghi JSON log có `timestamp`, `level`, `service`, `release`, `event`; secret, credential, token và PII theo key bị redacted.

Sau khi dừng ứng dụng:

```powershell
corepack pnpm infra:down
```

## Staging skeleton bằng Docker

File mẫu chỉ dành cho staging local; production phải cấp secret riêng:

```powershell
Copy-Item infra/docker/staging.env.example .env.staging
corepack pnpm staging:up
corepack pnpm staging:ps
corepack pnpm staging:smoke
corepack pnpm staging:down
```

`STAGING_DATABASE_URL` phải percent-encode ký tự đặc biệt trong user/password và phải khớp với `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`; `staging:up` sẽ từ chối cấu hình sai trước khi dựng stack.

Topology staging build bốn target image: migration one-shot, web standalone, realtime và worker; PostgreSQL/Redis không expose host port. `staging:down` giữ volume. Chỉ dùng `staging:clean` khi chủ động muốn xóa toàn bộ volume staging local.

## Quality gates

```powershell
corepack pnpm guard:plan
corepack pnpm format:check
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test:unit
corepack pnpm test:integration
corepack pnpm test:engine
corepack pnpm exec playwright install chromium
corepack pnpm test:e2e
corepack pnpm verify:ci-negative
corepack pnpm build
corepack pnpm verify:runtime-startup
corepack pnpm audit:prod
```

`verify:ci-negative` chứng minh foreign lockfile và test cố ý đỏ đều làm gate trả exit khác 0.
`verify:runtime-startup` chạy sau build, khởi động artifact web/worker/realtime với fixture env không hợp lệ và yêu cầu mỗi process exit `1` bằng đúng một JSON sanitized. Diagnostic chỉ cho phép tên field và mã Zod (`path/code`), không ghi message, input hoặc value.
`test:e2e` kiểm tra health trên build production chuẩn, rồi tạo một clean copy tạm, chèn template lỗi chỉ vào bản sao đó và chạy Chromium để kiểm tra `error.tsx`/`global-error.tsx`. Bản sao luôn được dọn; source ứng dụng không có route, query hay biến môi trường dùng để kích hoạt lỗi.

Chạy toàn bộ gate local (gồm integration Testcontainers) bằng:

```powershell
corepack pnpm verify
```

Kiểm chứng thêm từ một bản sao sạch, không mang theo `node_modules` hoặc build output:

```powershell
corepack pnpm verify:clean
```

Workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) chạy frozen install, full verify, audit, Playwright và staging smoke trên pull request/push `main`.

## Workspace

```text
apps/web          Next.js App Router và HTTP API/BFF
apps/realtime     Realtime process; P0 có liveness/readiness shell
apps/worker       Background worker; P0 có liveness/readiness shell
packages/domain   Luật thi đấu thuần TypeScript
packages/db       Ranh giới PostgreSQL/Prisma
packages/ui       UI dùng chung
packages/contracts API/event contracts dùng chung
packages/config   Cấu hình, correlation ID và structured logging dùng chung
packages/testkit  Fixtures/builders dùng chung
```

Trạng thái và task được phép triển khai nằm tại [`Plan/PROJECT_STATE.md`](Plan/PROJECT_STATE.md).
