# 14 - Changelog và kiểm soát thay đổi

## 1. Nguyên tắc

Kế hoạch là baseline. “Bám sát kế hoạch” không có nghĩa là cấm thay đổi hợp lý; nghĩa là không thay đổi âm thầm. Mọi thay đổi đáng kể phải có đề xuất, người phê duyệt, tác động, migration và dấu vết.

## 2. Khi nào bắt buộc có Change Request

- Thêm/bớt must-have hoặc chuyển feature giữa các phase.
- Đổi stack, dependency nền tảng, hosting, data source hoặc service bên ngoài.
- Đổi role/permission, tier/quota, privacy, retention hoặc pricing.
- Đổi schema/API/public URL theo cách không tương thích.
- Đổi thuật toán draw/ranking/scoring hoặc luật preset.
- Đổi Definition of Done, test gate hoặc security control.
- Sửa luật AI hoặc quyết định `LOCKED`.

Không cần CR cho bug fix giữ nguyên contract, nội dung copy, test bổ sung hoặc refactor cục bộ không đổi hành vi.

## 3. Workflow

```text
PROPOSED → REVIEWING → APPROVED → IMPLEMENTED → VERIFIED
                    ↘ REJECTED
                    ↘ DEFERRED
```

1. Tạo `Plan/changes/CR-YYYY-NNN-<slug>.md` từ template.
2. Điền before/after, lý do, bằng chứng, tác động, migration, rollback và test.
3. Chủ dự án phê duyệt/reject; AI không có quyền tự phê duyệt.
4. Nếu approved, cập nhật `13-DECISIONS.md` và mọi tài liệu chịu ảnh hưởng trước/cùng lúc với code.
5. Triển khai bằng task ID riêng.
6. Verify; ghi bằng chứng; cập nhật trạng thái CR và changelog.

## 4. Khi nào cần ADR

ADR bắt buộc nếu thay đổi ranh giới service/package, storage, auth, realtime, deployment, transaction/event model hoặc lựa chọn công nghệ ảnh hưởng dài hạn. ADR ghi context, options, decision và consequences; CR ghi quyền thay đổi phạm vi/baseline. Hai tài liệu liên kết lẫn nhau.

## 5. Emergency change

Hotfix production được phép ưu tiên khôi phục dịch vụ hoặc ngăn mất dữ liệu. Vẫn phải:

- Ghi incident ID và người cho phép.
- Thay đổi nhỏ nhất, có rollback.
- Không lén thêm feature.
- Tạo CR/ADR hồi tố trong 24 giờ và bổ sung regression test.

## 6. Changelog baseline

| Ngày       | ID           | Trạng thái | Nội dung                                             | Người phê duyệt                |
| ---------- | ------------ | ---------- | ---------------------------------------------------- | ------------------------------ |
| 2026-07-13 | BASELINE-001 | LOCKED     | Tạo bộ kế hoạch AutoBracket ban đầu và D-001..D-025. | Chủ dự án yêu cầu lập kế hoạch |
| 2026-07-14 | CR-2026-001  | APPROVED   | Khóa contract bảo mật/API identity `P1-01`; thêm D-026 và điều chỉnh ranh giới checklist liên phase. | Chủ dự án |

## 7. Thư mục dự kiến

```text
Plan/
  changes/       # CR đã tạo
  decisions/     # ADR đã tạo
  handoffs/      # bằng chứng bàn giao task/phase
  templates/     # mẫu không có trạng thái phê duyệt
```

Các thư mục `changes`, `decisions`, `handoffs` chỉ cần tạo khi có hồ sơ đầu tiên; không dùng file trống để giả trạng thái.
