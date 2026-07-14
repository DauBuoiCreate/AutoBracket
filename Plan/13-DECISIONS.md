# 13 - Sổ quyết định ban đầu

Tất cả quyết định dưới đây có trạng thái `LOCKED` kể từ 2026-07-13. Muốn thay đổi phải theo `14-CHANGELOG-AND-CHANGE-CONTROL.md`.

| ID    | Quyết định đã khóa                                                                                                                                                     | Lý do/tác động                                                                                                   |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| D-001 | Chỉ dùng `pnpm` workspace; không npm/Yarn/Bun.                                                                                                                         | Một toolchain và lockfile duy nhất.                                                                              |
| D-002 | TypeScript strict end-to-end.                                                                                                                                          | Chia sẻ contract/domain, giảm sai luật.                                                                          |
| D-003 | Monorepo gồm `apps/web`, `apps/realtime`, `apps/worker`, `packages/domain`, `packages/db`, `packages/ui`, `packages/contracts`, `packages/config`, `packages/testkit`. | Core theo modular monolith, adapter process tách theo runtime; contract/test fixture dùng chung có ranh giới rõ. |
| D-004 | `apps/web` dùng Next.js App Router; UI dùng React, Tailwind CSS và component primitives accessible.                                                                    | SSR/public SEO, dashboard và API cùng hệ sinh thái.                                                              |
| D-005 | PostgreSQL là nguồn dữ liệu chuẩn; Prisma quản lý schema/migration.                                                                                                    | Transaction, constraint và relational domain phù hợp.                                                            |
| D-006 | Redis phục vụ cache ngắn hạn, BullMQ jobs và Socket.IO pub/sub; không là nguồn dữ liệu chuẩn.                                                                          | Realtime/job scale-out nhưng không mất dữ liệu chính.                                                            |
| D-007 | Production đầu tiên chạy Docker trên VPS/VM lâu dài; local dùng Docker Compose.                                                                                        | Hỗ trợ process và WebSocket lâu dài.                                                                             |
| D-008 | Engine thi đấu là pure TypeScript trong `packages/domain`, versioned, không phụ thuộc DB/UI.                                                                           | Deterministic và test độc lập.                                                                                   |
| D-009 | ID dùng UUID; thời gian lưu UTC; mỗi giải có timezone IANA, default `Asia/Ho_Chi_Minh`.                                                                                | Đồng nhất thời gian và phân tán.                                                                                 |
| D-010 | Auth dùng email/password băm Argon2id, email verification, session DB cookie HttpOnly/Secure/SameSite. OAuth là follow-up.                                             | Đáp ứng user base, kiểm soát session.                                                                            |
| D-011 | Platform tier `REGULAR/VIP/ADMIN` tách khỏi tournament role `OWNER/MANAGER/SCORER/VIEWER`.                                                                             | Tránh dùng gói trả phí như quyền nghiệp vụ.                                                                      |
| D-012 | Public tournament đọc không cần login khi trạng thái publish; draft/private luôn được bảo vệ.                                                                          | Chia sẻ kết quả thuận tiện mà không lộ bản nháp.                                                                 |
| D-013 | Tournament lifecycle: `DRAFT → REGISTRATION_OPEN → REGISTRATION_CLOSED → DRAW_READY → DRAWN → PUBLISHED → LIVE → COMPLETED → ARCHIVED`.                                | Điều khiển thao tác hợp lệ và audit.                                                                             |
| D-014 | Draw/bracket dùng revision immutable sau publish; chỉnh sửa tạo draft revision mới.                                                                                    | Không sửa ngầm dữ liệu khán giả đã xem.                                                                          |
| D-015 | Auto draw deterministic bằng input snapshot + algorithm version + random seed; lưu hash và audit.                                                                      | Tái lập và xử lý tranh chấp.                                                                                     |
| D-016 | MVP hỗ trợ round-robin đơn/đôi, group + single elimination, single elimination, BYE và tranh hạng ba tùy chọn.                                                         | Đủ cho ba môn mục tiêu; giới hạn scope.                                                                          |
| D-017 | Football, volleyball, badminton là sport preset có version; giải có thể override các field cho phép và snapshot khi publish.                                           | Linh hoạt nhưng kết quả lịch sử không đổi theo preset mới.                                                       |
| D-018 | Score dùng append-only event + projection; undo bằng compensating event; finalize có optimistic version.                                                               | Realtime bền vững và truy vết được.                                                                              |
| D-019 | Public realtime dùng Socket.IO; client reconnect bằng last sequence và fallback snapshot.                                                                              | Trải nghiệm live và phục hồi mất kết nối.                                                                        |
| D-020 | Quota/entitlement kiểm tra ở server và lưu cấu hình, không hard-code trong UI.                                                                                         | Không bypass VIP; dễ điều chỉnh bằng CR/config.                                                                  |
| D-021 | Regular vẫn có public page và live score cốt lõi; VIP mở quota lớn và khả năng nâng cao.                                                                               | Chức năng chính không bị paywall hoàn toàn.                                                                      |
| D-022 | Test stack: Vitest, fast-check, Playwright, Testcontainers; load test dùng k6 ở release gate.                                                                          | Phù hợp engine và luồng full-stack.                                                                              |
| D-023 | Observability gồm structured logs, error tracking, metrics và audit log; không log password/token/PII nhạy cảm.                                                        | Vận hành và bảo mật.                                                                                             |
| D-024 | Chỉ một task chính `IN_PROGRESS`; không bắt đầu phase sau khi gate phase trước chưa pass.                                                                              | Giảm work-in-progress và lệch kế hoạch.                                                                          |
| D-025 | Gợi ý cấu hình MVP là rule-based, deterministic, explainable và chỉ áp dụng khi user xác nhận; generative AI không thuộc MVP.                                          | Hữu ích nhưng không làm thay đổi giải âm thầm.                                                                   |
| D-026 | Contract identity `P1-01` tuân theo `CR-2026-001`: email reservation duy nhất, Argon2id PHC, DB session cookie, signed token/cursor, idempotency, rate-limit, auth audit và transactional email outbox. | Khóa một implementation contract bảo mật có thể kiểm thử; ngăn agent tự chọn schema/API/security khác sau approval. |

