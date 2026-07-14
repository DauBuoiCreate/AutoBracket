# CR-2026-001 - Khóa contract bảo mật và API cho P1-01

- Trạng thái: `APPROVED`
- Người đề xuất: Codex (AI)
- Người phê duyệt: Chủ dự án
- Ngày đề xuất: 2026-07-14
- Target phase/release: `P1-01`
- Quyết định/requirement bị ảnh hưởng: `D-006`, `D-010`, `D-022`, `D-024`, `D-026`, `REQ-ACC-01..05`, `P1-001..007`, `OQ-06`, `E2E-A..F`

## Vấn đề và bằng chứng

Gate P0 đã được chủ dự án chấp nhận và `P1-01` đã được mở, nhưng baseline mới khóa outcome và các endpoint định hướng. Các chi tiết dưới đây ảnh hưởng trực tiếp đến public API, schema, privacy hoặc security control nên AI không được tự chọn trong code:

- Chưa có payload cho logout current/all, session revoke handle và auth error mapping.
- Chưa khóa policy login khi email chưa xác minh, cách đổi email và cách lưu bằng chứng chấp nhận điều khoản.
- Chưa khóa TTL, cookie/session policy, Argon2id parameters, token format, rate-limit và trusted proxy policy.
- Chưa khóa idempotency scope/replay cho auth mutation; retry sau mất response có thể tạo session/token hoặc side effect kép.
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
- Một helper server duy nhất normalize email cho DB unique, reservation, rate-limit và idempotency: Unicode NFC + trim; split đúng một `@`; MVP chỉ nhận ASCII local-part hợp lệ (1-64 byte, dot không ở đầu/cuối/liền nhau), lowercase invariant nhưng không áp dụng Gmail dot/plus rule; domain chạy `domainToASCII`, lowercase, validate label/độ dài; reject control/whitespace/invalid IDNA và tổng >320 byte. Mọi raw variant phải map cùng canonical value hoặc bị reject; client normalization không là nguồn sự thật.
- Server lưu `termsAcceptedAt` và `termsVersion="draft-2026-07-14"` trên `User`, đồng thời ghi audit `AUTH_TERMS_ACCEPTED`. Đây chỉ là version kỹ thuật pre-release; legal content/go-live approval vẫn thuộc P6.
- Register với email đã tồn tại trả cùng status/body/header `202` như request hợp lệ và không tạo account/token mới. Cả hai nhánh đều thực hiện đúng một Argon2id work item; response có floor 400 ms + jitter mật mã 0-50 ms để giảm timing oracle mà không log email.
- User đăng ký mới không được login trước khi verify. Chỉ sau khi password đúng mới được trả `EMAIL_VERIFICATION_REQUIRED`; email không tồn tại/password sai luôn trả `INVALID_CREDENTIALS`.
- Email verification không được kích hoạt account chỉ bằng link: request phải kèm đúng password hiện tại của account. Điều này chặn attacker pre-register email nạn nhân rồi chờ nạn nhân click. Nếu chủ email không biết password đã đăng ký, họ dùng forgot/reset; reset token chứng minh ownership, đặt credential mới và với account chưa verify sẽ đồng thời verify current email.
- `LOCKED`, `SUSPENDED`, `DELETION_PENDING` trả `ACCOUNT_UNAVAILABLE` chỉ sau khi password đúng; không tạo session.
- Mọi session resolver và mọi authenticated command phải đọc `User.status`; session của user không còn `ACTIVE` bị deny ngay, không chỉ tại login. Logout vẫn clear/revoke cookie theo best effort để user tự bảo vệ.
- Email ownership dùng bảng guard `email_reservations` với constraint chính xác `UNIQUE(email_normalized)` (không phải composite với kind); mọi register/request/cancel/verify/cleanup email đều thay đổi guard trong cùng transaction với `User`, không chỉ kiểm ở bước verify. Partial unique indexes chính xác bảo đảm mỗi user chỉ có tối đa một row `CURRENT` và một row `PENDING`; `FORMER` có thể nhiều row trong retention window.
- Đổi email yêu cầu session hợp lệ + current password. Server giữ reservation `CURRENT` làm email đăng nhập, tạo reservation `PENDING` và phát token cho email mới. User có thể cancel/retry khi còn login bằng email cũ.
- Verify pending email chạy transaction, chuyển reservation hiện tại thành `FORMER`, pending thành `CURRENT`, swap `User.emailNormalized`, revoke mọi session và tạo security-notice outbox trỏ tới former reservation. Former reservation được xóa sau khi notice đã delivered và qua 24 giờ, hoặc sau safety cap 7 ngày kèm dead-letter alert; token pending cũ bị vô hiệu khi request/cancel mới. User login lại bằng email mới.
- Đổi `displayName` hoặc `defaultTimezone` không làm mất verification.

