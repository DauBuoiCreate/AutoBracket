# 02 - Domain và luật thi đấu

## 1. Ngôn ngữ chung

- **User:** tài khoản đăng nhập nền tảng.
- **Member profile:** hồ sơ một con người; có thể có hoặc không có User liên kết.
- **Team:** đội/CLB và roster.
- **Participant:** đơn vị thực sự tham gia một giải/stage, loại `TEAM` hoặc `INDIVIDUAL`.
- **Registration:** yêu cầu đưa participant vào giải/category.
- **Category:** hạng mục thi đấu trong một giải, ví dụ nam/nữ, độ tuổi hoặc nội dung đơn/đôi; mỗi stage thuộc một category.
- **Stage:** một giai đoạn thi đấu như vòng bảng hoặc knock-out.
- **Draw revision:** ảnh chụp cấu hình và kết quả chia/xếp nhánh ở một phiên bản.
- **Group:** bảng đấu trong stage.
- **Bracket node:** slot/trận trong cây loại trực tiếp và liên kết nguồn/đích.
- **Match:** cuộc đối đầu; **set/game** là đơn vị con tùy môn.
- **Score event:** sự kiện bất biến làm thay đổi trạng thái điểm.
- **Standing snapshot:** projection xếp hạng tại sequence/revision cụ thể.
- **Sport preset:** bộ luật có version cho scoring, ranking và validation.

Không dùng lẫn `User`, `Member`, `Team` và `Participant`.

## 1.1. Category trong MVP

- Một tournament có ít nhất một category mặc định.
- Category có name/code, participant type, eligibility notes và sport preset snapshot/ref.
- Participant đăng ký theo category; stage thuộc đúng một category.
- Không cho cùng một stage trộn category. Một participant có thể ở nhiều category chỉ khi policy giải cho phép.
- Wizard đơn giản ẩn category khi chỉ có một nội dung; data model vẫn giữ để không phải phá schema khi giải có nam/nữ hoặc đơn/đôi.

## 2. State machines

### Tournament

```text
DRAFT
  → REGISTRATION_OPEN
  → REGISTRATION_CLOSED
  → DRAW_READY
  → DRAWN
  → PUBLISHED
  → LIVE
  → COMPLETED
  → ARCHIVED
```

- Có thể quay lại `DRAFT/REGISTRATION_OPEN` trước khi publish nếu không có match live/completed và được audit.
- `PUBLISHED/LIVE` không quay ngược trực tiếp; thay đổi cấu trúc dùng revision/workflow riêng.
- `ARCHIVED` read-only; restore về `COMPLETED` cần owner.

### Registration

`DRAFT → PENDING → APPROVED → CHECKED_IN`; nhánh kết thúc `REJECTED` hoặc `WITHDRAWN`. Participant chỉ vào draw input khi `APPROVED` và không `WITHDRAWN`.

### Draw revision

`DRAFT → VALIDATING → VALID | INVALID → PUBLISHED → SUPERSEDED`. Một stage chỉ có một published revision active. Revision published bất biến.

### Match

`SCHEDULED → CHECK_IN → LIVE ↔ PAUSED → COMPLETED`. Các terminal khác: `FORFEITED`, `CANCELLED`; `POSTPONED` phải có schedule mới trước khi live.

## 3. Format MVP

### Round-robin

- Single round: mỗi cặp gặp một lần.
- Double round: mỗi cặp gặp hai lần, đảo home/away hoặc side label.
- Số vòng: `n - 1` nếu n chẵn, `n` nếu n lẻ; participant ảo BYE không tạo match thật.
- Sinh lịch bằng circle/Berger method, deterministic theo thứ tự seed.
- Invariant: đúng số lần gặp, không participant chơi hai trận trong cùng round.

### Group + single elimination

- Chia participant vào `G` bảng, kích thước chênh tối đa 1 trừ khi cấu hình explicit.
- Mỗi bảng chạy round-robin đơn/đôi.
- Qualifier lấy top K hoặc mapping per-group; tie chưa giải quyết phải chặn finalize stage.
- Bracket mapping hỗ trợ `A1`, `B2`... và rule tránh cùng bảng gặp lại ở vòng đầu nếu khả thi.

