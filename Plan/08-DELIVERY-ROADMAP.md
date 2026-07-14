# 08 - Roadmap triển khai theo vertical slice

## 1. Quy tắc thực thi

- Thứ tự phase là bắt buộc; phase sau không bắt đầu trước gate phase trước.
- Chỉ một task chính `IN_PROGRESS` theo D-024.
- Mỗi task phải tạo outcome chạy được/test được, không chia thuần frontend/backend nhiều tuần.
- Estimate là cỡ công việc, không phải cam kết ngày: `S` (1-2 ngày), `M` (3-5), `L` (1-2 tuần).
- Mỗi task dùng giao thức trong `12-AI-RULES.md` và handoff template.

## 2. P0 - Nền móng có thể chạy (ước lượng 1-2 tuần)

### `P0-01` Bootstrap pnpm monorepo (`M`)

- Outcome: clone repo → Corepack/pnpm install → chạy trang health local bằng một quy trình đã viết.
- Scope: root package, workspace, apps/packages skeleton, TypeScript strict, lint/format, repo guard, version pin, `.env.example`.
- Acceptance: không lockfile lạ; `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm guard:plan` pass.
- Dependencies: baseline plan được chủ dự án cho phép triển khai.

### `P0-02` Data/queue local + migration đầu (`M`)

- Outcome: PostgreSQL/Redis local chạy; Prisma connect/migrate/seed; health check phân biệt liveness/readiness.
- Scope: Docker Compose dev, DB package, baseline identity/tournament schema tối thiểu, test database isolation.
- Acceptance: một lệnh dựng/hạ dev stack; migration từ DB trống pass; integration smoke DB/Redis pass.

### `P0-03` CI, test harness và observability shell (`M`)

- Outcome: pull request có guard/lint/type/unit/build; app log structured/correlation ID và error boundary.
- Scope: Vitest/Playwright/Testcontainers base, CI cache pnpm đúng, scripts verify, ADR/CR/PR templates hook.
- Acceptance: cố ý tạo lockfile lạ/test lỗi làm CI fail; smoke E2E health pass; log không lộ env secret fixture.

### Gate P0

- Repo mới dựng được theo README trên máy sạch.
- `pnpm verify` pass; CI required checks có bằng chứng.
- Staging skeleton deploy được và health/readiness đúng.
- P0 handoff ghi patch versions đã khóa.

## 3. P1 - Tài khoản và khung giải (ước lượng 2-3 tuần)

### `P1-01` Registration/login/session vertical slice (`L`)

- Outcome: user đăng ký, verify email, login/logout, reset mật khẩu và quản lý session.
- Scope: user/email-reservation/credential/session/token/idempotency/audit/outbox schema; identity service/UI; file/HTTPS email adapter; rate limit, secure cookies, key rotation và unit/integration/E2E theo D-026.
- Acceptance: `REQ-ACC-01..05`, `P1-001..007` và `E2E-A..F`; deny/unverified/non-ACTIVE, expired/reused/superseded token, idempotency lost-response, session revoke, Argon2 overload và auth privacy tests pass.

### `P1-02` Hồ sơ, tier và entitlement read model (`M`)

- Outcome: account page hiển thị profile, REGULAR/VIP/admin grant và usage/quota từ server.
- Scope: grant/subscription skeleton schema, entitlement resolver, feature gate primitives, admin grant có expiry/reason.
- Acceptance: REQ-ACC-06..08, REQ-VIP-01..02; không bypass bằng request client sửa tier.

### `P1-03` Tạo giải và lifecycle đầu tiên (`L`)

- Outcome: verified user qua wizard tạo giải và chuyển registration open/closed theo state hợp lệ.
- Scope: tournament schema, slug, sport preset seed, wizard autosave, overview checklist, archive.
- Acceptance: REQ-ORG-01..03/05/07/08; quota active tournament atomic; timezone test.

### `P1-04` Staff invitation và authorization (`M`)

- Outcome: owner mời manager/scorer/viewer; mỗi role chỉ truy cập đúng capability.
- Scope: membership/invitation schema + migration, invitation email/token, role change/revoke, policy middleware, audit.
- Acceptance: REQ-ORG-04; permission matrix deny/IDOR/cross-tournament E2E pass.

### Gate P1

- E2E: register → verify → create tournament → invite manager → role revoke.
- Auth threat-model checklist pass; no high security finding.
- Regular quota test đồng thời không vượt giới hạn.

