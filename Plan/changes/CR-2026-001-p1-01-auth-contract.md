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
- Register với email đã tồn tại trả cùng status/body/header `202` như request hợp lệ và không tạo account/token mới. Cả hai nhánh đều thực hiện đúng một Argon2id work item; response có floor 400 ms + jitter mật mã 0-50 ms để giảm timing oracle mà không log email.
- User đăng ký mới không được login trước khi verify. Chỉ sau khi password đúng mới được trả `EMAIL_VERIFICATION_REQUIRED`; email không tồn tại/password sai luôn trả `INVALID_CREDENTIALS`.
- `LOCKED`, `SUSPENDED`, `DELETION_PENDING` trả `ACCOUNT_UNAVAILABLE` chỉ sau khi password đúng; không tạo session.
- Mọi session resolver và mọi authenticated command phải đọc `User.status`; session của user không còn `ACTIVE` bị deny ngay, không chỉ tại login. Logout vẫn clear/revoke cookie theo best effort để user tự bảo vệ.
- Đổi email yêu cầu session hợp lệ + current password. Server giữ email đã verify làm email đăng nhập, lưu `pendingEmailNormalized` và phát token cho email mới. User có thể cancel/retry khi còn login bằng email cũ.
- Verify pending email chạy transaction serializable/advisory lock theo normalized email, bảo đảm không trùng giữa current/pending email, rồi mới swap email, clear pending state, revoke mọi session và gửi security notice tới địa chỉ cũ. User login lại bằng email mới. Token pending cũ bị vô hiệu khi request/cancel mới.
- Đổi `displayName` hoặc `defaultTimezone` không làm mất verification.

### 2. Session và cookie

- Raw session token: 32 random bytes; DB chỉ lưu SHA-256 hash.
- Bổ sung `public_id UUID UNIQUE` cho session; API chỉ expose UUID này, không expose token hash.
- Absolute TTL 30 ngày; idle TTL 7 ngày; cập nhật `last_seen_at` tối đa một lần mỗi 5 phút.
- Cookie tên `autobracket_session`, `HttpOnly`, `SameSite=Lax`, `Path=/`, không `Domain`, `Max-Age` theo absolute TTL.
- `Secure=true` bắt buộc ở non-loopback production. Chỉ local/test hoặc local staging loopback mới được cấu hình `Secure=false`.
- Login luôn tạo session mới và revoke session cookie cũ nếu có. Password change revoke mọi session cũ rồi tạo session mới. Password reset revoke mọi session và không tự login.
- Password change bắt buộc kiểm tra `currentPassword`; một session hợp lệ đơn thuần không đủ. Reset password chỉ dùng single-use reset token và là flow tách biệt.
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
- Không đặt persistent account lock chỉ vì đủ N lần đoán sai vì có thể bị lợi dụng gây account DoS. `failedCount` phục vụ risk/audit và reset khi login đúng; throttling sai mật khẩu nằm ở Redis theo chính sách bên dưới.

### 5. Rate limit, CSRF và request trust

- Redis fixed-window atomic; key dùng HMAC account/IP prefix, không chứa email/IP thô.
- Register: 5 request/15 phút/IP prefix.
- Login luôn chạy một Argon2id verify thật hoặc dummy trước khi tiết lộ kết quả. Wrong-password budget là 5/15 phút/account; correct password clear/bypass budget này nên attacker không thể khóa account chỉ bằng đoán sai. IP có CPU-abuse ceiling 20/15 phút; vượt ceiling mới bị chặn trước hash.
- Resend/forgot: 3 request/60 phút/account và 10 request/60 phút/IP prefix.
- Verify/reset: 10 request/15 phút/token scope và 20 request/15 phút/IP prefix.
- Response `429 RATE_LIMITED` có `Retry-After`, không trả internal key/counter.
- Redis lỗi thì register/login/resend/forgot fail closed với `503 SERVICE_UNAVAILABLE`. Logout, revoke session, authenticated password change và profile-security action vẫn chạy bằng DB transaction/audit. Verify/reset kiểm HMAC trước DB và token hợp lệ vẫn được thực hiện; rate limit cho invalid token degrade best-effort với metric/alert.
- Mọi `POST/PATCH/DELETE` auth dùng JSON, giới hạn body 32 KiB, bắt buộc `Origin` khớp `APP_URL` hoặc `PUBLIC_URL`; CORS deny-by-default. Cookie `SameSite` không thay CSRF check.
- Chỉ tin forwarding headers khi web port bị network-isolate sau reverse proxy, proxy strip/overwrite header do client gửi và source proxy thuộc `TRUSTED_PROXY_CIDRS`. `TRUST_PROXY_HOPS` mặc định local `0`; production parse XFF từ phải sang trái đúng số hop đã cấu hình, reject chain malformed. Chỉ lưu HMAC của prefix IPv4 `/24` hoặc IPv6 `/56`.