### Single elimination

- Bracket size là lũy thừa 2 nhỏ nhất `>= N`.
- Số BYE = bracket size - N; BYE không tính là match thắng/thua thống kê.
- Seeding placement dùng canonical bracket mapping; top seeds được tách nhánh.
- Unseeded slot được shuffle deterministic bằng seed.
- Tùy chọn trận hạng ba được tạo từ hai loser semifinal.

Double elimination và Swiss không được “nới nhẹ” từ engine MVP; chúng là algorithm riêng thuộc backlog.

## 4. Pipeline tự động chia bảng

### Input snapshot bắt buộc

- Tournament/stage ID và revision base.
- Danh sách participant đã sort ổn định cùng seed/pot/rating/tags.
- Số bảng/kích thước mong muốn.
- Draw mode: `RANDOM`, `SEEDED_BALANCED`, `POT_DRAW`.
- Hard/soft constraints và weights.
- Locked assignments/slots.
- Algorithm name/version, random seed, timezone, người chạy.

Snapshot được canonicalize rồi hash. Không đọc “dữ liệu mới nhất” giữa chừng.

### Preflight

1. Không participant trùng/mất và tất cả đủ điều kiện.
2. Tổng capacity đủ và group size hợp lệ.
3. Seed/pot không xung đột locked slot.
4. Hard constraint có khả năng thỏa; nếu không, trả unsatisfied constraint và gợi ý điều chỉnh.
5. Qualifier mapping tương thích bracket size.

### Phân bổ

1. Đặt locked assignments trước.
2. Phân participant theo mode:
   - `RANDOM`: shuffle PRNG deterministic rồi phân round-robin vào group.
   - `SEEDED_BALANCED`: sort seed/rating; snake distribution theo hàng, random tie cùng hạng.
   - `POT_DRAW`: từng pot shuffle deterministic, mỗi group nhận tối đa cấu hình từ pot.
3. Với constraint, tạo candidate theo thứ tự PRNG và chấm penalty. Hard violation bị loại; chọn candidate có penalty thấp nhất, tie-break deterministic.
4. Trả kết quả, penalty, warnings, constraint explanation và checksum.

Không dùng `Math.random()` trực tiếp trong domain engine.

### Constraint MVP

- Hard: unique assignment, capacity, locked slot, tối đa participant/pot/group.
- Soft mặc định: tránh cùng club/đơn vị, tránh cùng region, cân rating tổng, cân seed count.
- Người dùng thấy constraint nào thỏa/không thỏa; soft violation không được ẩn.
- Nếu không có nghiệm hard hợp lệ trong giới hạn search, không publish; trả chẩn đoán.

## 5. Chỉnh thủ công

- Chỉ thao tác trên draft revision.
- Action: move, swap, reorder seed, set/unset BYE, lock/unlock, rename group, thay qualifier mapping trong giới hạn format.
- Mỗi action có command ID, actor, before/after và được đưa vào undo/redo stack của draft.
- Validation chạy sau action; UI cho phép tiếp tục chỉnh khi invalid nhưng cấm publish.
- “Run again” giữ locked slot và chỉ phân phần còn lại.
- Publish hiển thị diff so với revision đang active: participant move, schedule/match affected, qualifier mapping và warnings.
- Sau khi có match `LIVE/COMPLETED`, không cho move participant làm đổi lịch sử. Workflow tương lai phải cancel/reseed rõ ràng; MVP yêu cầu owner xử lý kết quả bị ảnh hưởng và audit.

## 6. Preset tính điểm và xếp hạng v1

Preset được snapshot vào stage. Cột và tie-breaker phải được render từ cùng rule config, không hard-code ở public UI.

### Football v1

