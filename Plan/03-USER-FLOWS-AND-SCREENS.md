# 03 - Luồng người dùng và danh mục màn hình

## 1. Information architecture

### Khu vực account

- `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`
- `/app` dashboard cá nhân
- `/app/profile`, `/app/security`, `/app/billing`

### Khu vực quản trị giải

- `/app/tournaments/new`
- `/app/tournaments/[id]/overview`
- `/app/tournaments/[id]/settings`
- `/app/tournaments/[id]/staff`
- `/app/tournaments/[id]/participants`, `/teams/[teamId]`, `/imports`
- `/app/tournaments/[id]/stages`, `/draw`, `/bracket`, `/schedule`
- `/app/tournaments/[id]/matches/[matchId]/score`
- `/app/tournaments/[id]/announcements`, `/publish`, `/audit`

### Khu vực public

- `/t/[slug]`
- `/t/[slug]/schedule`, `/standings`, `/bracket`
- `/t/[slug]/teams/[publicId]`, `/players/[publicId]`
- `/t/[slug]/matches/[publicId]`, `/announcements`

Admin dùng namespace riêng `/admin` và không dùng chung navigation với organizer.

## 2. Flow A - Đăng ký đến giải đầu tiên

1. User nhập tên, email, mật khẩu và chấp nhận điều khoản.
2. Hệ thống tạo account chưa verify, gửi email; không tiết lộ email đã tồn tại ở luồng reset.
3. User verify → onboarding chọn mục đích, timezone mặc định.
4. Dashboard empty state có CTA “Tạo giải”.
5. Wizard 5 bước:
   1. Thông tin cơ bản và slug.
   2. Môn + sport preset.
   3. Thể thức + số participant dự kiến.
   4. Thời gian/địa điểm/court.
   5. Review quota và tạo.
6. Thành công đến tournament overview với checklist việc tiếp theo.

Exit/reload phải giữ draft. Slug collision được gợi ý thay thế. Quota fail không được tạo nửa chừng.

## 3. Flow B - Thêm đội/thành viên

### Nhập tay

1. Chọn TEAM hoặc INDIVIDUAL.
2. Nhập field bắt buộc; private field được đánh dấu rõ.
3. TEAM: thêm roster, captain, số áo; kiểm tra duplicate.
4. Tạo registration; approve/check-in theo quyền.
5. Gán seed/pot/tags trực tiếp hoặc bulk action.

### Import CSV

1. Tải template đúng sport/participant type.
2. Upload → map cột → preview.
3. UI hiển thị valid/warning/error theo dòng, duplicate và ảnh hưởng quota.
4. Confirm tạo một import batch idempotent.
5. Có report và “rollback batch” nếu chưa dùng participant trong draw/match; nếu đã dùng phải hướng dẫn xử lý thay vì xóa.

## 4. Flow C - Auto draw và chỉnh tay

1. “Chuẩn bị bốc thăm” mở preflight; lỗi hard có deep link đến nơi sửa.
2. Chọn mode, số bảng, constraints, random seed tự sinh hoặc nhập, locked participant.
3. Run tạo draft revision và summary chất lượng phân bổ.
4. Màn hình draw editor gồm:
   - Header: revision, trạng thái, seed/hash, undo/redo, validate, publish.
   - Sidebar participant chưa xếp/filters.
   - Group columns hoặc bracket canvas.
   - Inspector cho selected participant/slot và constraint warnings.
   - Panel validation luôn truy cập được.
5. Drag-drop có keyboard alternative: chọn participant → “Move to…”/“Swap with…”.
6. Sau mỗi action hiển thị validation và diff.
7. Publish mở review modal: public changes, affected matches, warnings, confirmation phrase khi rủi ro cao.
8. Publish thành công tạo public revision và link chia sẻ.

Không auto-save action lỗi network như đã thành công; client giữ command ID để retry idempotent.

## 5. Flow D - Chạy trận trên mobile