## Default quota ban đầu

Các quota là quyết định sản phẩm ban đầu, enforce từ server và có thể thay đổi qua CR mà không phải đổi kiến trúc.

| Capability                         |         REGULAR |                        VIP |          ADMIN |
| ---------------------------------- | --------------: | -------------------------: | -------------: |
| Giải active do mình sở hữu         |               3 |                         50 | Không giới hạn |
| Participant mỗi giải               |              64 |                      1.024 | Không giới hạn |
| Staff mỗi giải                     |               5 |                         30 | Không giới hạn |
| Active live viewers mục tiêu/giải  |             200 |                      5.000 |   Theo hạ tầng |
| Public page + live score           |              Có |                         Có |             Có |
| Core formats                       |              Có |                         Có |             Có |
| Advanced constraints/import/export |          Cơ bản |                     Đầy đủ |         Đầy đủ |
| Branding                           | Logo/màu cơ bản | Nâng cao, bỏ nhãn nền tảng |         Đầy đủ |
| Analytics                          |          Cơ bản |                   Nâng cao |         Đầy đủ |

`Active` nghĩa là giải chưa `COMPLETED/ARCHIVED`. Khi vượt quota hiện tại, hệ thống không xóa dữ liệu; chặn tạo mới và hướng dẫn nâng cấp/đóng giải.

## Chính sách version

- Phiên bản patch chính xác của Node.js, pnpm và dependency được khóa khi thực hiện `P0-01` bằng `packageManager`, `engines`, `.nvmrc`/mise và lockfile.
- Không tự động nâng major. Nâng major là task riêng có test regression và ADR nếu ảnh hưởng kiến trúc.
- Algorithm version, sport preset version và published revision không được cập nhật hồi tố.
