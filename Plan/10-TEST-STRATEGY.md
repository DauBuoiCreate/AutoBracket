# 10 - Chiến lược kiểm thử và quality gates

## 1. Mục tiêu

Kiểm thử tập trung vào rủi ro làm sai kết quả giải, sai quyền, mất sự kiện live, lộ dữ liệu và migration production. Coverage là tín hiệu, không thay cho invariant/golden test.

## 2. Các tầng kiểm thử

### Unit

- Pure domain: draw, bracket, round-robin, scoring reducer, standings, qualifier, permissions, entitlement.
- Schema validation, mapping DTO, error code, time/slug/helper có logic.
- Chạy nhanh, không network/DB; deterministic clock/PRNG.

### Property-based

- Generator participant count, seed/pot/tags/constraints hợp lệ và không hợp lệ.
- Invariants: không mất/trùng, capacity, hard constraint, graph nguồn duy nhất, round count/pair count.
- Same input/seed/version same canonical output.
- Score command sequence hợp lệ replay không tạo state vô lý; correction round-trip về score trước.
- Khi fail phải lưu regression seed/example.

### Integration

- PostgreSQL/Redis thật bằng Testcontainers, migration từ blank, transaction, unique/check constraints.
- Repository/service/outbox/jobs/idempotency/concurrency.
- Email/storage/billing adapter dùng fake server/official sandbox; không mock mất contract quan trọng.
- Socket server/client thật cho auth/room/order/resync.

### Contract

- Request/response/event schema, status/error code, public/private DTO.
- Snapshot/consumer compatibility N/N-1 khi deploy rolling.
- Provider webhook fixtures gồm signature và out-of-order.

### E2E

- Playwright cho hành trình user thật qua UI/API.
- Tối thiểu Chromium mỗi PR; Chrome/Firefox/WebKit matrix nightly/pre-release.
- Desktop organizer, mobile scorer, mobile public viewer.
- Không chỉ test happy path: forbidden, quota, invalid draw, network retry, version conflict.

### Visual/accessibility

- Screenshot cho wizard, draw editor, bracket, score pad, public live ở viewport chuẩn.
- Chỉ dùng visual diff cho layout ổn định; dữ liệu/time/animation deterministic.
- axe automated + keyboard/screen-reader manual smoke cho critical flows.

### Performance/resilience

- k6 HTTP/public/socket scenarios; draw benchmark trong domain package.
- DB pool/slow query, Redis unavailable, worker retry, socket reconnect storm, email/billing outage.
- Backup/restore và migration rehearsal là test, không chỉ runbook.

### Security/privacy

- Auth abuse, pre-account verification takeover, token reuse/expiry/supersede/key rotation, email reservation collision, idempotency lost-response, CSRF, trusted proxy, IDOR, role/tier bypass, stored XSS, upload, webhook signature.
- Secret/dependency/container scan.
- Snapshot tests đảm bảo public DTO/event/cache/log không có field private.

## 3. Golden fixtures bắt buộc

### Football

- 4 đội round-robin có win/draw/forfeit.
- 3 đội đồng điểm cần mini-table/head-to-head.
- Sửa result làm đổi top 2 và downstream bracket.

### Volleyball

- Các kết quả 3-0, 3-1, 3-2; match points đủ 3/2/1/0.
- Set quotient và point quotient, kể cả denominator zero.
- Set invalid chưa hơn 2 và deciding set đến 15.

### Badminton

- 21-19, 22-20, 30-29; reject 31 hoặc thắng chưa đủ cách biệt.
- Best-of-3 kết thúc sau 2 hoặc 3 games.
- Tie group theo match/game/point difference/head-to-head.

### Draw/bracket/schedule

- N = 2, 3, 4, 5, 6, 8, 16, 31, 64 và benchmark 1.024.
- Group count uneven, pot thiếu, locked conflict, same-club unsatisfiable.
- BYE top seeds, third-place, qualifier `A1/B2`, avoid same group.
- Odd round-robin, double round, court/rest conflict.

Fixture lưu dưới version; thay output cần CR/ADR nếu thay business behavior, không update snapshot tùy tiện để test xanh.

## 4. Critical E2E scenarios

- `E2E-A` Register → fake email → verify → login → hai device → revoke một session → API deny.
- `E2E-B` Unverified login deny; resend neutral/rate-limited; token cũ hết hiệu lực.
- `E2E-C` Forgot/reset neutral; expired/reused token; old password/session fail; new password login được.
- `E2E-D` Change password cần current password, rotate current/revoke other; logout-all làm mọi context mất quyền.
- `E2E-E` Sửa profile, request/cancel/retry pending email, stale token fail, verify email mới, security notice địa chỉ cũ và login lại.
- `E2E-F` Profile/security/session UI có loading/error/empty, mobile 320/768/1024, keyboard/focus/error-summary và accessibility smoke.
- `E2E-02` Regular tạo 3 giải; giải thứ 4 bị quota; concurrent request không vượt.
- `E2E-03` Owner mời manager/scorer; role deny/withdraw có hiệu lực.
- `E2E-04` Import 16 đội → sửa lỗi → approve → seed/pot → lock.
- `E2E-05` Auto draw 4 bảng → manual swap → validate → publish → public view.
- `E2E-06` Revision mới diff; bản cũ còn public cho tới publish; live match chặn restructure.
- `E2E-07` Generate schedule; conflict court/participant bị chặn.
- `E2E-08` Hai scorer cùng version; một điểm được ghi, client kia resync.
- `E2E-09` Viewer socket disconnect/gap/reconnect nhận snapshot đúng.
- `E2E-10` Result update standings/qualifier/bracket; correction có impact workflow.
- `E2E-11` Announcement schedule/pin/sanitize/public realtime.
- `E2E-12` Billing webhook duplicate/out-of-order và downgrade grace.
- `E2E-13` Admin grant/revoke/lock có MFA, reason và audit.
- `E2E-14` Public crawl không thấy email/contact/draft/internal IDs nhạy cảm.