## 4. P2 - Participant, đội và đăng ký (ước lượng 2-3 tuần)

### `P2-01` Individual/team/roster vertical slice (`L`)

- Outcome: organizer tạo participant cá nhân/đội, roster và xem public-field preview.
- Scope: profile/team/participant CRUD, upload logo, duplicate/eligibility checks, permission.
- Acceptance: REQ-PAR-01..04; type constraint, privacy DTO và roster tests pass.

### `P2-02` Registration workflow + seeding (`M`)

- Outcome: approve/reject/withdraw/check-in, bulk assign seed/pot/tags và chốt danh sách.
- Scope: registration state machine, bulk actions idempotent, eligibility, draw-readiness summary.
- Acceptance: REQ-PAR-05/06/09; invalid transition and concurrent bulk tests pass.

### `P2-03` CSV import/export cơ bản (`L`)

- Outcome: upload, map, preview, commit/rollback import với lỗi theo dòng; export privacy-safe.
- Scope: storage, parse job, batch/row model, templates football/volleyball/badminton.
- Acceptance: REQ-PAR-07/08; duplicate/retry/formula-injection/large-file tests pass.

### `P2-04` Draw readiness advisor (`M`)

- Outcome: hệ thống gợi ý số bảng/format/seeding và liệt kê việc phải sửa trước draw.
- Scope: rule-based advisor explainable từ participant count, duration, courts và preset; không dùng generative AI.
- Acceptance: mỗi suggestion có lý do/input; không tự áp dụng; user accept tạo config draft; edge fixtures pass.

### Gate P2

- E2E: import 16 đội, sửa lỗi, approve, seed/pot, lock registration.
- Không PII trong public/export không có quyền.
- Readiness advisor và quota cho kết quả deterministic.

## 5. P3 - Engine, editor và schedule (ước lượng 4-5 tuần)

### `P3-01` Versioned sport rules + standings core (`L`)

- Outcome: pure engine tính football/volleyball/badminton fixtures đúng và explain tie-break.
- Scope: config schemas, reducers/calculators, golden/property tests, preset version snapshots.
- Acceptance: Domain §6/§10; same input same output; no float tie drift.

### `P3-02` Round-robin/group draw engine (`L`)

- Outcome: generate single/double RR, random/seeded/pot group allocation với hard/soft constraints.
- Scope: PRNG, input canonical/hash, search/penalty explanation, algorithm version, performance limit.
- Acceptance: REQ-DRW-01..05; invariants/property/golden fixtures pass.

### `P3-03` Single-elimination bracket engine (`L`)

- Outcome: generate seeded/unseeded bracket, BYE, third-place và qualifier mapping.
- Scope: canonical placements, graph validation, resolve upstream/downstream.
- Acceptance: REQ-DRW-10; fixtures N=2..64, odd N/BYE and graph invariant pass.

### `P3-04` Draw editor, revision và publish (`L`)

- Outcome: organizer chạy draw, move/swap/lock, undo/redo, validate, review diff và publish immutable revision.
- Scope: command model, accessible editor desktop/mobile, optimistic concurrency, audit/publication preview.
- Acceptance: REQ-DRW-06..09/11; conflict/retry/revision immutability E2E pass.

### `P3-05` Schedule generator/editor (`L`)

- Outcome: matches sinh từ revision, auto assign times/courts, organizer sửa mà không tạo conflict hard.
- Scope: rest/venue constraints, list/calendar UI, warnings/override reason, schedule notifications outbox.
- Acceptance: REQ-MAT-01; no participant/court overlap; odd/BYE schedule fixtures pass.

### Gate P3

- Ba demo tournament từ input đến published draw/schedule.
- Engine coverage branch cao theo test plan; mutation/property tests cho invariant critical.
- Revision đã publish không update được ở DB/service/API.
- Load benchmark draw 1.024 participant trong ngưỡng được chốt trước release.

## 6. P4 - Vận hành trận, realtime và public page (ước lượng 3-4 tuần)

### `P4-01` Match lifecycle + score events (`L`)

- Outcome: scorer mobile check-in/start/pause/score/finalize cho ba preset.
- Scope: command/reducer, append-only event, optimistic version, correction/forfeit, audit.
- Acceptance: REQ-MAT-02..06/09/10; concurrent scorer/idempotency/replay tests pass.

