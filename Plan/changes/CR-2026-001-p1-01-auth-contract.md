# CR-2026-001 - Khóa contract bảo mật và API cho P1-01

- Trạng thái: `PROPOSED`
- Người đề xuất: Codex (AI)
- Người phê duyệt: _(để trống; AI không tự điền)_
- Ngày đề xuất: 2026-07-14
- Target phase/release: `P1-01`
- Quyết định/requirement bị ảnh hưởng: `D-006`, `D-010`, `D-022`, `D-024`, `REQ-ACC-01..05`, `P1-001..007`, `OQ-06`, `E2E-01`

## Vấn đề và bằng chứng

Gate P0 đã được chủ dự án chấp nhận và `P1-01` đã được mở, nhưng baseline mới khóa outcome và các endpoint định hướng. Các chi tiết dưới đây ảnh hưởng trực tiếp đến public API, schema, privacy hoặc security control nên AI không được tự chọn trong code:

- Chưa có payload cho logout current/all, session revoke handle và auth error mapping.
- Chưa khóa policy login khi email chưa xác minh, cách đổi email và cách lưu bằng chứng chấp nhận điều khoản.
- Chưa khóa TTL, cookie/session policy, Argon2id parameters, token format, rate-limit và trusted proxy policy.
- `P1-005` yêu cầu revoke có hiệu lực với socket trong khi Socket.IO được xếp ở `P4-04`.
- `P1-001` gộp grant với identity schema trong khi grant/entitlement thuộc `P1-02`.
- `OQ-06` yêu cầu chốt hướng email trước staging P1-01; hiện worker chưa có outbox/BullMQ/email adapter.

Bằng chứng nằm trong `08-DELIVERY-ROADMAP.md` §P1-01/P1-02/P4-04, `09-MASTER-CHECKLIST.md` mục `P1-001..007`, `06-SECURITY-ROLES-VIP.md` §3, `07-API-REALTIME-INTEGRATIONS.md` §1/§2/§7 và `15-RISKS-OPEN-QUESTIONS.md` mục `OQ-06`.

## Baseline hiện tại

- `D-010` khóa email/password Argon2id, email verification và DB session cookie `HttpOnly/Secure/SameSite`; OAuth deferred.
- Schema P0 đã có `User`, `PasswordCredential`, `Session` lưu `id_hash` và `VerificationToken` dùng chung cho verification/reset.
- API inventory khóa namespace `/api/v1` và danh sách endpoint nhưng chưa khóa request/response chi tiết.
- Command flow yêu cầu ghi transaction/audit/outbox trước khi worker thực hiện side effect; không gửi email trước commit.
- Redis phục vụ cache/queue/rate-limit nhưng không là nguồn chuẩn của session.
- Chưa có provider email được duyệt; default hiện tại chỉ cho phép adapter + local fake/mail sandbox.

## Thay đổi đề xuất

### 1. Chính sách account, verification và profile

- Register yêu cầu `displayName`, `email`, password hợp lệ và `acceptTerms: true`; client không được tự chọn terms version.
- Server lưu `termsAcceptedAt` và `termsVersion="draft-2026-07-14"` trên `User`, đồng thời ghi audit `AUTH_TERMS_ACCEPTED`. Đây chỉ là version kỹ thuật pre-release; legal content/go-live approval vẫn thuộc P6.
- Register với email đã tồn tại trả cùng response `202` như request hợp lệ và không tạo account/token mới; không enumerate account.
- User đăng ký mới không được login trước khi verify. Chỉ sau khi password đúng mới được trả `EMAIL_VERIFICATION_REQUIRED`; email không tồn tại/password sai luôn trả `INVALID_CREDENTIALS`.
- `LOCKED`, `SUSPENDED`, `DELETION_PENDING` trả `ACCOUNT_UNAVAILABLE` chỉ sau khi password đúng; không tạo session.
- Đổi email yêu cầu session hợp lệ + current password. Server thay email ngay, đặt `emailVerifiedAt=null`, revoke các session khác, rotate session hiện tại và phát verification token mới. Session mới chỉ được dùng cho `/me`, session/security, logout và verification; tournament command về sau phải yêu cầu verified user.
- Đổi `displayName` hoặc `defaultTimezone` không làm mất verification.

### 2. Session và cookie