### 2. Session và cookie

- Raw session token là `HMAC-SHA256(SESSION_SECRET, "autobracket:session:v1:<publicId>:<Idempotency-Key>")` 32 byte; nó có tính giả ngẫu nhiên nhưng tái tạo được chỉ để replay đúng cùng login/password-change response. DB chỉ lưu SHA-256 hash, không lưu raw token/idempotency key.
- Resolver xác thực session bằng raw-cookie hash lookup, nên đổi `SESSION_SECRET` **không tự** vô hiệu row cũ. Rotation procedure bắt buộc transaction bulk-revoke mọi active session + expire cookie-replay idempotency records, ghi audit, rồi mới deploy secret mới; rollback dùng previous secret chỉ trong controlled window.
- Bổ sung `public_id UUID UNIQUE` cho session; API chỉ expose UUID này, không expose token hash.
- Absolute TTL 30 ngày; idle TTL 7 ngày; cập nhật `last_seen_at` tối đa một lần mỗi 5 phút.
- Browser-visible `PUBLIC_URL`, không phải HTTP hop nội bộ tới app, quyết định cookie policy. Production bắt buộc canonical HTTPS origin và cookie tên `__Host-autobracket_session`, `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, không `Domain`, `Max-Age` theo absolute TTL. Local/test HTTP loopback dùng tên `autobracket_session` không `Secure`; không có env switch cho phép production hạ cờ.
- Login luôn tạo session mới và revoke session cookie cũ nếu có. Password change revoke mọi session cũ rồi tạo session mới. Password reset revoke mọi session và không tự login.
- Password change bắt buộc kiểm tra `currentPassword`; một session hợp lệ đơn thuần không đủ. Reset password chỉ dùng single-use reset token và là flow tách biệt.
- Password change/reset transaction supersede mọi reset/verification token còn mở, cancel `PENDING` email reservation và tạo audit/outbox security notice. Vì vậy credential recovery không thể bị token cũ hoặc pending-email cũ đảo ngược sau đó.
- `POST /api/v1/auth/logout` nhận `{ "scope": "current" | "all" }`; thiếu `scope` mặc định `current`, thành công trả `204` và clear cookie hiện tại.
- Logout không có cookie hoặc cookie đã vô hiệu vẫn trả `204` để client có thể dọn trạng thái an toàn.
- `GET /api/v1/me/sessions` trả safe device summary, created/lastSeen/expires/current; `DELETE /api/v1/me/sessions/:publicId` trả `204`, idempotent cho session thuộc user. Session không tồn tại hoặc thuộc user khác cùng trả `404 NOT_FOUND` để không lộ ownership.

### 3. Token verification/reset

- Token email/reset có public form `v1.<kid>.<base64url(uuid-bytes)>.<expires-unix>.<base64url(signature)>`; token ID là UUID v4 ngẫu nhiên.
- Signature là `HMAC-SHA256(AUTH_TOKEN_SECRET[kid], "autobracket:identity-token:v1:<kid>:<purpose>:<tokenId>:<expires-unix>")`. Secret độc lập session secret, tối thiểu 32 random byte; purpose/domain/version binding ngăn dùng chéo verify/reset. Key ring giữ previous key ít nhất 24 giờ (max token TTL) rồi mới remove.
- DB chỉ lưu SHA-256 của toàn token, purpose, email/user, expiry, used/attempts; outbox/queue chỉ mang token record ID, không mang raw token.
- Server kiểm version/expiry/HMAC constant-time trước DB. Worker có thể tái tạo link từ token ID + expiry + secret sau commit. Token single-use atomic; expired/reused/superseded/wrong-purpose đều trả `TOKEN_INVALID_OR_EXPIRED` mà không phân biệt.
- Email transport đặt token trong URL fragment: `/verify-email#token=<...>` hoặc `/reset-password#token=<...>`, không dùng query/path. Fragment không được gửi tới proxy/server; client đọc rồi `history.replaceState` xóa fragment trước khi POST. Auth pages không load third-party/analytics, dùng `Referrer-Policy: no-referrer`, `Cache-Control: no-store`; request logger không đọc body và UI không ghi token vào DOM text/localStorage.
- Verification TTL 24 giờ; reset TTL 60 phút; token cũ cùng purpose bị vô hiệu khi phát token mới.

