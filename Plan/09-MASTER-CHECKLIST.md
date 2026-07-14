# 09 - Master checklist

> Checklist này là bản điều hành. Tick `[x]` chỉ khi task/tiêu chí có bằng chứng trong `Plan/handoffs/`. Trạng thái ban đầu đều chưa hoàn thành.

## A. Governance trước khi code

- [x] `GOV-001` Chủ dự án cho phép bắt đầu P0.
- [x] `GOV-002` Mọi agent xác nhận đã đọc `AGENTS.md` và tài liệu bắt buộc.
- [x] `GOV-003` Task đầu tiên có ID, scope, out-of-scope, acceptance và verify commands.
- [x] `GOV-004` Patch version Node/pnpm/dependencies nền tảng được ghi trong handoff P0.
- [x] `GOV-005` CR/ADR directories chỉ chứa hồ sơ thật, không có approval giả.
- [x] `GOV-006` PR template bắt buộc Task ID/decision impact/test evidence.
- [x] `GOV-007` `pnpm guard:plan` chặn lockfile/package-manager/structure sai.

## B. P0 - Nền móng

- [x] `P0-001` Tạo root `package.json` private và khóa `packageManager` pnpm.
- [x] `P0-002` Tạo `pnpm-workspace.yaml` đúng apps/packages.
- [x] `P0-003` Tạo apps web/realtime/worker có health entrypoint.
- [x] `P0-004` Tạo packages domain/db/contracts/ui/config/testkit với boundary rõ.
- [x] `P0-005` Bật TypeScript strict và project references/path policy.
- [x] `P0-006` Cấu hình format/lint không xung đột.
- [x] `P0-007` Cấu hình root scripts theo kiến trúc.
- [x] `P0-008` Tạo `.env.example` và env validation per process.
- [x] `P0-009` Docker Compose local PostgreSQL/Redis chạy có health check.
- [x] `P0-010` Prisma migration/seed DB trống pass.
- [x] `P0-011` Test DB isolation và Redis integration smoke pass.
- [x] `P0-012` Vitest/fast-check/Playwright/Testcontainers harness chạy sample.
- [x] `P0-013` Structured log, correlation ID, error boundary/readiness.
- [x] `P0-014` CI frozen install/cache/lint/type/test/build/guard pass.
- [x] `P0-015` Máy sạch chạy theo README không cần bước ngầm.
- [x] `P0-GATE` Gate P0 và handoff được chủ dự án chấp nhận.

## C. P1 - Identity, tier và giải

- [ ] `P1-001` Schema user/email-reservation/credential/session/token/idempotency/audit/outbox có migration/test.
- [ ] `P1-002` Register validate input/password/rate-limit và không tạo account trùng.
- [ ] `P1-003` Verify email single-use/expiry/resend rate-limit.
- [ ] `P1-004` Login cookie an toàn, session rotate và auth audit.
- [ ] `P1-005` Logout current/all sessions; revoked/expired/non-ACTIVE session bị HTTP API và shared DB session resolver từ chối.
- [ ] `P1-006` Forgot/reset/change password không enumerate và revoke session đúng.
- [ ] `P1-007` Profile/security/session UI đủ loading/error/empty/mobile.
- [ ] `P1-008` Schema grant/subscription skeleton + entitlement resolver + quota server tests REGULAR/VIP/ADMIN.
- [ ] `P1-009` Admin grant VIP có expiry/reason/audit; không update tier thẳng.
- [ ] `P1-010` Tournament wizard autosave và resume.
- [ ] `P1-011` Slug normalize/unique/reserved words.
- [ ] `P1-012` Seed sport preset v1 idempotent.
- [ ] `P1-013` Lifecycle transition policy + invalid transition tests.
- [ ] `P1-014` Active tournament quota atomic khi request đồng thời.
- [ ] `P1-015` Archive/restore và public draft visibility đúng.
- [ ] `P1-016` Clone config giải không lộ/copy PII hoặc score ngoài lựa chọn rõ.
- [ ] `P1-017` Schema membership/invitation + accept/expire/revoke/email match có migration/test.
- [ ] `P1-018` Role permission/IDOR/cross-tournament matrix pass.
- [ ] `P1-019` Owner transfer giữ ít nhất một owner.
- [ ] `P1-GATE` E2E P1, security review và handoff pass.

## D. P2 - Participant, roster và import

