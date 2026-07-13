# 15 - Rủi ro và câu hỏi mở

## 1. Risk register

| ID   | Rủi ro                                            |  Xác suất  | Tác động | Giảm thiểu/trigger                                                                          |
| ---- | ------------------------------------------------- | :--------: | :------: | ------------------------------------------------------------------------------------------- |
| R-01 | Luật môn/giải khác preset mặc định                |    Cao     |   Cao    | Preset version + override allowlist + golden fixtures; trigger khi giải pilot có rule khác. |
| R-02 | Auto draw bị nghi thiên vị hoặc không tái lập     |   Trung    |   Cao    | Seed/input hash/algorithm version/audit/explanation; công khai method tùy chọn.             |
| R-03 | Chỉnh bảng sau khi trận đã bắt đầu phá lịch sử    |   Trung    | Rất cao  | Published revision immutable, state gate, impact workflow; không cho direct edit.           |
| R-04 | Hai scorer hoặc retry tạo điểm trùng              |   Trung    | Rất cao  | Append-only sequence, idempotency, optimistic version, reducer replay.                      |
| R-05 | Realtime gap/out-of-order làm public thấy sai     |    Cao     |   Cao    | Sequence/dedupe/snapshot/resync/stale indicator; load + chaos tests.                        |
| R-06 | Sai quyền/IDOR lộ giải draft hoặc PII             |   Trung    | Rất cao  | Server policy, DTO allowlist, cross-tenant deny tests, audit.                               |
| R-07 | Quota race hoặc downgrade làm mất dữ liệu         |   Trung    |   Cao    | Transactional check, read-preserving downgrade/grace, server entitlement.                   |
| R-08 | Billing webhook trùng/trễ/sai thứ tự              |    Cao     |   Cao    | Signature, provider event unique, state reconciliation, không tin redirect.                 |
| R-09 | Import dữ liệu bẩn/trùng/file độc hại             |    Cao     |   Cao    | Preview, row validation, checksum, size/type scan, idempotent batch/rollback.               |
| R-10 | Auto scheduling trở thành bài toán tối ưu quá lớn |    Cao     |  Trung   | MVP earliest-valid heuristic + conflict editor; optimizer nâng cao ở backlog.               |
| R-11 | Public bracket khó dùng trên mobile/a11y          |    Cao     |  Trung   | Accessible list fallback, zoom/pan desktop, visual/a11y testing sớm.                        |
| R-12 | Socket traffic VIP vượt hạ tầng/cost              |   Trung    |   Cao    | Redis adapter, cache/snapshot, load theo bậc, quota/cost alert trước cam kết.               |
| R-13 | Scope creep do thêm môn/thể thức/tính năng        |    Cao     |   Cao    | Must-have/deferred rõ, one-task WIP, CR bắt buộc, AI rules/guard.                           |
| R-14 | Migration làm khóa/mất DB production              | Thấp-Trung | Rất cao  | Expand/backfill/switch, rehearsal, backup/restore, release gate.                            |
| R-15 | Single VPS/provider outage                        |   Trung    |   Cao    | Backup/PITR, runbook, health/monitoring; HA sau khi nhu cầu được chứng minh.                |
| R-16 | Vi phạm retention/privacy/pháp lý                 |   Trung    | Rất cao  | Data minimization, policy review trước GA, export/delete/pseudonymize.                      |
| R-17 | Gợi ý tự động bị hiểu là quyết định bắt buộc      |   Trung    |  Trung   | Hiển thị reason/trade-off, không auto-apply/publish, version và audit accept.               |
| R-18 | Preset update làm đổi kết quả lịch sử             |    Thấp    | Rất cao  | Snapshot/version immutable, không update hồi tố, migration test.                            |

## 2. Câu hỏi mở và default đang áp dụng

Default giúp phase không bị kẹt. Muốn đổi default ảnh hưởng quyết định phải có CR.

| ID    | Câu hỏi cần chủ dự án chốt                   | Default để tiếp tục                                                                           | Deadline chốt               |
| ----- | -------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------- |
| OQ-01 | Tên thương hiệu/domain/logo cuối?            | Dùng `AutoBracket`, placeholder brand, không mua domain.                                      | Trước P3 public UI polish   |
| OQ-02 | Nhóm khách hàng đầu tiên?                    | Giải phong trào/trường học/CLB tại Việt Nam, 8-64 participant.                                | Trước pilot P4              |
| OQ-03 | Giải có nhiều category ngay MVP?             | Có data model; UI hỗ trợ category mặc định và thêm nhiều category cơ bản.                     | Trước P1-03                 |
| OQ-04 | Quy trình self-registration/team captain?    | Organizer nhập/import và duyệt; public self-service deferred.                                 | Trước backlog promotion     |
| OQ-05 | Bộ luật liên đoàn cụ thể?                    | Football/volleyball/badminton preset v1 trong domain doc, organizer override field được phép. | Trước P3 golden signoff     |
| OQ-06 | Provider email?                              | Dùng adapter; local fake/mail sandbox, production chọn provider theo vùng/cost.               | Trước P1-01 staging         |
| OQ-07 | Provider billing, currency và giá VIP?       | Admin grant VIP có hạn; không thu tiền thật cho đến CR approved.                              | Trước P5-01                 |
| OQ-08 | Data region/hosting provider?                | Một VPS/VM tại khu vực Đông Nam Á, Docker; provider chưa khóa.                                | Trước staging chứa UAT data |
| OQ-09 | Retention chính xác cho PII/audit/score?     | Raw import 30 ngày; audit tối thiểu 24 tháng; lịch sử thi đấu giữ đến khi policy chốt.        | Trước closed beta           |
| OQ-10 | Public/private/unlisted visibility?          | Hỗ trợ PUBLIC và PRIVATE trong MVP; UNLISTED có thể thêm bằng CR nếu cần.                     | Trước P3 publish model      |
| OQ-11 | VIP trial/refund/grace?                      | Grace 7 ngày, không tự xóa dữ liệu; giá/trial/refund theo provider policy sau CR.             | Trước P5                    |
| OQ-12 | Notification ngoài email/in-app?             | Không SMS/Zalo/web push trong MVP.                                                            | Sau P4 feedback             |
| OQ-13 | Mức tải cam kết bán hàng?                    | Targets NFR/checklist, chưa quảng cáo SLA trước load evidence.                                | Trước paid beta             |
| OQ-14 | Chính sách fair-play/head-to-head từng giải? | Preset v1; hiển thị trace và cho override allowlist trước publish.                            | Trước pilot mỗi môn         |
| OQ-15 | Có cần team tie nhiều trận con cho cầu lông? | Không trong MVP; badminton participant match đơn/đôi tổng quát.                               | Trước nhận giải đồng đội    |

## 3. Cách xử lý unknown

- Unknown không ảnh hưởng task hiện tại: ghi default và tiếp tục.
- Unknown làm thay đổi contract/schema/scope: tạo CR, dừng phần liên quan.
- Unknown liên quan pháp lý/thanh toán/production access: không tự suy đoán; chờ chủ dự án/chuyên gia.
- Rủi ro phát sinh phải thêm ID, owner/phase, mitigation và trigger; không chỉ ghi trong chat.

## 4. Risk review cadence

- Mỗi task handoff: xem rủi ro mới/đổi mức.
- Mỗi phase gate: review toàn bảng và open questions đến hạn.
- Trước pilot/live event: review R-02..R-06, R-09, R-12, R-15.
- Trước billing/GA: review tất cả security/privacy/operational risks và signoff.
