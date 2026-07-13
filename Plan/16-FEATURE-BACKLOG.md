# 16 - Backlog gợi ý tính năng sau MVP

## 1. Luật đưa backlog vào sản phẩm

- Hạng mục dưới đây không tự động thuộc scope.
- Muốn triển khai phải có dữ liệu/feedback, owner, acceptance, phase và CR approved.
- Không được làm backlog nếu gate MVP liên quan chưa pass.
- Ưu tiên tính năng tăng độ đúng, giảm việc vận hành hoặc tăng khả năng thu phí trước tính năng trang trí.

## 2. Nhóm ưu tiên đề xuất

### Next sau GA - giá trị cao, gần core

| ID    | Tính năng gợi ý                                             | Giá trị                        | Điều kiện                              |
| ----- | ----------------------------------------------------------- | ------------------------------ | -------------------------------------- |
| BL-01 | Public self-registration + captain portal + duyệt hồ sơ     | Giảm nhập tay, phù hợp giải mở | Identity/eligibility/privacy ổn định   |
| BL-02 | QR check-in đội/VĐV/trận                                    | Vận hành nhanh tại sân         | Mobile flow + public ID security       |
| BL-03 | PWA scorer với offline queue có conflict resolution         | Chịu mạng sân yếu              | Score idempotency/replay đã chứng minh |
| BL-04 | PDF/Excel bracket, lịch, biên bản và kết quả                | Nhu cầu in/chia sẻ phổ biến    | Versioned publication/export           |
| BL-05 | Tournament templates/clone nâng cao                         | Tổ chức giải lặp lại nhanh     | Preset/revision ổn định, privacy rules |
| BL-06 | Web push/Zalo notification adapter                          | Nhắc lịch/kết quả kịp thời     | Consent/provider/cost policy           |
| BL-07 | Lịch thi đấu optimizer theo sân/rest/khung giờ/độ công bằng | Giảm sửa tay                   | Dữ liệu thực tế và baseline heuristic  |
| BL-08 | Verification page cho bốc thăm: seed/hash/algorithm replay  | Tăng niềm tin                  | Stable algorithm versions/public spec  |

### Expansion thể thức/môn

| ID    | Tính năng gợi ý                       | Ghi chú                                                         |
| ----- | ------------------------------------- | --------------------------------------------------------------- |
| BL-09 | Double elimination                    | Engine/UX/graph/tests riêng, không reuse sai single elim.       |
| BL-10 | Swiss pairing                         | Cần score groups, repeat avoidance, Buchholz/tie-break version. |
| BL-11 | Group nhiều phase/reseeding playoffs  | Cần dependency graph/revision impact nâng cao.                  |
| BL-12 | League season dài hạn/home-away table | Cần postponement, venue, transfer roster windows.               |
| BL-13 | Badminton/team tie nhiều trận con     | Parent tie, lineup, rubber scoring và aggregate result.         |
| BL-14 | Tennis/table tennis/esports presets   | Chỉ thêm sau golden fixtures và chuyên gia luật.                |
| BL-15 | Free-for-all/heat/lane formats        | Domain khác head-to-head, cần proposal riêng.                   |

### Monetization/VIP

| ID    | Tính năng gợi ý                               | Giá trị/rủi ro                                            |
| ----- | --------------------------------------------- | --------------------------------------------------------- |
| BL-16 | Custom domain + white-label                   | VIP/enterprise; cần TLS/domain verification/support.      |
| BL-17 | Sponsor banner/placement có lịch              | Doanh thu organizer; cần a11y/performance/content policy. |
| BL-18 | Thu phí đăng ký + invoice/refund/payout       | Giá trị cao nhưng pháp lý/billing phức tạp.               |
| BL-19 | Advanced analytics và historical ranking      | VIP; cần privacy/data quality/version.                    |
| BL-20 | Organization workspace/multi-tournament staff | CLB/đơn vị lớn; cần tenant role/billing model.            |
| BL-21 | Public API/webhooks/API keys                  | Tích hợp đối tác; cần quota/version/security/support.     |

### Trải nghiệm khán giả

| ID    | Tính năng gợi ý                                | Ghi chú                                                    |
| ----- | ---------------------------------------------- | ---------------------------------------------------------- |
| BL-22 | Embed livestream/link video theo match         | Chỉ allowlist/embed, không tự host ban đầu.                |
| BL-23 | Follow team/match và notification opt-in       | Consent, anti-spam, channel adapters.                      |
| BL-24 | Live event timeline, lineup, thẻ/phạt/thống kê | Sport-specific event schemas.                              |
| BL-25 | Multi-language và RTL-ready public site        | i18n foundation đã chuẩn bị, cần content/localization.     |
| BL-26 | Custom public themes trong giới hạn accessible | VIP branding, cần design token guard.                      |
| BL-27 | TV/venue scoreboard mode                       | Fullscreen, high contrast, remote control/read-only token. |

### Trợ lý thông minh

| ID    | Tính năng gợi ý                                    | Guardrail bắt buộc                                                                  |
| ----- | -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| BL-28 | Gợi ý format/schedule nâng cao từ lịch sử          | Chỉ suggestion, có lý do/simulation; không tự apply.                                |
| BL-29 | Phát hiện dữ liệu import bất thường/trùng gần đúng | Không merge/xóa tự động; user review.                                               |
| BL-30 | Gợi ý seed/cân bằng dựa trên rating lịch sử        | Hiển thị nguồn/độ tin cậy; organizer chịu quyết định.                               |
| BL-31 | Tóm tắt thông báo/kết quả bằng AI                  | Không bịa tỉ số; dữ liệu có cấu trúc là nguồn; preview/approve.                     |
| BL-32 | Chat trợ lý setup giải                             | Không có quyền publish/score/billing; không gửi PII cho model nếu chưa consent/DPA. |

## 3. Gợi ý tự động trong MVP (đã thuộc P2)

Advisor rule-based cần đề xuất:

- Với N participant: format khả thi, số bảng, kích thước, số trận, BYE.
- Với thời gian/court: ước lượng tổng thời lượng và cảnh báo không đủ slot.
- Với seed/pot/tags: constraint nào có nguy cơ không thỏa.
- Với category/sport: preset và best-of/default scoring phù hợp.
- Trước publish: missing data, invalid mapping, conflict và public privacy warning.

Mỗi suggestion gồm `ruleVersion`, input summary, recommendation, reason, trade-offs, confidence (`EXACT`/`HEURISTIC`), action `APPLY_TO_DRAFT` và dismiss reason optional. Advisor không gọi generative AI ở MVP.

## 4. Tiêu chí xếp ưu tiên backlog

Chấm 1-5 cho:

- Reach: bao nhiêu organizer/event cần.
- Impact: giảm lỗi/thời gian hoặc tăng conversion/revenue.
- Confidence: dữ liệu/feedback chứng minh.
- Effort/risk: domain, security, ops, legal.

Ưu tiên tương đối = `(Reach × Impact × Confidence) / Effort`. Security/data-integrity fix không cần cạnh tranh điểm với feature.

## 5. Những tính năng không khuyến nghị sớm

- Native app trước khi PWA/mobile web được chứng minh thiếu.
- Chat/social feed vì moderation/abuse không phục vụ core.
- AI dự đoán người thắng vì dễ tạo kỳ vọng sai và không giúp vận hành.
- Microservice/Kubernetes chỉ để “scale tương lai”.
- Blockchain cho draw nếu seed/hash/audit/replay đã giải quyết tính minh bạch.