### 4. Password/Argon2id

- Password dài 12-128 ký tự, chấp nhận passphrase, reject danh sách common password cục bộ; không gửi raw password ra provider.
- Dùng `node:crypto` Argon2id của Node `24.14.1`, không thêm thư viện hashing khi platform đã có API.
- PHC serialization chính xác: `$argon2id$v=19$m=65536,t=3,p=4$<salt-base64-no-pad>$<tag-base64-no-pad>`; salt 16 byte, tag 32 byte. Parser reject variant/parameter/length ngoài allowlist trước khi allocate; verify dùng `timingSafeEqual`. Login rehash khi hash dùng policy thấp hơn.
- Prototype trên máy phát triển với Node `24.14.1`, 5 lần chạy tuần tự cho kết quả 274-335 ms, median 303 ms. API hiện được Node đánh dấu experimental nên patch Node tiếp tục phải khóa và có regression test.
- Benchmark CI/staging thực tế được ghi trong handoff; nếu p95 vượt 750 ms trên môi trường chuẩn thì tạo CR điều chỉnh, không tự giảm security parameter.
- Hash luôn dùng API async qua process semaphore: mặc định tối đa 2 Argon2 job đồng thời, queue tối đa 32, chờ tối đa 2 giây. Queue đầy/hết thời gian trả `503 SERVICE_UNAVAILABLE` + `Retry-After`; env chỉ cho range concurrency 1-4 và không được tăng nếu thiếu concurrent memory benchmark.
- Integration benchmark phải chạy concurrent login/reset/change, chứng minh RSS nằm trong container budget và event-loop heartbeat không bị block; distributed-source rate limit bảo vệ CPU nhưng không thay semaphore.
- Không đặt persistent account lock chỉ vì đủ N lần đoán sai vì có thể bị lợi dụng gây account DoS. `failedCount` phục vụ risk/audit và reset khi login đúng; throttling sai mật khẩu nằm ở Redis theo chính sách bên dưới.

### 5. Rate limit, CSRF và request trust