1. Scorer mở “Trận của tôi”, lọc live/upcoming và chọn match.
2. Check-in hai bên; xem preset và quyền.
3. Start match với optimistic version.
4. Score pad hiển thị nút lớn, set/game, serve/side nếu môn cần, undo và event timeline.
5. Mỗi tap phản hồi optimistic nhưng có trạng thái sending/confirmed; conflict thì resync trước khi cho nhập tiếp.
6. Kết thúc set/match chỉ khi rule valid; override cần reason và quyền cao hơn.
7. Result summary → confirm; public/standings cập nhật.
8. Nếu mất mạng: MVP hiển thị offline và không nhận điểm mới; offline queue đầy đủ là backlog. Không giả trạng thái đã sync.

## 6. Flow E - Khán giả theo dõi

1. Mở share URL/QR không cần login.
2. Landing hiển thị live/upcoming, pinned announcement, quick links.
3. Chọn live match → thấy score, set/game, status, last-updated và event timeline tối giản.
4. Socket reconnect bằng last sequence; nếu gap, tự lấy snapshot và hiển thị đã đồng bộ.
5. Xem standings/bracket; chọn team để xem roster public và lịch.
6. Khi event kết thúc, live badge chuyển final và bảng/nhánh cập nhật không cần reload.

## 7. Flow F - Chỉnh sau publish

1. Owner chọn “Create revision” từ bản published.
2. Hệ thống clone cấu trúc thành draft, giữ bản public active.
3. Owner sửa; affected match/stage được đánh dấu.
4. Nếu chưa live/completed: review diff và publish revision mới.
5. Nếu đã có kết quả bị ảnh hưởng: hệ thống chặn publish, liệt kê match cần cancel/migrate và yêu cầu workflow có reason.
6. Sau publish, client public nhận `REVISION_PUBLISHED`, tải snapshot mới; bản cũ vẫn trong audit.

## 8. Flow G - VIP

1. Billing page hiển thị tier hiện tại, quota dùng, quyền lợi và ngày hiệu lực.
2. Upgrade tạo checkout với provider đã chọn; return page không tự tin vào query string mà chờ webhook/server verify.
3. Webhook kích hoạt entitlement; UI refresh session/entitlement.
4. Downgrade/cancel có ngày hiệu lực; dữ liệu vượt quota vẫn đọc được nhưng chặn tạo mới sau grace period.
5. Admin grant VIP phải có duration/reason và audit.

## 9. Trạng thái UI bắt buộc cho mọi màn hình

- Loading/skeleton có kích thước ổn định.
- Empty state có next action đúng quyền.
- Validation inline và error summary accessible.
- Forbidden khác Not Found theo dashboard; public private có thể dùng 404 để không leak.
- Network error có retry an toàn; command retry giữ idempotency key.
- Read-only banner khi role/tier/state không cho sửa.
- Unsaved changes warning cho form/editor.
- Success không chỉ dựa vào toast; trạng thái trang phải phản ánh dữ liệu server.

## 10. Responsive và accessibility

- Dashboard breakpoint chính: mobile < 768, tablet 768-1023, desktop >= 1024.
- Draw/bracket desktop có canvas/columns; mobile có list theo group/round và form move/swap.
- Không chỉ dùng màu cho live/win/error/seed; luôn có label/icon/text.
- Focus visible, skip link, semantic heading, dialog focus trap, form labels.
- Score pad target tối thiểu 44x44 CSS px; confirm destructive action; hỗ trợ screen reader status.
- Public bracket có bảng/list alternative vì SVG/canvas khó tiếp cận.

## 11. Screen acceptance checklist

Mỗi screen chỉ hoàn thành khi có:

- Happy path, empty, loading, error, permission-denied và quota state.
- Mobile + desktop kiểm tra trực quan.
- Keyboard/screen reader cơ bản.
- Không lộ field private trong HTML/JSON public.
- Analytics event không chứa PII.
- E2E hoặc component test cho action chính.