### `P4-02` Standings/bracket projections (`L`)

- Outcome: confirmed result cập nhật standing và downstream bracket; correction hiển thị impact.
- Scope: outbox/jobs, projection version/checksum, qualifier resolution, rebuild command.
- Acceptance: REQ-MAT-07/08; crash/retry/out-of-order/rebuild integration tests pass.

### `P4-03` Public tournament pages (`L`)

- Outcome: slug public có overview/schedule/standings/bracket/team/match responsive và SEO.
- Scope: publication snapshot, cache/ETag, privacy DTO, accessible bracket list, OpenGraph/share.
- Acceptance: REQ-PUB-01..06/09; Lighthouse/a11y/privacy/cache tests pass.

### `P4-04` Realtime live score + announcements (`L`)

- Outcome: viewer nhận live/status/standing/bracket/announcement, reconnect/resync an toàn.
- Scope: Socket.IO rooms/auth, active-session revalidation + revoke/disconnect, Redis adapter, sequence protocol, stale UI, announcement workflow.
- Acceptance: REQ-PUB-07/08/10; p95 live target ở baseline load, gap/duplicate/reconnect tests pass.

### Gate P4

- E2E ba môn từ start match đến public final standings/bracket.
- Load test 200 concurrent Regular viewers không mất update; kịch bản VIP scale được đo.
- Mobile scorer và public accessibility smoke pass.

## 7. P5 - VIP, notification và admin (ước lượng 2-3 tuần)

### `P5-01` Subscription/billing adapter (`L`)

- Outcome: checkout/portal/webhook/grace/downgrade cập nhật entitlement đúng; admin grant vẫn hoạt động.
- Scope: provider adapter sau quyết định OQ, webhook inbox/idempotency, reconciliation job, billing UI.
- Acceptance: REQ-VIP-03..05; invalid signature/out-of-order/refund/failure tests pass.

### `P5-02` VIP capabilities (`M`)

- Outcome: quota lớn, advanced constraints/import/export/branding/analytics cơ bản được gate server.
- Scope: capability gates, branding preview, advanced exports, usage reporting.
- Acceptance: D-021 quota table; downgrade không mất dữ liệu; cross-tier contract tests pass.

### `P5-03` Notifications + admin support (`L`)

- Outcome: in-app/email giao dịch và admin tra cứu/khóa/grant/reconcile có audit.
- Scope: templates, preference tối thiểu, retry/bounce, admin MFA, reason workflow.
- Acceptance: REQ-ADM-01..03 và email phần API; admin không bypass score correction.

### Gate P5

- Billing sandbox end-to-end và reconciliation pass.
- Mọi VIP capability có server deny test.
- Admin threat model/MFA/audit review pass.

## 8. P6 - Hardening và phát hành (ước lượng 2-3 tuần)

### `P6-01` Security/privacy hardening (`L`)

- Outcome: threat model controls, headers, rate limits, secret/dependency/container scan và privacy workflows đạt gate.
- Acceptance: checklist `06-SECURITY-ROLES-VIP.md` không còn critical/high chưa xử lý/accept bằng owner.

### `P6-02` Performance, accessibility và resilience (`L`)

- Outcome: NFR load/web vitals/WCAG, reconnect storm, job retry/dead-letter đạt target.
- Acceptance: NFR-01..12 có evidence; exception phải có approved release waiver.

### `P6-03` Backup/restore, deploy và runbooks (`M`)

- Outcome: staging-to-production pipeline, migration/rollback, backup/restore drill và alerts đã diễn tập.
- Acceptance: RPO/RTO target, restore checksum và incident drill pass.

### `P6-04` Beta → GA release (`M`)

- Outcome: seed demo, support/legal pages, release notes, monitoring window và go/no-go signoff.
- Acceptance: master checklist complete; zero Sev-1/Sev-2 open; rollback owner/on-call rõ.

## 9. Release milestones

- **Internal alpha:** Gate P3 pass; tạo/publish bảng/nhánh/schedule được.
- **Closed beta:** Gate P4 pass; một số giải thật chạy live dưới giám sát.
- **Paid beta:** Gate P5 pass; billing/VIP sandbox rồi production giới hạn.
- **GA:** Gate P6 pass và owner ký go-live checklist.

Không dùng milestone để bỏ qua gate.