- Redis fixed-window atomic; subject key dùng HKDF-SHA256 subkey từ `AUTH_DERIVATION_SECRET[kid]` với domain `autobracket:rate-subject:v1`/`autobracket:ip-prefix:v1`, không chứa email/IP thô. Khi rotate, service dual-read/charge current + previous buckets trong 60 phút (max window) để không reset quota.
- Register: 5 request/15 phút/IP prefix.
- Login luôn chạy một Argon2id verify thật hoặc dummy khi request còn budget. Global account attempt bucket là 10/15 phút và IP bucket 20/15 phút; cả đúng/sai đều tiêu thụ để distributed attacker không được unlimited guesses. Bucket là fixed window không kéo dài khi bị spam; trade-off bounded login delay được ghi nhận, và reset-token recovery dùng bucket tách biệt. Không có persistent DB lock.
- Endpoint kiểm `currentPassword` (password change, request/cancel email) có bucket `(userId,session)` 5/15 phút ngoài IP bucket; không được brute-force qua session bị đánh cắp.
- Resend/forgot: 3 request/60 phút/account và 10 request/60 phút/IP prefix.
- Verify/reset: 10 request/15 phút/token scope và 20 request/15 phút/IP prefix.
- Response `429 RATE_LIMITED` có `Retry-After`, không trả internal key/counter.
- Redis lỗi thì register/login/resend/forgot, verify-email và mọi action kiểm password/currentPassword fail closed với `503 SERVICE_UNAVAILABLE`. Logout/revoke session và profile edit không đổi credential vẫn chạy bằng DB transaction/audit. Reset kiểm HMAC trước DB và token hợp lệ vẫn được thực hiện; rate limit cho invalid token degrade best-effort với metric/alert.
- Mọi `POST/PATCH/DELETE` auth dùng JSON, giới hạn body 32 KiB, bắt buộc `Origin` khớp browser-visible `PUBLIC_URL` chính xác; không tin `APP_URL` nội bộ và CORS deny-by-default. Cookie `SameSite` không thay CSRF check.
- Chỉ tin forwarding headers khi web port bị network-isolate sau reverse proxy, proxy strip/overwrite header do client gửi và source proxy thuộc `TRUSTED_PROXY_CIDRS`. `TRUST_PROXY_HOPS` mặc định local `0`; production parse XFF từ phải sang trái đúng số hop đã cấu hình, reject chain malformed. Chỉ lưu HMAC của prefix IPv4 `/24` hoặc IPv6 `/56`.
- Startup env được khóa tên/range: `SESSION_SECRET`; token key ring `AUTH_TOKEN_KEY_ID`, `AUTH_TOKEN_SECRET`, optional pair `AUTH_TOKEN_PREVIOUS_KEY_ID`/`AUTH_TOKEN_PREVIOUS_SECRET`; idempotency key ring `AUTH_IDEMPOTENCY_KEY_ID`, `AUTH_IDEMPOTENCY_SECRET`, optional `AUTH_IDEMPOTENCY_PREVIOUS_KEY_ID`/`AUTH_IDEMPOTENCY_PREVIOUS_SECRET`; derivation key ring `AUTH_DERIVATION_KEY_ID`, `AUTH_DERIVATION_SECRET`, optional `AUTH_DERIVATION_PREVIOUS_KEY_ID`/`AUTH_DERIVATION_PREVIOUS_SECRET`. Mọi secret độc lập và tối thiểu 32 byte. TTL lần lượt `SESSION_TTL_SECONDS=2592000`, `SESSION_IDLE_TTL_SECONDS=604800`, `EMAIL_VERIFICATION_TTL_SECONDS=86400`, `PASSWORD_RESET_TTL_SECONDS=3600`, `AUTH_IDEMPOTENCY_TTL_SECONDS=86400`; `AUTH_ARGON2_MAX_CONCURRENCY=2` (range 1-4), `TRUST_PROXY_HOPS`, `TRUSTED_PROXY_CIDRS`, cùng email adapter config tại §9. Production từ chối placeholder/local secret, half-configured pair, duplicate/unknown key ID, invalid TTL và proxy config không đồng bộ.

### 6. Idempotency contract

- Mọi `POST`, `PATCH`, `DELETE` trong slice yêu cầu header `Idempotency-Key` là UUID v4; key không được log hoặc trả về body.
- Scope authenticated là `(userId, method, route-template, key)`. Scope anonymous dùng HMAC từ derivation subkey domain `autobracket:idempotency-subject:v1`, không PII: canonical email cho register/login/resend/forgot, parsed token ID cho verify/reset, session hash hoặc IP-prefix bucket cho logout.
- Request fingerprint là `HMAC-SHA256(AUTH_IDEMPOTENCY_SECRET[kid], "autobracket:idempotency-fingerprint:v1:<canonical request>")`, nên password/token trong body không tạo fast offline verifier nếu DB lộ. Record lưu `kid`; key ring giữ previous key ít nhất 24 giờ rồi mới remove. Cùng scope/key khác fingerprint trả `409 IDEMPOTENCY_CONFLICT`; record `IN_PROGRESS` trả cùng code + `Retry-After: 1`, retry sau completion replay kết quả.
- `idempotency_records` được ghi trong cùng DB transaction với command, unique theo scope + HMAC(key), TTL 24 giờ. Record chỉ giữ fingerprint, status code, safe response snapshot/result reference và session public ID; không giữ raw key/password/token/cookie, email ngoài DTO private đã allowlist hoặc auth header.
- Sau JSON/origin validation, completed-record lookup diễn ra trước active-token/session validation chỉ để replay exact request. Used verify/reset token hoặc revoked old session có thể resolve original subject từ immutable record/hash; nếu không có completed record khớp tuyệt đối thì luồng auth bình thường vẫn deny. Cơ chế này không mở quyền thực hiện command mới.
- Replay trả cùng status/body và safe headers. Với login/password-change, raw cookie được tái tạo từ session public ID + key + session secret; cùng key không tạo session thứ hai và không kéo dài TTL. Verify/reset/email-change replay thành công dù token đã được mark used ở lần đầu.
- Logout/session delete vẫn yêu cầu key dù side effect tự nhiên idempotent. Concurrent duplicate, crash/lost-response trước và sau commit đều có integration tests; cleanup record không chạy trước TTL.

