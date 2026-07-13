# 00 - Kế hoạch tổng AutoBracket

## 1. Goal

Xây dựng một nền tảng web đa người dùng để tổ chức giải đấu cho bóng đá, bóng chuyền, cầu lông và các môn có cấu trúc tương tự. Người tổ chức có thể tạo tài khoản, tạo giải, quản lý cá nhân/đội hình, tự động chia bảng hoặc xếp nhánh theo thể thức, chỉnh tay có kiểm soát, vận hành lịch và tỉ số trực tiếp, đăng thông báo, rồi xuất bản một trang công khai để khán giả theo dõi bảng xếp hạng, nhánh đấu, kết quả và diễn biến live.

## 2. Assumptions đã chốt

- Sản phẩm là web responsive, ưu tiên desktop cho ban tổ chức và mobile cho trọng tài/khán giả.
- Giao diện mặc định tiếng Việt; kiến trúc sẵn sàng cho i18n nhưng tiếng Anh không nằm trong MVP.
- Package manager duy nhất là `pnpm`, quản lý theo workspace.
- Backend, frontend và engine dùng TypeScript; dữ liệu chính ở PostgreSQL; realtime và job dùng Redis.
- Bản đầu triển khai bằng Docker trên một VPS/VM lâu dài, không phụ thuộc serverless.
- Một `Participant` có thể là đội hoặc cá nhân; đội có roster thành viên.
- Tài khoản nền tảng (`REGULAR`, `VIP`, `ADMIN`) tách khỏi quyền trong từng giải (`OWNER`, `MANAGER`, `SCORER`, `VIEWER`).
- Public page có thể xem không cần đăng nhập; thao tác quản trị/tỉ số luôn cần quyền.
- VIP được triển khai bằng entitlement/quota. Thanh toán trực tuyến có trong roadmap sau khi luồng cốt lõi ổn định.
- Mọi lần bốc thăm/chia bảng phải tái lập được từ seed và cấu hình; mọi chỉnh tay đều được audit.
- Múi giờ lưu UTC, hiển thị theo múi giờ giải; mặc định `Asia/Ho_Chi_Minh`.

## 3. Phạm vi

### Must-have cho bản phát hành đầu tiên

- Đăng ký, đăng nhập, đăng xuất, xác minh email, quên/đổi mật khẩu, quản lý session.
- Hồ sơ người dùng; phân hạng thường/VIP; feature gate và quota ở server.
- CRUD giải đấu, môn, địa điểm, sân, thời gian, thể thức và quy tắc tính điểm.
- Thêm cá nhân, đội, roster; mời cộng tác viên; nhập CSV cơ bản.
- Đăng ký participant, seed/pot, ràng buộc bốc thăm.
- Vòng tròn một lượt/hai lượt, chia bảng + loại trực tiếp, loại trực tiếp đơn.
- Chia tự động deterministic; khóa participant; kéo-thả chỉnh tay; validate; undo; revision; publish.
- Sinh lịch trận, BYE, trận tranh hạng ba tùy chọn, mapping đội đi tiếp từ bảng.
- Nhập tỉ số theo trận/set, live event, hoàn tác có audit, xác nhận kết quả.
- Tính lại bảng xếp hạng và nhánh sau kết quả.
- Public page: tổng quan, lịch, bảng, nhánh, đội/vận động viên, thông báo, live score.
- Audit log, notification trong ứng dụng, giám sát lỗi, backup/restore và quality gates.

### Deferred khỏi MVP

- Swiss, double elimination, round-robin nhiều phase phức tạp.
- Ứng dụng native, offline-first đầy đủ, streaming video tự host.
- Marketplace, mạng xã hội, fantasy, AI dự đoán kết quả.
- Custom domain tự phục vụ, API công khai thương mại, white-label hoàn chỉnh.
- Tự động thu phí đăng ký giải và payout cho ban tổ chức.

## 4. Work phases

1. **P0 - Nền móng có thể chạy**  
   Outcome: monorepo `pnpm` chạy local/CI, có web health page, PostgreSQL/Redis, migration và quality gates.
2. **P1 - Tài khoản và khung giải**  
   Outcome: người dùng đăng ký/đăng nhập, tạo giải, mời staff và thấy quota đúng theo tier.