- Raw session token: 32 random bytes; DB chỉ lưu SHA-256 hash.
- Bổ sung `public_id UUID UNIQUE` cho session; API chỉ expose UUID này, không expose token hash.
- Absolute TTL 30 ngày; idle TTL 7 ngày; cập nhật `last_seen_at` tối đa một lần mỗi 5 phút.
- Cookie tên `autobracket_session`, `HttpOnly`, `SameSite=Lax`, `Path=/`, không `Domain`, `Max-Age` theo absolute TTL.
- `Secure=true` bắt buộc ở non-loopback production. Chỉ local/test hoặc local staging loopback mới được cấu hình `Secure=false`.
- Login luôn tạo session mới và revoke session cookie cũ nếu có. Password change revoke mọi session cũ rồi tạo session mới. Password reset revoke mọi session và không tự login.
- `POST /api/v1/auth/logout` nhận `{ "scope": "current" | "all" }`; thiếu `scope` mặc định `current`, thành công trả `204` và clear cookie hiện tại.
- Logout không có cookie hoặc cookie đã vô hiệu vẫn trả `204` để client có thể dọn trạng thái an toàn.
- `GET /api/v1/me/sessions` trả safe device summary, created/lastSeen/expires/current; `DELETE /api/v1/me/sessions/:publicId` trả `204`, idempotent cho session thuộc user. Session không tồn tại hoặc thuộc user khác cùng trả `404 NOT_FOUND` để không lộ ownership.

### 3. Token verification/reset

- Token email/reset có public form `base64url(tokenId).base64url(HMAC-SHA256)`; `tokenId` là UUID ngẫu nhiên và HMAC dùng auth token secret riêng.
- DB chỉ lưu SHA-256 của toàn token, purpose, email/user, expiry, used/attempts; outbox/queue chỉ mang token record ID, không mang raw token.
- Worker có thể tái tạo link từ token ID + secret sau commit. Token single-use atomic; expired/reused/wrong-purpose đều trả `TOKEN_INVALID_OR_EXPIRED` mà không phân biệt.
- Verification TTL 24 giờ; reset TTL 60 phút; token cũ cùng purpose bị vô hiệu khi phát token mới.

### 4. Password/Argon2id

- Password dài 12-128 ký tự, chấp nhận passphrase, reject danh sách common password cục bộ; không gửi raw password ra provider.
- Dùng `node:crypto` Argon2id của Node `24.14.1`, không thêm thư viện hashing khi platform đã có API.
- Hash tự mô tả version/parameters; policy ban đầu: salt 16 byte, tag 32 byte, memory 65.536 KiB, passes 3, parallelism 4. Login rehash khi hash dùng policy thấp hơn.
- Prototype trên máy phát triển với Node `24.14.1`, 5 lần chạy tuần tự cho kết quả 274-335 ms, median 303 ms. API hiện được Node đánh dấu experimental nên patch Node tiếp tục phải khóa và có regression test.
- Benchmark CI/staging thực tế được ghi trong handoff; nếu p95 vượt 750 ms trên môi trường chuẩn thì tạo CR điều chỉnh, không tự giảm security parameter.
- Năm lần password sai liên tiếp khóa credential 15 phút; login rate-limit vẫn áp dụng độc lập.

### 5. Rate limit, CSRF và request trust

- Redis fixed-window atomic; key dùng HMAC account/IP prefix, không chứa email/IP thô; Redis lỗi thì auth mutation fail closed với `SERVICE_UNAVAILABLE`.
- Register: 5 request/15 phút/IP prefix.
- Login: 5 request/15 phút/account và 20 request/15 phút/IP prefix.
- Resend/forgot: 3 request/60 phút/account và 10 request/60 phút/IP prefix.
- Verify/reset: 10 request/15 phút/token scope và 20 request/15 phút/IP prefix.
- Response `429 RATE_LIMITED` có `Retry-After`, không trả internal key/counter.
- Mọi `POST/PATCH/DELETE` auth dùng JSON, giới hạn body 32 KiB, bắt buộc `Origin` khớp `APP_URL` hoặc `PUBLIC_URL`; CORS deny-by-default. Cookie `SameSite` không thay CSRF check.
- Chỉ tin `X-Forwarded-For` khi `TRUST_PROXY_HOPS=1`; mặc định local là `0`. Chỉ lưu HMAC của prefix IPv4 `/24` hoặc IPv6 `/56`.

### 6. Error/status contract

- `202`: register/resend/forgot response chống enumeration.
- `204`: logout/session revoke.
- `400 TOKEN_INVALID_OR_EXPIRED`; `401 AUTH_REQUIRED`/`INVALID_CREDENTIALS`; `403 EMAIL_VERIFICATION_REQUIRED`/`ACCOUNT_UNAVAILABLE`/`FORBIDDEN`; `409 CONFLICT`; `422 VALIDATION_FAILED`; `429 RATE_LIMITED`; `503 SERVICE_UNAVAILABLE`.
- Mọi lỗi dùng envelope chuẩn có stable code, message tiếng Việt an toàn, `details` allowlist và correlation ID; private response luôn `Cache-Control: no-store`.

### 7. Email/outbox/worker