### 7. Request/response contract

Mọi endpoint dưới `/api/v1`; field lạ bị reject. Success body dùng `{ "data": ... }`, private DTO không serialize ORM entity. Các mutation dưới đây đều áp dụng header contract tại §6.

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
  - Request: `{ "token": string, "password": string }`; password phải khớp current credential cho cả initial verification và pending-email swap.
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
  - Response: `204`; revoke toàn bộ session, invalidate mọi token/pending email. Nếu current email chưa verify, reset proof đồng thời verify email đó.
- `POST /auth/password/change`
  - Request: `{ "currentPassword": string, "newPassword": string }`.
  - Response: `204` + session cookie mới; revoke mọi session cũ.
- `GET /me`
  - Response `MeDto`: `id`, `email`, `displayName`, `emailVerified`, `pendingEmail|null`, `locale`, `defaultTimezone`, `version`; không trả tier/usage trước P1-02 và không trả status/hash/internal fields.
- `PATCH /me`
  - Request: `{ "expectedVersion": number, "displayName"?: string, "defaultTimezone"?: string, "email"?: string, "cancelPendingEmail"?: boolean, "currentPassword"?: string }`.
  - `email` và `cancelPendingEmail` loại trừ nhau và bắt buộc `currentPassword`; request không có field thay đổi bị reject.
  - Response: `200 { "data": { "user": MeDto } }`; version conflict trả `409 VERSION_CONFLICT`.
- `GET /me/sessions?cursor=<opaque>&limit=<1..50>`
  - Default limit 20; order ổn định theo `createdAt DESC, publicId DESC`.
  - Cursor là `v1.<kid>.<expiresUnix>.<base64url(createdAtMillis|publicId)>.<HMAC>` với HMAC từ HKDF subkey domain `autobracket:session-cursor:v1`, TTL 15 phút và đủ hai sort values; query dùng tuple comparison nên vẫn tiếp tục nếu record cursor đã cleanup. Previous derivation key giữ ít nhất 60 phút; cursor malformed/expired/tampered trả `422 VALIDATION_FAILED`.
  - Response: `{ "data": { "items": [{ "publicId", "deviceLabel", "createdAt", "lastSeenAt", "expiresAt", "current" }], "page": { "nextCursor": string|null } } }`.
- `DELETE /me/sessions/:publicId`
  - Response session thuộc user: `204`; current session đồng thời clear cookie.
  - Missing/cross-user cùng trả `404 NOT_FOUND`.

`register`, `resend` và `forgot` có cùng response floor 400 ms + jitter 0-50 ms giữa nhánh existent/nonexistent; login existent/nonexistent luôn chạy đúng một Argon2id verify thật/dummy. Test dùng injected delay/work counters và benchmark thống kê, không dùng sleep cứng trong assertion.

### 8. Error/status contract

- `202`: register/resend/forgot response chống enumeration.
- `204`: logout/session revoke.
- `400 TOKEN_INVALID_OR_EXPIRED`; `401 AUTH_REQUIRED`/`INVALID_CREDENTIALS`; `403 EMAIL_VERIFICATION_REQUIRED`/`ACCOUNT_UNAVAILABLE`/`FORBIDDEN`; `404 NOT_FOUND`; `409 CONFLICT`/`VERSION_CONFLICT`/`IDEMPOTENCY_CONFLICT`; `422 VALIDATION_FAILED`; `429 RATE_LIMITED`; `503 SERVICE_UNAVAILABLE`.
- Mọi lỗi dùng envelope chuẩn có stable code, message tiếng Việt an toàn, `details` allowlist và correlation ID; private response luôn `Cache-Control: no-store`.

### 9. Email/outbox/worker

