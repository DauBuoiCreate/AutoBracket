# 12 - Bộ luật cố định dành cho AI

## 1. Mục đích

Bộ luật này ngăn AI tự thay đổi ý tưởng gốc, tự mở rộng scope, đổi công nghệ tùy hứng hoặc đánh dấu công việc hoàn thành thiếu bằng chứng. Luật áp dụng cho mọi agent, tool tự động và phiên làm việc trong repository.

## 2. Thứ tự ưu tiên nguồn sự thật

1. Yêu cầu trực tiếp mới nhất của chủ dự án.
2. Change Request có trạng thái `APPROVED` bởi chủ dự án.
3. Quyết định `LOCKED` trong `13-DECISIONS.md`.
4. `00-MASTER-PLAN.md` và `01-PRODUCT-REQUIREMENTS.md`.
5. Đặc tả domain, kiến trúc, dữ liệu, bảo mật và API.
6. Roadmap, checklist và backlog.

Nếu các nguồn xung đột, AI phải dừng phần bị xung đột, báo cụ thể và yêu cầu cập nhật CR/tài liệu. AI không được tự chọn nguồn thuận tiện cho phần code của mình.

## 3. Các luật MUST

### Trước khi làm

- MUST đọc `AGENTS.md`, tệp này, sổ quyết định và `PROJECT_STATE.md`.
- MUST có một Task ID hợp lệ từ roadmap/checklist hoặc Task ID do chủ dự án chỉ định.
- MUST nêu ngắn gọn outcome, phạm vi tệp, acceptance criteria và lệnh kiểm tra.
- MUST kiểm tra dependency của task đã `DONE`.
- MUST đọc đặc tả liên quan trước khi thiết kế code.
- MUST giữ nguyên thay đổi không liên quan đang có trong workspace.

### Trong khi làm

- MUST chỉ dùng `pnpm` cho cài đặt, script và workspace operation.
- MUST ưu tiên thay đổi nhỏ nhất đáp ứng task và kiến trúc hiện tại.
- MUST giữ domain logic thuần trong `packages/domain`; không nhét luật thi đấu vào UI/route handler.
- MUST enforce permission, tier và quota ở server.
- MUST dùng transaction/idempotency/audit cho thao tác thay đổi draw, bracket, result, subscription và role.
- MUST thêm hoặc cập nhật test cùng lát cắt chức năng.
- MUST dùng UTC khi lưu thời gian và timezone giải khi hiển thị.
- MUST tạo migration cho schema; không chỉnh DB production bằng tay.
- MUST trả lỗi có mã ổn định, không nuốt lỗi và không làm lộ secret/PII.

### Sau khi làm

- MUST chạy quality gates của task và ghi kết quả thật.
- MUST đối chiếu từng acceptance criterion.
- MUST ghi rủi ro còn lại và phần chưa làm.
- MUST chỉ tick checklist khi có bằng chứng pass.
- MUST cập nhật `PROJECT_STATE.md` nếu trạng thái task/phase thực sự thay đổi.
- MUST lập handoff theo template khi kết thúc task/phase.

## 4. Các luật MUST NOT

- MUST NOT đổi `pnpm` sang npm/Yarn/Bun hoặc tạo lockfile khác.
- MUST NOT thay framework, database, ORM, realtime transport, auth model hay hosting model đã khóa.
- MUST NOT thay đổi ID, ý nghĩa state, role, tier, quota default hoặc preset luật thi đấu mà không có CR.
- MUST NOT thêm dependency nếu chức năng đã có trong stack hoặc có thể viết rõ ràng bằng platform API; dependency mới phải được giải thích.
- MUST NOT xây backlog `SHOULD/COULD` trong lúc đang làm `MUST` nếu task không yêu cầu.
- MUST NOT refactor diện rộng, đổi tên hàng loạt hoặc format toàn repo trong task nhỏ.
- MUST NOT tự sửa `12-AI-RULES.md` để hợp thức hóa hành vi.
- MUST NOT tự đánh dấu CR/ADR là `APPROVED` hoặc tự ghi tên chủ dự án.
- MUST NOT sửa revision đã publish; phải tạo revision mới.
- MUST NOT tính standings/bracket bằng hai implementation độc lập ở client và server.
- MUST NOT xóa audit, score event hoặc dữ liệu thi đấu; dùng trạng thái/compensating event theo đặc tả.
- MUST NOT claim “xong” nếu chưa build/test hoặc còn tiêu chí bắt buộc chưa đạt.

