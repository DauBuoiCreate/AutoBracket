# 01 - Đặc tả yêu cầu sản phẩm

## 1. Tầm nhìn và người dùng mục tiêu

AutoBracket giảm công việc thủ công và tranh cãi khi tổ chức giải phong trào, trường học, doanh nghiệp, câu lạc bộ và giải bán chuyên. Sản phẩm phải vừa đủ đơn giản để một người tự tạo giải, vừa đủ kiểm soát để nhiều staff cùng vận hành an toàn.

### Persona

- **Chủ giải:** tạo giải, cấu hình thể thức, nhân sự, publish và chịu trách nhiệm cuối.
- **Điều hành:** quản lý đăng ký, đội hình, lịch, bảng/nhánh và thông báo.
- **Trọng tài/người nhập điểm:** dùng điện thoại để bắt đầu trận, nhập/hoàn tác điểm và chốt kết quả.
- **Đội trưởng/vận động viên:** cung cấp thông tin, xem lịch và kết quả; self-service đăng ký là follow-up.
- **Khán giả:** xem không cần tài khoản; theo dõi live, bảng xếp hạng, nhánh và thông báo.
- **Admin nền tảng:** xử lý user/tier, abuse, sport preset, sự cố và audit được cấp quyền.

## 2. Nguyên tắc trải nghiệm

- “Wizard trước, cấu hình nâng cao sau”: có default hợp lý theo môn/thể thức.
- Luôn cho xem trước trước khi publish hoặc thực hiện thay đổi tác động lớn.
- Hệ thống phải giải thích cảnh báo chia bảng, không chỉ báo “không thể”.
- Trạng thái draft/public/live phải nhìn thấy rõ và không gây nhầm.
- Tác vụ hiện trường tối ưu mobile, nút lớn, chống double-submit, phản hồi tức thì.
- Public page ưu tiên tải nhanh, dễ chia sẻ và hiểu được mà không cần đăng nhập.

## 3. Yêu cầu chức năng MVP

### EPIC A - Tài khoản và truy cập

- `REQ-ACC-01` Người dùng đăng ký bằng email, mật khẩu mạnh, tên hiển thị và chấp nhận điều khoản.
- `REQ-ACC-02` Xác minh email trước khi tạo/publish giải; resend có rate limit.
- `REQ-ACC-03` Đăng nhập/đăng xuất; hỗ trợ “đăng xuất tất cả thiết bị”.
- `REQ-ACC-04` Quên/đặt lại/đổi mật khẩu bằng token một lần, hết hạn.
- `REQ-ACC-05` Xem và sửa hồ sơ; thay email cần xác minh lại.
- `REQ-ACC-06` Hiển thị tier, quota đã dùng và entitlement hiện có.
- `REQ-ACC-07` Tài khoản bị khóa không đăng nhập/quản trị được nhưng dữ liệu public hợp lệ không tự biến mất.
- `REQ-ACC-08` Cho phép yêu cầu export/xóa tài khoản theo chính sách retention.

### EPIC B - Tạo và quản trị giải

- `REQ-ORG-01` Tạo giải từ wizard: tên, slug, môn, timezone, thời gian, địa điểm, visibility, logo/màu.
- `REQ-ORG-02` Chọn template: vòng tròn, chia bảng + loại trực tiếp, loại trực tiếp đơn.
- `REQ-ORG-03` Cấu hình số bảng, lượt đấu, suất đi tiếp, seeding, BYE, tranh hạng ba và preset tính hạng.
- `REQ-ORG-04` Mời staff bằng email/link; đặt role; thu hồi quyền/session liên quan.
- `REQ-ORG-05` Chuyển trạng thái giải chỉ khi validation gate pass; action có audit.
- `REQ-ORG-06` Clone cấu hình giải nhưng không clone PII/score nếu không chọn rõ.
- `REQ-ORG-07` Archive/restore; không hard-delete giải có dữ liệu trận.
- `REQ-ORG-08` Dashboard hiển thị việc cần làm, lỗi cấu hình, quota và trạng thái publish/live.

### EPIC C - Thành viên, đội và đăng ký thi đấu

- `REQ-PAR-01` CRUD hồ sơ cá nhân: tên thi đấu, mã nội bộ, ngày sinh tùy chọn, giới tính/category tùy chọn, liên hệ private, ảnh.
- `REQ-PAR-02` CRUD đội: tên, viết tắt, logo, club/đơn vị, khu vực, màu áo, đội trưởng.
- `REQ-PAR-03` Thêm/xóa thành viên roster với số áo/vai trò; kiểm tra trùng trong cùng giải theo policy.
- `REQ-PAR-04` Tạo `Participant` kiểu TEAM hoặc INDIVIDUAL và đăng ký vào giải/stage.
- `REQ-PAR-05` Trạng thái đăng ký: draft, pending, approved, rejected, withdrawn, checked-in.
- `REQ-PAR-06` Gán seed, pot, rating, club/region tags và constraint tags.
- `REQ-PAR-07` Import CSV có mapping cột, preview, báo lỗi theo dòng, idempotency và rollback batch.
- `REQ-PAR-08` Export danh sách theo quyền; public export không chứa contact/PII.
- `REQ-PAR-09` Chốt danh sách; sau đó thay đổi participant phải reopen hoặc có override được audit.

