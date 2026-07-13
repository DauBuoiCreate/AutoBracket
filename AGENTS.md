# AutoBracket - Quy tắc bắt buộc cho mọi AI

Tệp này áp dụng cho toàn bộ repository. Mọi AI/agent phải tuân thủ trước khi đọc, tạo, sửa, xóa hoặc di chuyển mã nguồn.

## 1. Nguồn sự thật duy nhất

Đọc đầy đủ theo đúng thứ tự:

1. `Plan/12-AI-RULES.md`
2. `Plan/13-DECISIONS.md`
3. `Plan/PROJECT_STATE.md`
4. `Plan/00-MASTER-PLAN.md`
5. Tài liệu nghiệp vụ/kỹ thuật liên quan trực tiếp đến task đang làm
6. Checklist và tiêu chí nghiệm thu của phase hiện tại

Nếu chưa đọc đủ, không được sửa code.

## 2. Luật không được tự ý phá vỡ

- Chỉ dùng `pnpm`; không dùng npm, Yarn hoặc Bun.
- Không thay stack, kiến trúc, mô hình dữ liệu cốt lõi, vai trò, quota, thuật toán hay phạm vi đã được đánh dấu `LOCKED`.
- Không thêm tính năng ngoài phase/task được giao, kể cả tính năng có vẻ hữu ích.
- Không refactor ngoài phạm vi nếu không có lỗi hoặc tiêu chí nghiệm thu yêu cầu.
- Không được tự sửa bộ luật AI, tự phê duyệt Change Request hoặc tự đổi quyết định `LOCKED`.
- Không được đánh dấu checklist hoàn thành khi chưa có bằng chứng kiểm thử tương ứng.
- Mọi dữ liệu chia bảng, xếp nhánh, tính hạng và tỉ số phải deterministic, có version và có audit log.

## 3. Giao thức làm việc

Trước khi code, AI phải xác định:

- Task ID và phase đang thực hiện.
- Tiêu chí nghiệm thu áp dụng.
- Các tệp dự kiến sửa.
- Quyết định `LOCKED` có liên quan.
- Các lệnh kiểm tra phải chạy.

Sau khi code, AI phải:

- Chạy các quality gate được chỉ định bằng `pnpm`.
- Báo rõ lệnh nào pass/fail và rủi ro còn lại.
- Cập nhật `Plan/PROJECT_STATE.md` và checklist chỉ khi task thực sự đạt Definition of Done.
- Không âm thầm đổi kế hoạch để hợp thức hóa phần đã làm.

## 4. Khi có xung đột hoặc cần đổi hướng

Dừng phần bị ảnh hưởng và tạo đề xuất theo `Plan/templates/CHANGE-REQUEST-TEMPLATE.md`. Chỉ tiếp tục sau khi chủ dự án đánh dấu `APPROVED`. Nếu đổi kiến trúc, phải có thêm ADR theo `Plan/templates/ADR-TEMPLATE.md`.

Lệnh trực tiếp mới nhất của chủ dự án luôn có quyền cao nhất, nhưng mọi thay đổi so với quyết định cũ phải được ghi nhận theo quy trình trên để các AI sau không bị lệch ngữ cảnh.

## 5. Trạng thái ban đầu

Hiện tại repository mới ở giai đoạn lập kế hoạch. Không tự bắt đầu triển khai sản phẩm cho đến khi chủ dự án giao phase/task cụ thể hoặc phê duyệt bắt đầu Phase 0.