- [ ] `P2-001` Member profile public/private field policy.
- [ ] `P2-002` Team CRUD, logo validation và captain.
- [ ] `P2-003` Roster unique/eligibility/number validation.
- [ ] `P2-004` Participant TEAM/INDIVIDUAL DB check constraint.
- [ ] `P2-005` Registration state machine và audit.
- [ ] `P2-006` Bulk approve/reject/seed/pot/tag idempotent.
- [ ] `P2-007` Lock danh sách và override/reopen có reason.
- [ ] `P2-008` Usage/quota participant không race.
- [ ] `P2-009` CSV templates cho ba môn/loại participant.
- [ ] `P2-010` Upload checksum/type/size/storage permission.
- [ ] `P2-011` Column mapping/preview/error per row/duplicate detection.
- [ ] `P2-012` Import job retry không duplicate; batch rollback đúng điều kiện.
- [ ] `P2-013` Export chống CSV formula injection và loại PII theo quyền.
- [ ] `P2-014` Readiness advisor gợi ý format/group/count có lý do.
- [ ] `P2-015` Suggestion không tự apply; accept tạo config draft có audit.
- [ ] `P2-GATE` E2E import 16 đội → approve/seed/lock pass.

## E. P3 - Engine và chỉnh bảng

- [ ] `P3-001` Sport rule schema versioned và snapshot immutable.
- [ ] `P3-002` Football scoring/ranking/tie-break trace golden tests.
- [ ] `P3-003` Volleyball set/match points/quotient golden tests.
- [ ] `P3-004` Badminton cap/game/ranking golden tests.
- [ ] `P3-005` Round-robin single/double/odd/BYE fixtures.
- [ ] `P3-006` PRNG seeded; không `Math.random()` trong engine.
- [ ] `P3-007` Canonical input/hash/output/checksum ổn định.
- [ ] `P3-008` RANDOM/SEEDED_BALANCED/POT_DRAW modes.
- [ ] `P3-009` Locked assignment và rerun remainder.
- [ ] `P3-010` Hard constraint fail có explanation.
- [ ] `P3-011` Soft constraint penalty/report deterministic.
- [ ] `P3-012` Property test không mất/trùng, capacity/seed invariant.
- [ ] `P3-013` Single elimination canonical seeds N=2..64.
- [ ] `P3-014` BYE, third-place và qualifier sources.
- [ ] `P3-015` Bracket graph no-cycle/source invariant.
- [ ] `P3-016` Draw preflight API và async/idempotent generation.
- [ ] `P3-017` Editor move/swap/reorder/lock/unlock.
- [ ] `P3-018` Undo/redo command timeline và concurrency conflict.
- [ ] `P3-019` Accessible keyboard/mobile alternative cho drag-drop.
- [ ] `P3-020` Validate thiếu/trùng/capacity/mapping sau mỗi command.
- [ ] `P3-021` Revision diff preview và publish atomic.
- [ ] `P3-022` Published revision immutable ở DB/service/API.
- [ ] `P3-023` Chặn restructure khi match live/completed.
- [ ] `P3-024` Generate matches/schedule từ active revision.
- [ ] `P3-025` Court/participant overlap hard check.
- [ ] `P3-026` Rest/buffer warning và override reason.
- [ ] `P3-GATE` Demo ba môn + benchmark + engine review pass.

## F. P4 - Match, live và public

- [ ] `P4-001` Match state machine + transition authorization.
- [ ] `P4-002` Score event append-only unique sequence/idempotency.
- [ ] `P4-003` Pure reducer replay cho cùng checksum.
- [ ] `P4-004` Mobile score pad optimistic/pending/conflict/resync states.
- [ ] `P4-005` Double tap/retry không double score.
- [ ] `P4-006` Pause/resume/set end/match end validate preset.
- [ ] `P4-007` Forfeit/cancel/postpone là result type riêng.
- [ ] `P4-008` Correction event có target/reason/permission/audit.
- [ ] `P4-009` Confirm result optimistic version.
- [ ] `P4-010` Transaction score/result + audit + outbox atomic.
- [ ] `P4-011` Standings recompute/rebuild/checksum.
- [ ] `P4-012` Qualifier resolve và bracket downstream update.
- [ ] `P4-013` Upstream correction impact detection/resolution.
- [ ] `P4-014` Public snapshot allowlist và active publication only.
- [ ] `P4-015` Public overview/schedule/filter/live badge.
- [ ] `P4-016` Standings tie-break explanation.
- [ ] `P4-017` Responsive bracket + accessible list fallback.
- [ ] `P4-018` Public team/player/match privacy.
- [ ] `P4-019` SEO/OpenGraph/share/QR/canonical URL.
- [ ] `P4-020` Socket room authorization, session revoke/disconnect và payload allowlist.
- [ ] `P4-021` Sequence/dedupe/gap/resync/reconnect protocol.
- [ ] `P4-022` Redis adapter multi-instance test.
- [ ] `P4-023` Stale/offline last-updated UI.
- [ ] `P4-024` Announcement draft/schedule/pin/publish/sanitize.
- [ ] `P4-025` Live p95 và Regular concurrent viewer load target.
- [ ] `P4-GATE` E2E ba môn đến public final + load/a11y pass.