- P1-01 thêm minimal `AuditLog` và `OutboxEvent` đúng data model; auth transaction ghi state + audit + email intent atomically.
- Worker dùng BullMQ đã khóa bởi `D-006`: dispatcher chuyển outbox intent thành `email.transactional`; consumer gửi template versioned sau commit.
- Local/CI dùng file-mailbox adapter trong thư mục gitignored, không log recipient/token/link. Production path là generic HTTPS adapter với secret header; không khóa vendor.
- Local staging có thể smoke bằng file adapter, nhưng không được claim real-email staging. Trước UAT/staging có người dùng thật, owner phải cung cấp endpoint/provider hoặc duyệt CR provider riêng.

### 8. Làm rõ ranh giới checklist/phase

- `P1-001`: P1-01 triển khai user/credential/session/token + audit/outbox. Phần grant vẫn thuộc `P1-02`; `P1-001` chỉ được tick khi grant migration/test hoàn tất ở P1-02 hoặc checklist được tách bằng CR khác.
- `P1-005`: P1-01 chứng minh revoked/expired session bị shared DB session resolver và HTTP API từ chối ngay. Socket.IO handshake/disconnect test không được kéo vào P1; bằng chứng socket nằm tại `P4-020/P4-021` trong `P4-04`.
- Không mở entitlement, tournament, Socket.IO room hoặc feature của P1-02+ trong P1-01.

## Các phương án đã cân nhắc

1. **Giữ nguyên và để AI tự chọn khi code:** bị loại vì vi phạm luật không tự quyết schema/API/security.
2. **Phương án đề xuất:** khóa một contract đầy đủ, giữ DB session/Argon2id/outbox/BullMQ đúng quyết định hiện tại và cô lập provider email sau adapter.
3. **Dùng Auth.js/JWT/provider email cụ thể hoặc triển khai Socket.IO ngay:** bị loại vì thay auth model, khóa vendor sớm hoặc gây phase creep.
4. **Gửi email trực tiếp sau commit, không outbox:** nhỏ hơn nhưng có crash window làm mất delivery intent và lệch command flow đã định.

## Tác động

- Người dùng/UX: Có luồng rõ cho unverified, resend, logout-all, đổi email và quản lý thiết bị.
- Domain/rules: Không ảnh hưởng engine thi đấu, tier/quota hoặc tournament role.
- Schema/data/migration: Migration forward thêm terms fields, session public UUID, audit và outbox; không sửa migration P0.
- API/events/public URLs: Khóa payload logout, session ID và auth error/status; endpoint inventory không đổi.
- Security/privacy/billing: Token/cookie/rate-limit/CSRF được khóa; không log/store raw secret ngoài local fake mailbox; không ảnh hưởng billing.
- Performance/operations/cost: Argon2 dùng tối đa khoảng 64 MiB/lần; rate limit dùng Redis; worker thêm queue/polling nhỏ. Cần benchmark và metrics.
- Roadmap/tests/docs: Cần cập nhật specs/traceability sau approval; E2E chạy Postgres/Redis/worker/file mailbox cô lập.

## Migration và rollback

1. Tạo migration mới, forward-only, thêm nullable/default-safe fields và table mới; không đổi/xóa record P0.
2. Session mới có `public_id`; không có production session hiện hữu. Nếu có local session cũ, migration backfill UUID trước khi `NOT NULL/UNIQUE`.
3. Deploy migration trước code; web/worker chỉ dùng contract mới sau schema readiness.
4. Rollback app chỉ về commit P0 tương thích với các table/column thừa; không down-migrate/xóa audit/outbox. Forward-fix nếu worker/email lỗi; disable delivery consumer nhưng giữ intent.
5. Token/session đang phát có TTL ngắn/giới hạn; đổi secret làm chúng vô hiệu và phải dùng resend/login lại.

## Acceptance và test plan

- [ ] Owner phê duyệt chính xác contract ở trên hoặc ghi điều kiện thay thế.
- [ ] Blank migration + schema constraint/index tests pass.
- [ ] Unit test Argon2 format/verify/rehash, token single-use/expiry, normalization/password policy và safe DTO.
- [ ] Integration test register duplicate/concurrent, unverified/status deny, rate-limit, cookie/session rotation/revoke, reset/change/email-change và atomic audit/outbox.
- [ ] E2E `register → fake email → verify → login → session revoke → API deny` pass trên Chromium.
- [ ] Origin/CSRF, token reuse/expiry, account+IP rate limit, log/audit redaction tests pass.
- [ ] `pnpm verify`, `pnpm test:e2e`, `pnpm audit:prod`, staging health/readiness smoke và `git diff --check` pass.

## Quyết định của chủ dự án

- Trạng thái: `PROPOSED | REVIEWING | APPROVED | REJECTED | DEFERRED`
- Người/ngày:
- Điều kiện/ghi chú:

> Chỉ chủ dự án được đổi sang APPROVED. Sau approval mới cập nhật decisions/spec và triển khai.