## 5. Concurrency và idempotency cases

- Retry concurrent/lost-response cho register/login/verify/reset/password-change/email-change chỉ có một commit và replay đúng response/cookie.
- Hai request reserve cùng normalized email hoặc current/pending cross-flow: chỉ một transaction thành công; migration fail nếu backfill có collision.
- Token email cũ/new và security notice out-of-order; worker skip token stale nhưng vẫn gửi notice, provider retry không tạo logical email thứ hai.
- Hai request tạo tournament ở quota boundary.
- Hai manager publish cùng base revision.
- Retry draw job sau crash giữa compute và persist.
- Hai import commit cùng batch/idempotency key.
- Double tap score và mạng retry sau response lost.
- Result correction trong lúc standings worker đang chạy.
- Duplicate/out-of-order outbox và billing events.
- Revoke role trong khi socket đang kết nối.

Expected behavior luôn là một commit chuẩn hoặc conflict có thể resync, không last-write-wins âm thầm.

## 6. Data/migration testing

- Apply toàn bộ migration từ database trống ở CI.
- Upgrade từ snapshot release trước ở staging rehearsal.
- Constraint tests bằng cả service và direct DB insert nơi phù hợp.
- Migration destructive theo expand/backfill/switch/contract; verify row counts/checksum.
- Seed sport preset idempotent và không update version published.
- Backup trước migration rủi ro; restore test có checksum và application smoke.

## 7. Performance scenarios/targets

| Scenario               |                Baseline |                                       Target |
| ---------------------- | ----------------------: | -------------------------------------------: |
| Public tournament read |                 100 RPS |                     p95 < 300 ms, error < 1% |
| Command API            |                  30 RPS |                   p95 < 700 ms trừ async job |
| Live Regular           |     200 concurrent/giải |        event p95 < 2 s, không gap sau resync |
| Live VIP               | tăng dần tới 5.000/giải |                     đạt trước cam kết GA VIP |
| Score commands         |        20/s/match burst |     không duplicate, p95 theo command target |
| Draw                   |      1.024 participants | giới hạn thời gian/memory được baseline ở P3 |
| Reconnect storm        |        30% clients/10 s |           server phục hồi, không DB stampede |
| Auth Argon2 concurrent | 2 active, queue 32       | RSS trong container budget, heartbeat không block; overload `503` đúng contract |

Load test dùng dữ liệu không PII, chạy staging tương đương topology. Nếu target chưa đạt, không giảm target âm thầm; tạo issue/CR hoặc giới hạn capability được owner duyệt.

## 8. Quality gate theo nhịp

### Local trước commit/task handoff

```text
pnpm guard:plan
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:engine   # nếu chạm domain thi đấu
```

### Pull request

- Frozen install, guard, lint, typecheck, unit/property relevant.
- Integration DB/Redis, migration blank, build.
- Playwright Chromium smoke cho flow chịu ảnh hưởng.
- Dependency/secret scan và changed-files policy.

### Phase gate

- Toàn bộ `pnpm verify` và full integration/E2E.
- Browser/mobile/a11y matrix liên quan.
- Security/performance/recovery gate theo phase.
- Handoff có requirement IDs, logs/report/screenshot và residual risk.

### Release gate

- Full regression, NFR, security scan/review, load, backup/restore, migration rehearsal, staging smoke.
- Không flaky test bị rerun cho xanh mà không có issue/owner/timebox.
- Không Sev-1/Sev-2; Sev-3 có explicit acceptance/mitigation.

## 9. Coverage policy

- `packages/domain`: target tối thiểu 90% branch cho core và 100% invariant/format branch quan trọng bằng golden/property tests.
- Identity/permissions/entitlements/scoring service: target 85% branch, deny paths bắt buộc.
- UI: không chạy theo số coverage cao; component interaction + critical E2E.
- Không exclude code khó test để đạt số. Threshold có thể tăng; giảm cần approved CR.

## 10. Test data và chống flaky

- Builders tạo clock/UUID/PRNG cố định; timezone fixtures gồm UTC và Asia/Ho_Chi_Minh.
- Mỗi test tự sở hữu tournament/user/schema transaction; không phụ thuộc thứ tự.
- Không gọi dịch vụ thật trong PR CI; provider sandbox chỉ ở integration job có kiểm soát.
- Chờ theo event/condition, không sleep cứng.
- Network/socket test có timeout/retry ở protocol level, không retry assertion mù.
- Flaky test phải quarantine có issue, owner và hạn xử lý; critical gate không được quarantine.

## 11. Bằng chứng hoàn thành

Handoff ghi commit/revision, commands, exit status, report paths, scenario manual, screenshot nếu UI, migration/rollback note và rủi ro. Câu “tests pass” không kèm lệnh/report không đủ để tick checklist.