3. **P2 - Participant, đội và đăng ký**  
   Outcome: quản lý cá nhân/đội/roster, import và chốt danh sách đủ điều kiện bốc thăm.
4. **P3 - Engine thể thức và trình chỉnh bảng**  
   Outcome: tự động chia bảng/xếp nhánh deterministic, chỉnh tay, validate, version và publish.
5. **P4 - Vận hành trận, live score và public page**  
   Outcome: ban tổ chức chạy giải từ lịch đến kết quả, khán giả nhận cập nhật realtime.
6. **P5 - VIP, thông báo và hoàn thiện vận hành**  
   Outcome: entitlement/quota, subscription lifecycle, notification, audit và export hoạt động ổn định.
7. **P6 - Hardening và phát hành production**  
   Outcome: bảo mật, hiệu năng, accessibility, backup/restore, quan sát hệ thống và runbook đạt release gate.

Chi tiết task ID, dependency, đầu ra và tiêu chí nghiệm thu nằm tại `08-DELIVERY-ROADMAP.md`.

## 5. Acceptance criteria cấp sản phẩm

- Người mới có thể đăng ký, tạo một giải mẫu và xuất bản trang công khai mà không cần can thiệp kỹ thuật.
- Cùng participant, seed và cấu hình phải sinh đúng cùng một kết quả chia bảng; seed được lưu và hiển thị trong audit.
- Sau khi tự động chia, người có quyền có thể chỉnh tay mà hệ thống luôn phát hiện thiếu, trùng hoặc vi phạm ràng buộc.
- Bản đã publish không bị sửa ngầm; mọi thay đổi tạo revision và lịch sử ai/đã đổi gì/khi nào.
- Luật bóng đá, bóng chuyền, cầu lông có golden fixtures và tính bảng đúng theo preset đã chọn.
- Tỉ số live đến public viewer trong mục tiêu p95 dưới 2 giây ở tải chuẩn; reconnect không làm mất trạng thái.
- Regular/VIP và quyền trong giải được kiểm tra ở server/API, không chỉ ẩn nút giao diện.
- Public page hoạt động trên mobile, có URL ổn định và không làm lộ dữ liệu riêng tư.
- Build, lint, typecheck, unit, integration và E2E smoke đều pass bằng lệnh `pnpm`.
- Có backup tự động và diễn tập restore thành công trước production.

## 6. Test strategy tóm tắt

- Unit cho domain engine, permissions, entitlement và scoring reducer.
- Property-based test cho chia bảng, lịch round-robin, bracket/BYE và invariant không mất/trùng participant.
- Integration test với PostgreSQL/Redis thật qua container cho transaction, outbox, jobs và realtime.
- Contract test cho API; E2E Playwright cho các hành trình chính.
- Golden fixtures riêng cho từng môn; load test public/live; accessibility và security test.
- Mỗi phase có gate riêng; không dồn kiểm thử sang cuối dự án.

## 7. Rủi ro và câu hỏi mở tóm tắt

- Luật giải thể thao khác nhau theo liên đoàn: giải quyết bằng preset có version và override có kiểm soát.
- Chỉnh bracket sau khi trận đã bắt đầu dễ làm sai lịch sử: khóa theo state machine và buộc tạo revision/migration plan.
- Realtime có thể mất sự kiện: dùng event append-only, sequence, snapshot và resync.
- Gian lận hoặc tranh chấp bốc thăm: lưu seed, input hash, thuật toán version và audit.
- Câu hỏi sản phẩm chưa chốt dùng default trong `15-RISKS-OPEN-QUESTIONS.md`; muốn đổi default phải có CR.

## 8. Definition of Done chung

Một task chỉ là `DONE` khi:

- Đúng task ID, không vượt phạm vi.
- Code/type/schema/API và tài liệu liên quan đồng bộ.
- Có test tự động phù hợp và test pass.
- Không còn lỗi lint/typecheck/build.
- Migration có forward path và rollback/restore note.
- Quyền, audit, lỗi và empty/loading states được xử lý.
- Tiêu chí accessibility cơ bản đạt.
- Bằng chứng được ghi trong handoff; checklist và `PROJECT_STATE.md` được cập nhật.
