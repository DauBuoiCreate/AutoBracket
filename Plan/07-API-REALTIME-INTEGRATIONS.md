# 07 - API, realtime và tích hợp

## 1. Quy ước HTTP API

- Namespace `/api/v1`; JSON UTF-8; thời gian ISO-8601 UTC.
- Resource ID UUID private; public ID/slug riêng, không suy diễn dữ liệu private.
- Input/output validate bằng contract schema trong `packages/contracts`.
- List dùng cursor pagination; filter/sort allowlist; limit tối đa.
- Mutation quan trọng nhận `Idempotency-Key` và `If-Match`/`expectedVersion`.
- Success create `201`, async `202`, empty `204`; error code ổn định.
- Không trả ORM entity; DTO public/private/admin tách rõ.

### Error envelope

```json
{
  "error": {
    "code": "DRAW_CONSTRAINT_UNSATISFIED",
    "message": "Không thể chia bảng với ràng buộc hiện tại.",
    "details": [],
    "correlationId": "..."
  }
}
```

Các code cốt lõi: `AUTH_REQUIRED`, `INVALID_CREDENTIALS`, `EMAIL_VERIFICATION_REQUIRED`, `ACCOUNT_UNAVAILABLE`, `TOKEN_INVALID_OR_EXPIRED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_FAILED`, `VERSION_CONFLICT`, `IDEMPOTENCY_CONFLICT`, `QUOTA_EXCEEDED`, `INVALID_STATE_TRANSITION`, `DRAW_INVALID`, `SCHEDULE_CONFLICT`, `SCORE_RULE_VIOLATION`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE`.

## 2. Endpoint inventory MVP

### Identity

- `POST /auth/register`, `/auth/login`, `/auth/logout`
- `POST /auth/email/verify`, `/auth/email/resend`
- `POST /auth/password/forgot`, `/auth/password/reset`, `/auth/password/change`
- `GET /me`, `PATCH /me`, `GET /me/sessions`, `DELETE /me/sessions/:id`
- `GET /me/entitlements`, `/me/usage`

### Tournament/staff

- `GET/POST /tournaments`, `GET/PATCH /tournaments/:id`
- `POST /tournaments/:id/transitions`, `/archive`, `/clone`
- `GET/POST /tournaments/:id/invitations`, `DELETE /.../:inviteId`
- `GET/PATCH/DELETE /tournaments/:id/members/:memberId`
- `GET /tournaments/:id/audit`

### Participants/import

- `GET/POST /tournaments/:id/participants`, `GET/PATCH /.../:participantId`
- `GET/POST /tournaments/:id/teams`, `GET/PATCH /.../teams/:teamId`
- `POST/DELETE /.../teams/:teamId/roster`
- `GET/POST/PATCH /tournaments/:id/registrations`
- `POST /tournaments/:id/imports`, `GET /imports/:batchId`, `POST /imports/:batchId/commit|rollback`

### Stage/draw/bracket/schedule

- `GET/POST/PATCH /tournaments/:id/stages`
- `POST /stages/:id/draw/preflight`, `/draw/generate`
- `GET /stages/:id/draw/revisions`, `GET /draw/revisions/:id`
- `POST /draw/revisions/:id/commands`, `/validate`, `/publish`
- `POST /draw/revisions/:id/retry` với locked assignments
- `GET /stages/:id/bracket`, `GET/PATCH /stages/:id/schedule`
- `POST /stages/:id/schedule/generate`, `/schedule/validate`

### Match/scoring

- `GET/PATCH /matches/:id`
- `POST /matches/:id/transitions`
- `GET /matches/:id/score/snapshot`
- `GET /matches/:id/score/events?afterSequence=`
- `POST /matches/:id/score/commands`
- `POST /matches/:id/result/propose|confirm|correct`

### Publishing/public

- `GET /tournaments/:id/publication/preview`
- `POST /tournaments/:id/publications`
- `GET/POST/PATCH /tournaments/:id/announcements`
- `GET /public/tournaments/:slug`
- `GET /public/tournaments/:slug/schedule|standings|bracket|announcements`
- `GET /public/matches/:publicId`, `/public/matches/:publicId/score`

### Billing/admin

- `POST /billing/checkout`, `/billing/portal`; `GET /billing/subscription`
- `POST /webhooks/billing/:provider`
- Admin endpoints namespace `/api/v1/admin`, yêu cầu admin MFA và reason cho mutation.

Inventory là contract định hướng; mỗi endpoint chỉ được implement khi phase tương ứng yêu cầu.

### Identity contract P1-01

Tất cả endpoint dưới đây ở `/api/v1`, reject field lạ, private response `Cache-Control: no-store`, mutation yêu cầu `Idempotency-Key` UUID v4 theo D-026:

- `POST /auth/register`: `{ email, password, displayName, acceptTerms: true }` → luôn `202 { data: { accepted: true } }` cho email mới/trùng.
- `POST /auth/login`: `{ email, password }` → `200 { data: { user: MeDto } }` + rotated session cookie.
- `POST /auth/logout`: body trống hoặc `{ scope: "current" | "all" }` → `204`, luôn clear cookie hiện tại.
- `POST /auth/email/verify`: `{ token, password }` → `200 { data: { emailVerified: true, sessionRevoked } }`; password phải khớp credential hiện tại.
- `POST /auth/email/resend`: `{ email }` → neutral `202 { data: { accepted: true } }`.
- `POST /auth/password/forgot`: `{ email }` → neutral `202 { data: { accepted: true } }`.
- `POST /auth/password/reset`: `{ token, newPassword }` → `204`; revoke session, supersede token và pending email; account chưa verify được verify current email bằng proof reset.
- `POST /auth/password/change`: `{ currentPassword, newPassword }` → `204` + cookie mới; revoke mọi session cũ.
- `GET /me` trả `MeDto` gồm `id`, `email`, `displayName`, `emailVerified`, `pendingEmail`, `locale`, `defaultTimezone`, `version`; không trả tier/usage trước P1-02.
- `PATCH /me`: `{ expectedVersion, displayName?, defaultTimezone?, email?, cancelPendingEmail?, currentPassword? }`; email/cancel pending loại trừ nhau và cần current password; conflict trả `409 VERSION_CONFLICT`.
- `GET /me/sessions?cursor=<opaque>&limit=<1..50>` trả safe device DTO, default 20, sort `(createdAt DESC, publicId DESC)`. Signed cursor chứa cả hai sort value và TTL 15 phút.
- `DELETE /me/sessions/:publicId` → `204` cho session thuộc user; missing/cross-user cùng `404`; current session đồng thời clear cookie.

Token email/reset có wire format/version/HMAC, fragment transport và TTL theo D-026. Email mới được giữ bằng reservation `PENDING`; swap sang `CURRENT` revoke mọi session và phát security notice tới reservation `FORMER`.

### Identity idempotency P1-01

- Scope authenticated là `(userId, method, route-template, key)`; anonymous dùng subject HMAC từ canonical email/token ID/session hash hoặc IP-prefix theo contract.
- Record `IN_PROGRESS/COMPLETED` và HMAC fingerprint được ghi cùng business transaction, TTL 24 giờ; raw key/password/token/cookie/email không được lưu.
- Cùng key khác fingerprint trả `409 IDEMPOTENCY_CONFLICT`; exact retry replay status/body/safe headers. Login/password-change tái tạo đúng cookie cũ từ session public ID mà không tạo session hoặc kéo dài TTL.
- Completed lookup chỉ replay exact request; nếu không khớp tuyệt đối thì token used/session revoked vẫn bị deny bình thường. Concurrent duplicate và crash/lost-response trước/sau commit là integration gate.

## 3. Realtime protocol

### Connection và rooms

- Namespace public và authenticated có thể cùng server nhưng middleware/quota khác.
- Rooms: `publication:<publicId>`, `match:<publicMatchId>`, `tournament-admin:<tournamentId>`.
- Client gửi `lastSequence`/`lastProjectionVersion` khi subscribe.
- Server trả `SUBSCRIBED` kèm current version hoặc yêu cầu `RESYNC_REQUIRED`.

### Server events public

- `MATCH_STATUS_CHANGED`
- `SCORE_UPDATED`
- `RESULT_CONFIRMED`
- `STANDINGS_UPDATED`
- `BRACKET_UPDATED`
- `SCHEDULE_UPDATED`
- `ANNOUNCEMENT_PUBLISHED`
- `PUBLICATION_UPDATED`
- `RESYNC_REQUIRED`

Envelope:

```json
{
  "eventId": "uuid",
  "type": "SCORE_UPDATED",
  "schemaVersion": 1,
  "scope": { "matchPublicId": "..." },
  "sequence": 42,
  "occurredAt": "2026-07-13T06:00:00Z",
  "payload": {}
}
```

Socket event là hint/update transport, không thay durable API/snapshot. Public payload dùng allowlist.

### Client algorithm

1. Load HTTP snapshot với `version/sequence`.
2. Subscribe với last sequence.
3. Apply event nếu sequence kế tiếp; bỏ duplicate event ID.
4. Nếu gap/out-of-order quá cửa sổ, pause optimistic view và fetch snapshot.
5. Hiển thị `lastUpdated`/stale khi disconnected.

## 4. Score command contract

Client scorer gửi command, không gửi projection tùy ý:

```json
{
  "commandId": "uuid",
  "type": "AWARD_POINT",
  "side": "A",
  "expectedVersion": 17,
  "occurredAt": "...",
  "metadata": { "source": "score-pad" }
}
```

Server authorize, validate preset, append event trong transaction, trả `scoreVersion`, `sequence`, snapshot delta. Conflict trả `VERSION_CONFLICT` cùng current version để resync. Correction yêu cầu target event/reason và permission cao hơn theo state.

## 5. Async jobs

Queues/job types:

- `outbox.dispatch`
- `email.transactional`
- `draw.generate` khi input lớn
- `standings.recompute`
- `bracket.resolve`
- `public.snapshot.build`
- `import.parse`, `import.commit`
- `export.generate`
- `notification.deliver`
- `billing.webhook.process`
- `maintenance.cleanup`, `backup.verify` orchestration note

Mỗi job có schema version, idempotency/dedupe key, retry policy, timeout, metrics và dead-letter procedure. Job business không phụ thuộc process-local memory.

## 6. Outbox ordering

- DB command ghi outbox event với aggregate version.
- Dispatcher publish Redis/queue sau commit.
- Consumer dedupe event ID và kiểm aggregate version; late event không rollback projection mới.
- Cùng match cần giữ thứ tự sequence; khác match có thể song song.
- Poison event vào dead letter sau retry, alert có correlation ID; không drop im lặng.

## 7. Email/notification

MVP email: verify, reset password, invitation, role revoked, tournament published/rescheduled quan trọng, billing state. Announcement không mặc định email tất cả nếu chưa opt-in/policy.

- Template versioned, locale-ready, link dùng canonical HTTPS.
- Dedupe key tránh gửi trùng khi retry.
- Bounce/complaint cập nhật delivery status; không log nội dung nhạy cảm.
- In-app notification có read timestamp; public announcement là entity riêng.

Identity email tách `IDENTITY_TOKEN_EMAIL_REQUESTED` khỏi `IDENTITY_SECURITY_EMAIL_REQUESTED`, đều schema version 1 và không mang raw token/recipient. BullMQ dùng `jobId=outboxEventId`; token job chỉ gửi record active/latest, security notice dùng referenced reservation và không áp token rule. Adapter nhận `Idempotency-Key=outboxEventId`.

CI/local staging synthetic dùng file-mailbox atomic theo event ID. HTTPS adapter chỉ dùng validated server endpoint, TLS bắt buộc, không redirect, timeout 5 giây, retry exponential tối đa 5 lần rồi dead-letter/alert; không log body/secret. Provider thật phải được owner cấp trước UAT/staging có user và không muộn hơn Gate P1.

## 8. Billing adapter

Interface domain: create checkout, create portal, verify/parse webhook, fetch subscription reconciliation. Provider event chuyển thành internal commands; raw provider status không lan ra entitlement checks.

Các tình huống test: duplicate webhook, out-of-order, delayed success, failed payment, cancel at period end, refund, unknown price, invalid signature.

## 9. File storage/import/export

- Presigned upload/download hoặc server proxy theo loại file; key do server tạo.
- Max size/type, checksum, scan status và ownership metadata.
- CSV parse streaming, formula injection mitigation khi export, encoding UTF-8/BOM policy rõ.
- Export job tạo file tạm, signed URL expiry; audit request/download.
- Xóa object theo retention sau khi DB record xác nhận; orphan cleanup job có dry-run.

## 10. API/realtime acceptance gate

- Contract schema và error code có test; breaking change bị chặn/versioned.
- IDOR/cross-tournament deny tests cho mọi resource mutation.
- Idempotency test chạy cùng command hai lần chỉ có một side effect.
- Concurrency test hai scorer cùng expected version: một thành công, một conflict/resync.
- Socket gap/reconnect/duplicate/out-of-order tests.
- Outbox crash-before/after-publish tests không mất hoặc double-apply business effect.
- Public payload snapshot test không có private fields.