### EPIC D - Chia bảng, xếp nhánh và chỉnh tay

- `REQ-DRW-01` Preflight kiểm tra số participant, cấu hình, seed/pot, constraint và suất đi tiếp.
- `REQ-DRW-02` Hỗ trợ random, seeded-balanced, pot draw; cùng input/seed/version sinh cùng output.
- `REQ-DRW-03` Hard constraint không được vi phạm; soft constraint có điểm phạt và giải thích.
- `REQ-DRW-04` Lưu input snapshot, hash, random seed, algorithm version, người chạy và thời điểm.
- `REQ-DRW-05` Người có quyền có thể khóa vị trí/participant rồi chạy lại phần còn lại.
- `REQ-DRW-06` Editor kéo-thả hoặc swap giữa bảng/seed slot; undo/redo trong draft.
- `REQ-DRW-07` Validate liên tục: thiếu/trùng, lệch kích thước, seed/pot, BYE, mapping vòng sau và lịch xung đột cơ bản.
- `REQ-DRW-08` Publish tạo revision immutable; chỉnh sau publish tạo revision mới và diff preview.
- `REQ-DRW-09` Nếu đã có trận LIVE/COMPLETED, không được thay cấu trúc tùy ý; cần workflow migration/cancel có cảnh báo.
- `REQ-DRW-10` Sinh lịch round-robin, bracket đơn, BYE, trận hạng ba và mapping qualifier.
- `REQ-DRW-11` Cho phép ghi chú/giải thích công khai về phương thức bốc thăm.

### EPIC E - Trận đấu, tỉ số và bảng xếp hạng

- `REQ-MAT-01` Lên lịch theo thời gian, sân/court, vòng, bảng; phát hiện trùng participant và venue.
- `REQ-MAT-02` Match states: scheduled, check-in, live, paused, completed, forfeited, cancelled, postponed.
- `REQ-MAT-03` Nhập tỉ số tổng hoặc theo set/game tùy preset; server validate luật và quyền.
- `REQ-MAT-04` Score event có sequence/idempotency; double tap/retry không cộng điểm hai lần.
- `REQ-MAT-05` Undo/correction dùng event bù, có lý do; không xóa lịch sử.
- `REQ-MAT-06` Chốt kết quả bằng optimistic version; thay kết quả đã chốt cần quyền và reason.
- `REQ-MAT-07` Standings và downstream bracket tự cập nhật từ kết quả đã chốt.
- `REQ-MAT-08` Khi kết quả upstream đổi, hệ thống phát hiện tác động tới trận downstream và yêu cầu resolve.
- `REQ-MAT-09` Ghi forfeit/walkover/abandoned theo preset; không giả làm tỉ số bình thường.
- `REQ-MAT-10` Lưu lịch sử người nhập, thiết bị/session, thời gian và correction.

### EPIC F - Trang công khai và thông báo

- `REQ-PUB-01` Public URL ổn định theo slug; draft/private trả 404 hoặc access gate đúng policy.
- `REQ-PUB-02` Trang tổng quan có logo, trạng thái, thời gian, địa điểm, format, CTA và thông báo mới.
- `REQ-PUB-03` Trang lịch/kết quả lọc theo ngày, bảng, vòng, đội; chỉ báo live rõ ràng.
- `REQ-PUB-04` Bảng xếp hạng có cột và tie-break explanation theo môn.
- `REQ-PUB-05` Bracket responsive có zoom/pan, trạng thái trận, đường đi tiếp và fallback dạng danh sách accessible.
- `REQ-PUB-06` Trang participant/team chỉ hiển thị field được công khai.
- `REQ-PUB-07` Live update mục tiêu p95 < 2 giây; reconnect bằng sequence và snapshot.
- `REQ-PUB-08` Ban tổ chức đăng/schedule/pin thông báo; public viewer thấy lịch sử theo thời gian.
- `REQ-PUB-09` Metadata SEO/OpenGraph, QR/share link, favicon/theme theo entitlement.
- `REQ-PUB-10` Public page có trạng thái stale/offline; không hiển thị tỉ số sai như thể còn live.

### EPIC G - Tier, VIP, billing và admin