### 6. Request/response contract

Mọi endpoint dưới `/api/v1`; field lạ bị reject. Success body dùng `{ "data": ... }`, private DTO không serialize ORM entity.

- `POST /auth/register`
  - Request: `{ "email": string, "password": string, "displayName": string, "acceptTerms": true }`.
  - Response mới/trùng account: `202 { "data": { "accepted": true } }` giống nhau.
- `POST /auth/login`
  - Request: `{ "email": string, "password": string }`.
  - Response: `200 { "data": { "user": MeDto } }` + rotated `Set-Cookie`.
- `POST /auth/logout`
  - Request optional: `{ "scope": "current" | "all" }`; body trống mặc định `current`.
  - Response: `204`, luôn clear cookie hiện tại.
- `POST /auth/email/verify`
  - Request: `{ "token": string }`.
  - Response initial verification: `200 { "data": { "emailVerified": true, "sessionRevoked": false } }`.
  - Response pending-email swap: cùng shape với `sessionRevoked: true`; mọi session cũ bị revoke.
- `POST /auth/email/resend`
  - Request: `{ "email": string }`.
  - Response cho unknown/already verified/eligible: `202 { "data": { "accepted": true } }` giống nhau.
- `POST /auth/password/forgot`
  - Request: `{ "email": string }`.
  - Response existent/nonexistent: `202 { "data": { "accepted": true } }` giống nhau.
- `POST /auth/password/reset`
  - Request: `{ "token": string, "newPassword": string }`.
  - Response: `204`; revoke toàn bộ session.
- `POST /auth/password/change`
  - Request: `{ "currentPassword": string, "newPassword": string }`.
  - Response: `204` + session cookie mới; revoke mọi session cũ.
- `GET /me`
  - Response `MeDto`: `id`, `email`, `displayName`, `emailVerified`, `pendingEmail|null`, `locale`, `defaultTimezone`, `version`; không trả tier/usage trước P1-02 và không trả status/hash/internal fields.
- `PATCH /me`
  - Request: `{ "expectedVersion": number, "displayName"?: string, "defaultTimezone"?: string, "email"?: string, "cancelPendingEmail"?: boolean, "currentPassword"?: string }`.
  - `email` và `cancelPendingEmail` loại trừ nhau và bắt buộc `currentPassword`; request không có field thay đổi bị reject.
  - Response: `200 { "data": { "user": MeDto } }`; version conflict trả `409 VERSION_CONFLICT`.
- `GET /me/sessions?cursor=<uuid>&limit=<1..50>`
  - Default limit 20; order ổn định theo `createdAt DESC, publicId DESC`.
  - Response: `{ "data": { "items": [{ "publicId", "deviceLabel", "createdAt", "lastSeenAt", "expiresAt", "current" }], "page": { "nextCursor": string|null } } }`.
- `DELETE /me/sessions/:publicId`
  - Response session thuộc user: `204`; current session đồng thời clear cookie.
  - Missing/cross-user cùng trả `404 NOT_FOUND`.

`register`, `resend` và `forgot` có cùng response floor 400 ms + jitter 0-50 ms giữa nhánh existent/nonexistent; login existent/nonexistent luôn chạy đúng một Argon2id verify thật/dummy. Test dùng injected delay/work counters và benchmark thống kê, không dùng sleep cứng trong assertion.

### 7. Error/status contract

- `202`: register/resend/forgot response chống enumeration.
- `204`: logout/session revoke.
- `400 TOKEN_INVALID_OR_EXPIRED`; `401 AUTH_REQUIRED`/`INVALID_CREDENTIALS`; `403 EMAIL_VERIFICATION_REQUIRED`/`ACCOUNT_UNAVAILABLE`/`FORBIDDEN`; `404 NOT_FOUND`; `409 CONFLICT`/`VERSION_CONFLICT`; `422 VALIDATION_FAILED`; `429 RATE_LIMITED`; `503 SERVICE_UNAVAILABLE`.
- Mọi lỗi dùng envelope chuẩn có stable code, message tiếng Việt an toàn, `details` allowlist và correlation ID; private response luôn `Cache-Control: no-store`.

### 8. Email/outbox/worker