## G. P5 - VIP, billing, notification và admin

- [ ] `P5-001` Provider/price/pricing được chủ dự án chốt bằng CR/decision.
- [ ] `P5-002` Hosted checkout/portal server-side allowlist.
- [ ] `P5-003` Webhook raw-body signature verification.
- [ ] `P5-004` Provider event unique/idempotent/out-of-order safe.
- [ ] `P5-005` Subscription/grace/downgrade/cancel/refund lifecycle.
- [ ] `P5-006` Entitlement reconciliation scheduled/on-demand.
- [ ] `P5-007` Không activate VIP dựa vào redirect client.
- [ ] `P5-008` Downgrade không xóa/ẩn dữ liệu đang có.
- [ ] `P5-009` Advanced quota/constraints/import/export gate server.
- [ ] `P5-010` Branding/analytics capability tests.
- [ ] `P5-011` Email template version/dedupe/retry/bounce.
- [ ] `P5-012` In-app notification read/unread/preferences cơ bản.
- [ ] `P5-013` Admin MFA và separate admin namespace.
- [ ] `P5-014` Lock/unlock user, VIP grant, lookup có reason/audit.
- [ ] `P5-015` Admin result correction không bypass workflow.
- [ ] `P5-GATE` Billing sandbox + entitlement/admin security pass.

## H. P6 - Production readiness

- [ ] `P6-001` Threat model được review cho sáu luồng critical.
- [ ] `P6-002` CSRF/CSP/HSTS/XSS/SSRF/upload protections test.
- [ ] `P6-003` Rate limit auth/API/socket và reconnect storm test.
- [ ] `P6-004` Secret/dependency/container scan pass.
- [ ] `P6-005` WCAG 2.2 AA flow cốt lõi; keyboard/screen reader smoke.
- [ ] `P6-006` Web Vitals/API/live/load NFR evidence.
- [ ] `P6-007` Job retry/dead-letter/runbook và alert thử nghiệm.
- [ ] `P6-008` DB/Redis/socket saturation dashboards/alerts.
- [ ] `P6-009` Automated backup encrypted và retention.
- [ ] `P6-010` Restore drill sang môi trường sạch có checksum/RPO/RTO.
- [ ] `P6-011` Expand/backfill/switch migration rehearsal.
- [ ] `P6-012` Staging/prod secrets, least privilege và network isolation.
- [ ] `P6-013` Deploy/rollback/smoke scripts có dry run.
- [ ] `P6-014` Privacy export/delete/retention jobs test.
- [ ] `P6-015` Terms/privacy/support/status/incident contact sẵn sàng.
- [ ] `P6-016` Beta feedback/known issues/release notes.
- [ ] `P6-017` Go/no-go owner, on-call và rollback decision maker.
- [ ] `P6-GATE` Không Sev-1/2 mở; GA checklist được ký.

## I. Kiểm tra không lệch kế hoạch ở mỗi task

- [ ] `AI-001` Task ID tồn tại và dependency đã hoàn thành.
- [ ] `AI-002` Không đổi quyết định LOCKED/stack/scope mà thiếu CR.
- [ ] `AI-003` Không có dependency hoặc file lock ngoài pnpm.
- [ ] `AI-004` Domain logic đúng package, không duplicate client/server.
- [ ] `AI-005` Permission/tier/quota enforce server.
- [ ] `AI-006` Migration/API/event compatible và versioned.
- [ ] `AI-007` Test phù hợp được thêm/chạy và evidence thật.
- [ ] `AI-008` Docs/state/checklist chỉ cập nhật theo kết quả.
- [ ] `AI-009` Unrelated changes được bảo toàn và báo rõ.
- [ ] `AI-010` Handoff có rủi ro/rollback/next authorized task.
