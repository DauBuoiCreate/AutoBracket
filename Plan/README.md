# Plan - AutoBracket

Đây là bộ hồ sơ điều hành duy nhất cho dự án nền tảng tổ chức giải thể thao AutoBracket. Mục tiêu của thư mục là giúp con người hoặc AI có thể triển khai tuần tự, kiểm chứng được và không tự ý lệch khỏi các quyết định ban đầu.

## Cách đọc

1. [Kế hoạch tổng](00-MASTER-PLAN.md)
2. [Đặc tả sản phẩm](01-PRODUCT-REQUIREMENTS.md)
3. [Luật nghiệp vụ thi đấu](02-DOMAIN-AND-TOURNAMENT-RULES.md)
4. [Luồng người dùng và màn hình](03-USER-FLOWS-AND-SCREENS.md)
5. [Kiến trúc và stack](04-ARCHITECTURE-AND-STACK.md)
6. [Mô hình dữ liệu](05-DATA-MODEL.md)
7. [Bảo mật, vai trò và VIP](06-SECURITY-ROLES-VIP.md)
8. [API, realtime và tích hợp](07-API-REALTIME-INTEGRATIONS.md)
9. [Roadmap triển khai](08-DELIVERY-ROADMAP.md)
10. [Master checklist](09-MASTER-CHECKLIST.md)
11. [Chiến lược kiểm thử](10-TEST-STRATEGY.md)
12. [Vận hành và phát hành](11-OPERATIONS-AND-RELEASE.md)
13. [Bộ luật AI](12-AI-RULES.md)
14. [Sổ quyết định đã khóa](13-DECISIONS.md)
15. [Kiểm soát thay đổi](14-CHANGELOG-AND-CHANGE-CONTROL.md)
16. [Rủi ro và câu hỏi mở](15-RISKS-OPEN-QUESTIONS.md)
17. [Backlog gợi ý](16-FEATURE-BACKLOG.md)
18. [Ma trận truy vết](17-TRACEABILITY.md)
19. [Trạng thái dự án hiện tại](PROJECT_STATE.md)

## Quy ước trạng thái

- `PROPOSED`: đang đề xuất, chưa được dùng để triển khai.
- `LOCKED`: quyết định gốc bắt buộc tuân thủ.
- `APPROVED`: thay đổi đã được chủ dự án phê duyệt.
- `IN_PROGRESS`: đang thực hiện, chỉ một task chính ở trạng thái này.
- `DONE`: đã đạt tiêu chí nghiệm thu và có bằng chứng kiểm thử.
- `DEFERRED`: chủ động hoãn, không được lén đưa vào MVP.
- `REJECTED`: không triển khai.

## Nguyên tắc cập nhật

- Mỗi thay đổi phạm vi phải có Change Request (CR).
- Mỗi thay đổi kiến trúc phải có Architecture Decision Record (ADR).
- Checklist chỉ được tick sau khi bằng chứng kiểm thử được ghi vào handoff.
- `PROJECT_STATE.md` phải phản ánh đúng task duy nhất đang làm và task kế tiếp.
- Tài liệu kế hoạch phải được sửa trước hoặc cùng commit với mã nguồn chịu ảnh hưởng.

## Templates

- [Change Request](templates/CHANGE-REQUEST-TEMPLATE.md)
- [ADR](templates/ADR-TEMPLATE.md)
- [Bàn giao phase/task](templates/PHASE-HANDOFF-TEMPLATE.md)