- P1-01 thêm minimal `AuditLog` và `OutboxEvent` đúng data model; auth transaction ghi state + audit + email intent atomically.
- Stable auth audit codes của slice này: `AUTH_REGISTERED`, `AUTH_TERMS_ACCEPTED`, `AUTH_EMAIL_VERIFICATION_ISSUED`, `AUTH_EMAIL_VERIFIED`, `AUTH_LOGIN_SUCCEEDED`, `AUTH_LOGIN_DENIED`, `AUTH_LOGOUT`, `AUTH_SESSION_REVOKED`, `AUTH_ALL_SESSIONS_REVOKED`, `AUTH_PASSWORD_RESET_COMPLETED`, `AUTH_PASSWORD_CHANGED`, `AUTH_PROFILE_UPDATED`, `AUTH_EMAIL_CHANGE_REQUESTED`, `AUTH_EMAIL_CHANGE_CANCELLED`, `AUTH_EMAIL_CHANGED`, `AUTH_RATE_LIMITED`. Audit chỉ lưu user/target UUID khi biết, outcome/reason code, correlation ID và diff field-name đã redact; không lưu email/password/token/cookie/IP/user-agent thô.
- Outbox event auth dùng `eventType="IDENTITY_EMAIL_REQUESTED"`, `schemaVersion=1`, aggregate user/token ID, template version và dedupe key. Payload không chứa raw token hoặc recipient; worker đọc token/user theo ID sau commit rồi dựng canonical link.
- Worker dùng BullMQ đã khóa bởi `D-006`: dispatcher chuyển outbox intent thành `email.transactional`; consumer gửi template versioned sau commit.
- Local/CI dùng file-mailbox adapter trong thư mục gitignored, không log recipient/token/link. Production path là generic HTTPS adapter với secret header; không khóa vendor.
- Local staging có thể smoke bằng file adapter, nhưng không được claim real-email staging. Trước UAT/staging có người dùng thật, owner phải cung cấp endpoint/provider hoặc duyệt CR provider riêng.

### 9. Làm rõ ranh giới checklist/phase

- Khi CR được owner chuyển `APPROVED`, cập nhật checklist **trước/cùng commit đầu tiên của code** theo đúng wording sau:
  - `P1-001`: “Schema user/credential/session/token/audit/outbox có migration/test.”
  - `P1-005`: “Logout current/all sessions; revoked/expired/non-ACTIVE session bị HTTP API và shared DB session resolver từ chối.”
  - `P1-008`: “Schema grant/subscription skeleton + entitlement resolver + quota server tests REGULAR/VIP/ADMIN.” Grant vẫn thuộc `P1-02`.
  - `P4-020`: “Socket room authorization, session revoke/disconnect và payload allowlist.” Socket evidence vẫn thuộc `P4-04`.
- Sau khi wording trên được cập nhật, `P1-001..007` là DoD checklist trọn vẹn của P1-01; không để checkbox nửa đạt hoặc claim socket evidence sớm.
- Không mở entitlement, tournament, Socket.IO room hoặc feature của P1-02+ trong P1-01.

## Các phương án đã cân nhắc

1. **Giữ nguyên và để AI tự chọn khi code:** bị loại vì vi phạm luật không tự quyết schema/API/security.
2. **Phương án đề xuất:** khóa một contract đầy đủ, giữ DB session/Argon2id/outbox/BullMQ đúng quyết định hiện tại và cô lập provider email sau adapter.
3. **Dùng Auth.js/JWT/provider email cụ thể hoặc triển khai Socket.IO ngay:** bị loại vì thay auth model, khóa vendor sớm hoặc gây phase creep.
4. **Gửi email trực tiếp sau commit, không outbox:** nhỏ hơn nhưng có crash window làm mất delivery intent và lệch command flow đã định.

## Tác động

- Người dùng/UX: Có luồng rõ cho unverified, resend, logout-all, đổi email và quản lý thiết bị.
- Domain/rules: Không ảnh hưởng engine thi đấu, tier/quota hoặc tournament role.
- Schema/data/migration: Migration forward thêm terms fields, pending-email state, session public UUID, audit và outbox; không sửa migration P0. Cross-column current/pending email uniqueness được bảo vệ bằng unique index + transaction lock và concurrency test.
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
- [ ] Existing/non-ACTIVE session deny, current-password enforcement, account-lockout DoS resistance, Redis-degraded defensive actions và trusted-proxy parsing tests pass.
- [ ] E2E `register → fake email → verify → login → session revoke → API deny` pass trên Chromium.
- [ ] Origin/CSRF, token reuse/expiry, account+IP rate limit, log/audit redaction tests pass.
- [ ] `pnpm verify`, `pnpm test:e2e`, `pnpm audit:prod`, staging health/readiness smoke và `git diff --check` pass.

## Quyết định của chủ dự án

- Trạng thái: `PROPOSED | REVIEWING | APPROVED | REJECTED | DEFERRED`
- Người/ngày:
- Điều kiện/ghi chú:

> Chỉ chủ dự án được đổi sang APPROVED. Sau approval mới cập nhật decisions/spec và triển khai.