- P1-01 thêm minimal `AuditLog` và `OutboxEvent` đúng data model; auth transaction ghi state + audit + email intent atomically.
- Stable auth audit codes của slice này: `AUTH_REGISTERED`, `AUTH_TERMS_ACCEPTED`, `AUTH_EMAIL_VERIFICATION_ISSUED`, `AUTH_EMAIL_VERIFIED`, `AUTH_LOGIN_SUCCEEDED`, `AUTH_LOGIN_DENIED`, `AUTH_LOGOUT`, `AUTH_SESSION_REVOKED`, `AUTH_ALL_SESSIONS_REVOKED`, `AUTH_PASSWORD_RESET_COMPLETED`, `AUTH_PASSWORD_CHANGED`, `AUTH_PROFILE_UPDATED`, `AUTH_EMAIL_CHANGE_REQUESTED`, `AUTH_EMAIL_CHANGE_CANCELLED`, `AUTH_EMAIL_CHANGED`, `AUTH_RATE_LIMITED`. Audit chỉ lưu user/target UUID khi biết, outcome/reason code, correlation ID và diff field-name đã redact; không lưu email/password/token/cookie/IP/user-agent thô.
- Tách hai event schema, đều `schemaVersion=1`: `IDENTITY_TOKEN_EMAIL_REQUESTED` mang user/token/reservation ID + purpose; `IDENTITY_SECURITY_EMAIL_REQUESTED` mang user/reservation ID + notice type và không có token. Payload không chứa raw token hoặc recipient; worker đọc recipient từ current/pending/former reservation được tham chiếu. Nhờ former reservation, security notice vẫn có đúng địa chỉ cũ sau email swap.
- Worker dùng BullMQ đã khóa bởi `D-006`: dispatcher chuyển outbox intent thành `email.transactional`; consumer gửi template versioned sau commit.
- BullMQ `jobId=outboxEventId`. Với token email, issuance/delivery cùng lấy DB advisory lock `(userId,purpose)` và worker chỉ send nếu token còn unused/unexpired/not-superseded + mới nhất; job cũ kết thúc `SKIPPED_STALE`. Với security notice, worker không áp token/latest rule mà kiểm referenced reservation còn trong retention và delivery chưa acknowledged.
- Email adapter bắt buộc nhận `Idempotency-Key=outboxEventId`; file adapter dùng atomic create theo event ID, HTTPS adapter/provider phải dedupe cùng key. Crash sau provider accept/trước ack vì vậy không gửi logical email thứ hai; retry/out-of-order/crash-window có integration test.
- Local/CI dùng file-mailbox adapter trong thư mục gitignored, không log recipient/token/link. Production path là generic HTTPS adapter với secret header; không khóa vendor.
- HTTPS adapter chỉ nhận endpoint từ validated server env (không từ user), yêu cầu HTTPS/TLS, không follow redirect, timeout 5 giây, retry exponential tối đa 5 lần rồi dead-letter/alert; chỉ 2xx là success và response/body/secret không vào log.
- **Thay đổi deadline OQ-06:** baseline yêu cầu chọn provider trước `P1-01 staging`; đề xuất mới cho phép CI/local staging synthetic dùng file adapter, nhưng bắt buộc owner chọn/cấp HTTPS provider tương thích idempotency trước UAT hoặc staging có người dùng thật, và không muộn hơn Gate P1. Sau approval phải cập nhật chính dòng `OQ-06`; không được claim real-email staging trước mốc này.

### 10. Làm rõ ranh giới checklist/phase

- Khi CR được owner chuyển `APPROVED`, cập nhật checklist **trước/cùng commit đầu tiên của code** theo đúng wording sau:
  - `P1-001`: “Schema user/email-reservation/credential/session/token/idempotency/audit/outbox có migration/test.”
  - `P1-005`: “Logout current/all sessions; revoked/expired/non-ACTIVE session bị HTTP API và shared DB session resolver từ chối.”
  - `P1-008`: “Schema grant/subscription skeleton + entitlement resolver + quota server tests REGULAR/VIP/ADMIN.” Grant vẫn thuộc `P1-02`.
  - `P1-017`: “Schema membership/invitation + accept/expire/revoke/email match có migration/test.” Membership vẫn thuộc `P1-04`, không bị xóa khỏi traceability khi tách `P1-001`.
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
- Schema/data/migration: Migration forward thêm terms fields, `email_reservations`, session public UUID, token supersede state, idempotency records, audit và outbox; không sửa migration P0. Một unique email guard bảo vệ current/pending xuyên mọi flow và có concurrency test.
- API/events/public URLs: Khóa payload logout, session ID và auth error/status; endpoint inventory không đổi.
- Security/privacy/billing: Token/cookie/rate-limit/CSRF được khóa; không log/store raw secret ngoài local fake mailbox; không ảnh hưởng billing.
- Performance/operations/cost: Argon2 dùng tối đa khoảng 64 MiB/lần; rate limit dùng Redis; worker thêm queue/polling nhỏ. Cần benchmark và metrics.
- Roadmap/tests/docs: Cần cập nhật specs/traceability sau approval; E2E chạy Postgres/Redis/worker/file mailbox cô lập.

