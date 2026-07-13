# 06 - Bảo mật, vai trò và tài khoản VIP

## 1. Mô hình quyền hai lớp

### Platform tier/status

- `REGULAR`: user xác minh email, quota mặc định.
- `VIP`: entitlement/quota nâng cao trong thời gian hiệu lực.
- `ADMIN`: quyền vận hành nền tảng; không mặc định là owner mọi giải.
- Status độc lập: `ACTIVE`, `LOCKED`, `SUSPENDED`, `DELETION_PENDING`.

### Tournament role

- `OWNER`: mọi thao tác giải, transfer ownership, billing liên quan giải.
- `MANAGER`: cấu hình, participant, draw/schedule, announcement; không transfer owner/billing.
- `SCORER`: xem thông tin cần thiết và vận hành match/score được giao; không đổi draw/staff.
- `VIEWER`: dashboard private read-only khi được mời; public viewer ẩn danh không có membership.

Tier không cấp role; role không cấp VIP.

## 2. Permission matrix

| Hành động                  |      Owner      |       Manager        |     Scorer     | Viewer |     Public     |
| -------------------------- | :-------------: | :------------------: | :------------: | :----: | :------------: |
| Sửa thông tin giải         |        ✓        |          ✓           |       -        |   -    |       -        |
| Quản lý staff              |        ✓        | Giới hạn/không Owner |       -        |   -    |       -        |
| Transfer/archive giải      |        ✓        |          -           |       -        |   -    |       -        |
| Quản lý participant/import |        ✓        |          ✓           |       -        |  Read  | Public fields  |
| Chạy/chỉnh/publish draw    |        ✓        |          ✓           |       -        |  Read  | Published only |
| Sửa lịch                   |        ✓        |          ✓           |       -        |  Read  | Published only |
| Nhập live score            |        ✓        |          ✓           |  ✓ được giao   |   -    |       -        |
| Correct result đã chốt     |        ✓        |      ✓ + policy      | Không mặc định |   -    |       -        |
| Đăng thông báo             |        ✓        |          ✓           |       -        |  Read  | Published only |
| Xem audit đầy đủ           |        ✓        |      ✓ giới hạn      |  Own actions   |   -    |       -        |
| Billing/upgrade            | ✓/account owner |          -           |       -        |   -    |       -        |

Permission thực tế còn phụ thuộc tournament/match state, assignment, entitlement và resource version.

## 3. Auth controls

- Password tối thiểu 12 ký tự, chấp nhận passphrase; kiểm tra breached/common password nếu provider có thể tích hợp mà không gửi raw password.
- Argon2id parameters benchmark ở P1 và version trong hash; rehash khi login nếu policy tăng.
- Email verification/reset token random đủ mạnh, chỉ lưu hash, single-use, TTL và rate limit.
- Session cookie `HttpOnly`, `Secure`, `SameSite=Lax` hoặc chặt hơn; rotate sau login/password/role-sensitive event.
- CSRF protection cho cookie-auth mutation; origin check; CORS deny-by-default.
- Login rate limit theo account + IP prefix; error không enumerate user.
- Session page hiển thị thiết bị gần đúng và revoke; đổi mật khẩu revoke session khác.
- MFA cho admin là release gate; MFA owner/VIP là follow-up sớm.

## 4. Authorization pattern

Mỗi command server chạy theo thứ tự:

1. Authenticate active session.
2. Load resource scope và membership.
3. Check platform status.
4. Check permission theo role/action.
5. Check tournament/match lifecycle.
6. Check entitlement/quota nếu action tiêu thụ capability.
7. Check optimistic version/idempotency.
8. Audit allow cho action quan trọng; log deny đã redacted khi cần điều tra.

Không truyền role từ client làm nguồn sự thật. Admin support phải dùng command riêng, reason bắt buộc và audit `ADMIN_*`.

## 5. Entitlement và quota