## 5. Phạm vi tự quyết được phép

AI được tự quyết các chi tiết cục bộ, có thể đảo ngược và không ảnh hưởng contract, ví dụ tên biến nội bộ, cách tách helper nhỏ, nội dung error message hiển thị, hoặc test data. AI không được tự quyết khi lựa chọn ảnh hưởng:

- Schema/API/public URL.
- Business rule, tier/quota, role/permission.
- Stack/dependency nền tảng/deployment.
- Thuật toán chia bảng, ranking, scoring hoặc versioning.
- Privacy/security/retention.
- Timeline, MVP scope hoặc Definition of Done.

## 6. Giao thức Change Request

Khi cần đổi quyết định:

1. Copy `templates/CHANGE-REQUEST-TEMPLATE.md` thành một CR có ID.
2. Ghi lý do, bằng chứng, phương án, tác động, migration và rollback.
3. Giữ trạng thái `PROPOSED`.
4. Dừng phần phụ thuộc vào quyết định đó; tiếp tục phần độc lập nếu an toàn.
5. Chỉ khi chủ dự án đổi trạng thái thành `APPROVED`, cập nhật sổ quyết định và tài liệu liên quan trước khi code.
6. Nếu là kiến trúc, tạo ADR và liên kết CR.

## 7. Giao thức task chuẩn

```text
TASK: <ID - tên>
OUTCOME: <kết quả người dùng kiểm chứng được>
IN SCOPE: <phạm vi>
OUT OF SCOPE: <không làm>
LOCKED DECISIONS: <D-xxx>
FILES: <dự kiến>
ACCEPTANCE: <AC/REQ liên quan>
VERIFY: <pnpm commands + manual check>
```

Nếu không điền được các mục trên, task chưa đủ điều kiện bắt đầu.

## 8. Điều kiện dừng bắt buộc

Dừng và hỏi chủ dự án khi:

- Yêu cầu mới xung đột với quyết định `LOCKED` nhưng chưa có CR.
- Có nguy cơ mất dữ liệu, phá public contract hoặc thay kết quả giải đã chạy.
- Cần secret, tài khoản, dịch vụ trả phí hoặc quyền production chưa được cấp.
- Hai tài liệu cùng cấp quy định khác nhau.
- Không thể đạt acceptance criteria mà phải mở rộng scope đáng kể.

Không cần dừng cho chi tiết nhỏ có default rõ ràng trong tài liệu.

## 9. Cơ chế cưỡng chế cần triển khai ở P0/P6

- Root `AGENTS.md` dẫn vào bộ luật.
- `packageManager` khóa phiên bản pnpm trong `package.json` và `pnpm-lock.yaml` là lockfile duy nhất.
- Script `pnpm guard:plan` kiểm tra lockfile lạ, cấu trúc workspace, task/decision references và tài liệu bắt buộc.
- CI bắt buộc `guard:plan`, format, lint, typecheck, test, build.
- Pull request template có mục Task ID, Decision impact, test evidence và screenshot.
- CODEOWNERS/review rule cho migration, domain engine, auth, billing và tài liệu khóa.
- Không deploy nếu migration check, integration test, backup check hoặc smoke test fail.

## 10. Quy tắc sửa chính bộ luật

Chỉ chủ dự án có thể yêu cầu thay đổi bộ luật. Thay đổi phải có CR `APPROVED`, nêu chính xác điều khoản cũ/mới và lý do. AI có thể đề xuất nhưng không được tự phê duyệt hoặc tự áp dụng.
