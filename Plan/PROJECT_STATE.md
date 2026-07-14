# Trạng thái dự án AutoBracket

> Tệp sống. Chỉ cập nhật trạng thái dựa trên bằng chứng; không dùng để thay đổi quyết định hay phạm vi.

## Snapshot

- Cập nhật gần nhất: 2026-07-14
- Trạng thái: `IMPLEMENTATION_IN_PROGRESS`
- Phase hiện tại: `P1 - Tài khoản và khung giải`
- Task `IN_PROGRESS`: `P1-01 - Registration/login/session vertical slice`
- Task được phép làm kế tiếp: Chỉ `P1-01`; không mở `P1-02` hoặc task khác trước khi `P1-01` đạt Definition of Done và có handoff.
- Release target: Chưa đặt ngày cố định
- Production status: Chưa deploy production; mới có P0 shell local/staging

## Tiến độ phase

| Phase                       | Trạng thái  | Bằng chứng                                             |
| --------------------------- | ----------- | ------------------------------------------------------ |
| P0 - Nền móng               | DONE        | `P0-01`, `P0-02`, `P0-03` và `P0-GATE` đã đạt; owner chấp nhận Gate P0 ngày 2026-07-14. Evidence xem `handoffs/P0-03-2026-07-13.md`. |
| P1 - Tài khoản và giải      | IN_PROGRESS | Mở duy nhất `P1-01` theo owner authorization ngày 2026-07-14. |
| P2 - Participant và đăng ký | NOT_STARTED | -                                                      |
| P3 - Engine và editor       | NOT_STARTED | -                                                      |
| P4 - Live và public         | NOT_STARTED | -                                                      |
| P5 - VIP và vận hành        | NOT_STARTED | -                                                      |
| P6 - Hardening/release      | NOT_STARTED | -                                                      |

## Quyết định và thay đổi

- Các quyết định `D-001` đến `D-025` trong `13-DECISIONS.md` đang `LOCKED`.
- Change Request đã duyệt: Không có.
- ADR đã duyệt: Không có.
- Blocker hiện tại: Phần code `P1-01` đang dừng theo bộ luật AI vì baseline chưa khóa một số contract schema/API/security và có xung đột phạm vi checklist với `P1-02`/`P4-04`. Đề xuất `Plan/changes/CR-2026-001-p1-01-auth-contract.md` đang ở trạng thái `PROPOSED`; chỉ tiếp tục code sau khi chủ dự án chuyển CR sang `APPROVED` và các decisions/spec/checklist chịu ảnh hưởng đã được cập nhật. Repository ruleset `18903587` tiếp tục enforce `guard-lint-type-test-build` trên `main` mà không có bypass actor.

## Handoff gần nhất

- Loại: Task/phase handoff `DONE`
- Kết quả: P0 hoàn tất; owner chấp nhận `P0-GATE` ngày 2026-07-14. Toàn bộ `GOV-001..007`, `P0-001..015` và `P0-GATE` đã có evidence; mở duy nhất `P1-01`.
- Kiểm tra: GitHub Actions push run `29272926312` / check-run `86894845675` success; PR #1 validated runs `29274088647`, `29300671748`, `29301032747` success; ruleset `18903587` active/effective; PR chuyển `BLOCKED` khi required check pending và `CLEAN` sau pass. Full `pnpm verify`, Playwright, clean-copy, clean-setup, production audit, staging topology/smoke và startup invalid-env checks đều pass theo handoff.
- Rủi ro còn lại: Repository public theo lệnh owner; high-confidence credential scan không thấy file khớp và chỉ `.env.example` được track, nhưng GitHub secret scanning/push protection đang disabled. Migration image còn lớn; action/image refs chưa pin immutable SHA/digest; hosted action runtime Node.js 20 có warning không chặn. Các mục này không chặn P1 và tiếp tục được theo dõi đúng phase.