- Capability keys ổn định: `tournaments.active.max`, `participants.perTournament.max`, `staff.perTournament.max`, `live.viewers.target`, `draw.constraints.advanced`, `imports.bulk`, `exports.advanced`, `branding.advanced`, `analytics.advanced`.
- Entitlement service resolve từ admin grant > active subscription > base tier theo policy rõ; xung đột chọn quyền có expiry gần nhất/ưu tiên đã định, không hard-code rải rác.
- Quota check và create nằm trong cùng transaction hoặc lock phù hợp để tránh race.
- Usage hiển thị `used/limit/asOf`; cache chỉ là optimization.
- Downgrade không xóa dữ liệu. Sau grace: read/export vẫn được, create/publish vượt quota bị chặn với remediation.
- Live score/public page core không bị tắt giữa giải đang live vì thanh toán thất bại; giữ qua grace period và cảnh báo owner.

## 6. Billing controls

- Provider chưa chốt là open question; adapter interface không để provider model lan vào domain.
- Checkout tạo server-side; price ID allowlist; amount/currency không nhận từ client.
- Webhook verify chữ ký trên raw body, lưu provider event ID unique, xử lý idempotent và thứ tự event không đảm bảo.
- Không kích hoạt VIP chỉ dựa vào redirect thành công.
- Refund/chargeback/cancel update subscription/entitlement qua state machine và audit.
- Không lưu số thẻ; dùng hosted checkout/customer portal của provider.
- Admin grant VIP có reason, start/end, người cấp; không sửa trực tiếp tier DB.

## 7. Dữ liệu và privacy

- Phân loại: Public, Internal, Personal, Sensitive/Secret.
- Public DTO dùng allowlist; tuyệt đối không `select *`/serialize ORM entity ra public.
- Contact, ngày sinh đầy đủ, private note không xuất hiện ở public HTML, JSON, cache, log hoặc realtime payload.
- Object storage private mặc định; logo/public asset publish qua key/URL được kiểm soát; upload scan/type/size limit.
- Export cần quyền, audit, link ký hết hạn; background job không gửi file vào log/email attachment tùy tiện.
- Account deletion pseudonymize PII nhưng giữ audit/competition integrity theo policy.
- Staging/dev không dùng production dump chưa anonymize.

## 8. Web/API hardening

- Validate input server-side với limit độ dài/số lượng/nesting.
- Escape output mặc định; announcement rich text sanitize allowlist, chặn stored XSS.
- CSP, HSTS, frame-ancestors, nosniff, referrer policy và permission policy.
- Upload kiểm MIME thực, extension, kích thước, pixel bomb; tên file không dùng làm path.
- SSRF: không fetch URL arbitrary; stream embed allowlist khi feature được duyệt.
- SQL qua ORM/parameterized query; raw SQL phải review/test.
- Slug/public endpoints rate limit/caching chống scraping/DDoS ở mức phù hợp.
- Socket handshake auth/room authorization; public chỉ join publication room, scorer room cần membership/assignment.

## 9. Realtime security

- Token/socket session ngắn hạn hoặc cookie auth cùng origin; revalidate khi role revoked.
- Client không được emit “broadcast score”; chỉ gửi command được validate, server tạo event.
- Room name không chứa secret/PII; join response không lộ private tournament.
- Sequence/event payload versioned và allowlist public fields.
- Per-socket/user/match rate limit; phát hiện reconnect storm.
- Revoke scorer/lock account ngắt socket hoặc khiến command tiếp theo bị deny ngay.

## 10. Audit events bắt buộc

Auth sensitive, role/invite, tier/grant/subscription, create/archive tournament, registration override, draw generate/edit/publish, schedule override, match start/correction/finalize, announcement publish, export, admin action và security setting change.

Audit before/after phải redacted; hash/token/password không bao giờ vào diff.

## 11. Security release checklist

- Threat model cho auth, draw integrity, scoring, public leakage, billing webhook, upload/import.
- Dependency audit và secret scan pass; image/container scan không có high/critical chưa chấp nhận.
- Auth/authorization integration tests cho deny cases, IDOR và cross-tournament access.
- CSRF/XSS/rate-limit/upload/webhook test.
- Admin MFA, least privilege DB/storage/CI, key rotation runbook.
- Backup encrypted và restore drill; audit tamper controls.
- Incident response contact, severity và token/session revocation procedure.