- Kết quả: thắng 3, hòa 1, thua 0; forfeit default 3-0 nhưng lưu result type riêng.
- Rank mặc định: points → goal difference → goals for → head-to-head points → head-to-head goal difference → fair-play points → deterministic lot.
- Cho phép admin preset giải chỉnh điểm thắng/hòa/thua và bật/tắt tie-break được cho phép trước publish.

### Volleyball v1

- Best-of-5 mặc định; set 1-4 đến 25, set 5 đến 15, hơn 2; không cap mặc định.
- Match points: thắng 3-0/3-1 = 3; thắng 3-2 = 2; thua 2-3 = 1; thua 0-3/1-3 = 0.
- Rank: match wins → match points → set quotient → point quotient → head-to-head → lot.
- Division by zero dùng giá trị `infinity` theo rule engine và render rõ, không dùng số giả.

### Badminton v1

- Best-of-3 games; mỗi game đến 21, hơn 2, cap 30.
- Group ranking mặc định: match wins → game difference → point difference → head-to-head → lot.
- Hỗ trợ participant cá nhân hoặc đội; team tie nhiều trận con là follow-up, không giả lập bằng một match đơn trong MVP.

### Tie chưa giải quyết

- Tie-break `lot` không tự random ẩn. Hệ thống tạo một resolution task, lưu seed/phương pháp/người xác nhận và audit trước khi finalize qualifier.
- Với head-to-head nhiều đội hòa, mini-table được tính từ đúng tập đồng hạng nếu preset chỉ định.

## 7. Score event model

Các event chuẩn:

- `MATCH_STARTED`, `MATCH_PAUSED`, `MATCH_RESUMED`.
- `POINT_AWARDED`, `POINT_REVOKED` hoặc event môn-specific được adapter chuyển về reducer.
- `SET_STARTED`, `SET_ENDED`.
- `RESULT_PROPOSED`, `RESULT_CONFIRMED`, `RESULT_CORRECTED`.
- `FORFEIT_DECLARED`, `MATCH_CANCELLED`, `MATCH_COMPLETED`.

Mỗi event có `eventId`, `matchId`, `sequence`, `idempotencyKey`, `expectedVersion`, `actorId`, `occurredAt`, `recordedAt`, `payload`, `reason` khi correction. Reducer thuần tính snapshot. DB transaction ghi event + outbox; worker cập nhật projections/standings; public client có thể lấy snapshot khi thiếu sequence.

## 8. Scheduling rules MVP

- Một participant không có hai trận overlap kể cả buffer.
- Một venue/court không có hai trận overlap.
- Có duration và rest-minutes theo preset/giải.
- Auto schedule cơ bản: theo round, earliest valid slot, court capacity và rest constraint.
- Organizer có thể kéo lịch; conflict hard cấm save, soft warning cần reason override.
- Khi đổi schedule public, notification/outbox được tạo.
- Tối ưu hóa lịch phức tạp là backlog, không chặn MVP.

## 9. Invariants bắt buộc

- Participant xuất hiện đúng một lần trong stage draw input/output, trừ BYE là slot không phải participant.
- Match side trỏ đến participant hoặc nguồn qualifier hợp lệ, không cả hai.
- Completed match có result hợp lệ theo preset và không còn score event chưa resolve.
- Standings chỉ lấy match result được xác nhận và đúng revision active.
- Bracket node downstream chỉ có một nguồn cho mỗi side.
- Revision published, preset snapshot và score event không bị update/delete.
- Mọi command quan trọng có optimistic version hoặc idempotency key.
- Public projection không chứa PII/private notes.

## 10. Test oracle bắt buộc

- Golden fixtures cho 4/5/6/16 participant, số lẻ, BYE và double round-robin.
- Same input + same seed + same algorithm version = byte-equivalent canonical output.
- Bất kỳ seed nào cũng không mất/trùng participant và giữ hard constraint.
- Golden standings có tie 2 đội, tie 3 đội, forfeit, correction và quotient zero.
- Score reducer replay toàn bộ event cho cùng snapshot như projection lưu.
- Correction upstream phát hiện đúng downstream impact.
