# Docker infrastructure

`compose.dev.yml` chạy PostgreSQL/Redis cho development. `compose.staging.yml` cùng `Dockerfile` dựng topology staging đầy đủ.

Từ root repository:

```powershell
corepack pnpm infra:up
corepack pnpm infra:ps
corepack pnpm infra:down
```

Mặc định service chỉ bind loopback ở `55432` và `57379` để không xung đột PostgreSQL/Redis đã có trên máy. Có thể đổi bằng root `.env`; dữ liệu được giữ trong named volumes khi chạy `infra:down`.

## Staging local

```powershell
Copy-Item infra/docker/staging.env.example .env.staging
corepack pnpm staging:up
corepack pnpm staging:smoke
corepack pnpm staging:ps
corepack pnpm staging:down
```

- `migrate` chạy `prisma migrate deploy` rồi seed idempotent trước khi app start.
- `web` dùng Next standalone artifact; `worker`/`realtime` dùng production artifact từ `pnpm deploy`.
- PostgreSQL/Redis chỉ nằm trên Docker network; ba health port bind loopback `3100..3102` cho smoke/reverse proxy local.
- File example chứa credential local không dùng cho production. Production phải inject secret, TLS/reverse proxy và backup policy riêng.
- `staging:down` giữ named volumes; `staging:clean` xóa volumes và chỉ dùng cho dữ liệu staging disposable.