## Migration và rollback

1. Tạo migration mới, forward-only, thêm nullable/default-safe fields và table mới; không đổi/xóa record P0.
2. Backfill một `CURRENT` email reservation cho mọi user hiện hữu rồi mới bật unique/partial indexes. Migration fail nếu phát hiện collision thay vì tự chọn record.
3. Session mới có `public_id`; không có production session hiện hữu. Nếu có local session cũ, migration backfill UUID trước khi `NOT NULL/UNIQUE`.
4. Deploy migration trước code; web/worker chỉ dùng contract mới sau schema readiness.
5. Rollback app chỉ về commit P0 tương thích với các table/column thừa; không down-migrate/xóa audit/outbox/idempotency. Forward-fix nếu worker/email lỗi; disable delivery consumer nhưng giữ intent.
6. Token/session đang phát có TTL ngắn/giới hạn; đổi secret làm chúng vô hiệu và phải dùng resend/login lại.

## Acceptance và test plan

- [ ] Owner phê duyệt chính xác contract ở trên hoặc ghi điều kiện thay thế.
- [ ] Blank migration + schema constraint/index tests pass.
- [ ] Unit test Argon2 format/verify/rehash, token single-use/expiry, normalization/password policy và safe DTO.
- [ ] Integration test register duplicate/concurrent, unverified/status deny, rate-limit, cookie/session rotation/revoke, reset/change/email-change, idempotency lost-response/concurrency và atomic audit/outbox.
- [ ] Existing/non-ACTIVE session deny, current-password enforcement, account-lockout DoS resistance, Redis-degraded defensive actions và trusted-proxy parsing tests pass.
- [ ] Pre-account verification takeover bị deny; reset/change supersede token + pending email; fragment token không xuất hiện trong server URL/referrer/log/storage snapshot.
- [ ] Email case/NFC/IDNA variants, exact reservation uniques, HMAC key rotation, token-vs-notice worker policy và proxy-TLS `__Host-` cookie tests pass.
- [ ] Concurrent Argon2 benchmark chứng minh semaphore/queue/overload, RSS budget và event-loop heartbeat đạt contract.
- [ ] E2E-A: `register → fake email → verify → login → hai device → revoke một session → API deny`.
- [ ] E2E-B: unverified login deny, resend neutral response/rate-limit và token cũ hết hiệu lực.
- [ ] E2E-C: forgot/reset neutral response, expired/reused link, old password/session fail và new password login được.
- [ ] E2E-D: change password bắt buộc current password, rotate current/revoke other; logout-all làm mọi context mất quyền.
- [ ] E2E-E: sửa display/timezone, request/cancel/retry pending email, stale token fail, verify email mới, security notice cũ và login lại.
- [ ] E2E-F: profile/security/session UI có loading/error/empty, mobile 320/768/1024, keyboard/focus/error-summary và accessibility smoke.
- [ ] Origin/CSRF, token reuse/expiry, account+IP rate limit, log/audit redaction tests pass.
- [ ] `pnpm verify`, `pnpm test:e2e`, `pnpm audit:prod`, staging health/readiness smoke và `git diff --check` pass.

## Quyết định của chủ dự án

- Trạng thái: `APPROVED`
- Người/ngày: Chủ dự án / 2026-07-14
- Điều kiện/ghi chú: Phê duyệt trực tiếp trong task; phải đồng bộ decisions/spec/checklist trước khi bắt đầu code `P1-01`.

> Chỉ chủ dự án được đổi sang APPROVED. Sau approval mới cập nhật decisions/spec và triển khai.