- `REQ-VIP-01` Server tính entitlement từ tier/subscription; UI chỉ phản ánh kết quả.
- `REQ-VIP-02` Quota theo `13-DECISIONS.md`; vượt quota không mất dữ liệu.
- `REQ-VIP-03` Upgrade/downgrade/cancel có effective time, grace period và audit.
- `REQ-VIP-04` Webhook billing phải verify signature, idempotent và retry được.
- `REQ-VIP-05` Billing failure không lập tức xóa public event đang live; áp dụng grace policy.
- `REQ-ADM-01` Admin tra cứu user/tournament theo quyền, khóa/mở tài khoản, cấp VIP có thời hạn và xem audit.
- `REQ-ADM-02` Admin không được sửa tỉ số âm thầm; phải dùng workflow correction như organizer và audit cao hơn.
- `REQ-ADM-03` Sport preset được version; update chỉ áp dụng giải mới/revision mới.

### EPIC H - Gợi ý cấu hình tự động

- `REQ-AST-01` Trước khi tạo stage/draw, hệ thống gợi ý thể thức, số bảng, kích thước bảng, suất đi tiếp và số trận dự kiến dựa trên số participant, thời lượng, số sân và môn.
- `REQ-AST-02` Mỗi gợi ý phải hiển thị input, lý do, trade-off (thời gian/số trận/BYE) và cảnh báo; kết quả deterministic theo rule version.
- `REQ-AST-03` Gợi ý không tự thay đổi dữ liệu. User phải chọn “Áp dụng”, sau đó cấu hình vẫn ở draft và có thể sửa/undo.
- `REQ-AST-04` Readiness advisor tự liệt kê việc còn thiếu hoặc xung đột và deep link đến màn hình sửa.
- `REQ-AST-05` Gợi ý nâng cao bằng AI/generative model chỉ thuộc backlog; không được gửi PII hoặc tự publish/chạy draw.

## 4. Yêu cầu phi chức năng

- `NFR-01` Availability mục tiêu MVP 99,5%/tháng, không tính maintenance báo trước.
- `NFR-02` Dashboard p75 LCP < 2,5 giây; public p75 LCP < 2,0 giây trên mobile mạng tốt.
- `NFR-03` Public cached read p95 < 300 ms ở tải chuẩn; command API p95 < 700 ms trừ job nặng.
- `NFR-04` Live event end-to-end p95 < 2 giây, resync sau reconnect < 5 giây.
- `NFR-05` Baseline 5.000 concurrent viewers/giải VIP sau load test; Regular quota theo quyết định.
- `NFR-06` WCAG 2.2 AA cho flow cốt lõi và public pages; full keyboard cho editor có fallback form/list.
- `NFR-07` Không log secret/password/token; PII được tối thiểu hóa và kiểm soát export.
- `NFR-08` RPO tối đa 24 giờ ở beta, 1 giờ trước GA; RTO 4 giờ ở beta, 1 giờ trước GA.
- `NFR-09` Audit quan trọng giữ tối thiểu 24 tháng; policy cụ thể cần chốt pháp lý trước GA.
- `NFR-10` Hỗ trợ Chrome/Edge/Firefox/Safari hai major gần nhất; mobile iOS/Android hiện đại.
- `NFR-11` Mọi command quan trọng idempotent hoặc có optimistic concurrency.
- `NFR-12` Structured logs, correlation ID, metrics và alert cho auth, jobs, realtime, DB và billing.

## 5. Ranh giới MVP rõ ràng

- Self-service payment có thể bật ở P5 nếu nhà cung cấp được chốt; trước đó admin vẫn cấp VIP thủ công có hạn dùng.
- Notification MVP gồm in-app và email giao dịch quan trọng. Web push/SMS/Zalo là backlog.
- Import MVP là CSV; Excel/Google Sheets sync là backlog.
- Không xây Swiss/double elimination trước khi P6 pass và có CR đưa backlog vào release.
- Không lưu hoặc phát video; chỉ có thể embed link stream ở backlog.

## 6. Tiêu chí nghiệm thu end-to-end

1. User xác minh email → tạo giải bóng đá chia 4 bảng → import 16 đội → seed/pot → auto draw → chỉnh swap → validate → publish.
2. Staff được mời chỉ thấy/thực hiện đúng quyền; user Regular không vượt quota.
3. Scorer dùng mobile bắt đầu trận, cập nhật điểm; hai public clients nhận đúng thứ tự; reconnect nhận snapshot mới.
4. Kết thúc trận cập nhật bảng; chốt vòng bảng đẩy đúng đội vào bracket; kết quả sửa có audit và cảnh báo downstream.
5. Thực hiện tương tự với volleyball theo set/match points và badminton theo game points.
6. Public viewer không nhìn thấy email, contact, draft revision hoặc admin action.
7. Với 16 đội, 4 sân và khung thời gian mẫu, advisor đưa gợi ý có giải thích, áp dụng vào draft và không tự publish.

## 7. Out of scope không được AI tự đưa vào

Native app, crypto/NFT, social feed, chat, AI prediction, video hosting, marketplace, multi-tenant enterprise SSO, custom domain tự động, Swiss và double elimination. Mọi hạng mục này cần CR mới.
