# 11 - Vận hành, triển khai và phát hành

## 1. Môi trường

| Môi trường | Mục đích                      | Dữ liệu              | Deploy                  |
| ---------- | ----------------------------- | -------------------- | ----------------------- |
| Local      | Phát triển/test               | seed giả             | Docker Compose + pnpm   |
| CI         | Test cô lập                   | ephemeral            | mỗi pipeline            |
| Staging    | E2E, migration, load vừa, UAT | synthetic/anonymized | tự động từ main/release |
| Production | người dùng thật               | protected            | approval + gates        |

Không dùng chung database/bucket/Redis/secret giữa staging và production.

## 2. CI/CD pipeline

### Validate

1. Frozen pnpm install và repo guard.
2. Format/lint/typecheck.
3. Unit/property/contract.
4. PostgreSQL/Redis integration + blank migrations.
5. Build images/workspaces.
6. E2E smoke; scans.

### Release artifact

- Image immutable tag bằng commit SHA + release version.
- SBOM và dependency/container scan report.
- Web/realtime/worker dùng cùng contract release; không build lại khác nội dung cho production.

### Deploy

1. Backup/preflight DB capacity và pending jobs.
2. Migration compatibility/pre-deploy job.
3. Deploy web/realtime/worker theo strategy đã rehearsal.
4. Health/readiness và synthetic smoke auth/public/socket/job.
5. Theo dõi error/latency/saturation ít nhất monitoring window.
6. Promote hoặc rollback; ghi deploy audit.

## 3. Health và readiness

- Liveness chỉ xác nhận process loop sống, không restart storm vì dependency tạm hỏng.
- Readiness kiểm dependency bắt buộc, migration/schema compatibility và khả năng nhận traffic.
- Worker readiness kiểm queue/DB; realtime readiness kiểm Redis adapter nhưng có degradation policy rõ.
- `/health` public không lộ version chi tiết, connection string hay stack trace; internal diagnostics được bảo vệ.

## 4. Observability

### Logs

- JSON structured: timestamp, level, service, release, correlation/trace, route/job/event code, duration, result.
- Redact token, cookie, password, auth header, billing payload nhạy cảm, contact/PII.
- Score/audit business history không dựa vào application logs.

### Metrics

- HTTP RPS/error/latency; socket connections/subscriptions/reconnect/gap/resync.
- DB pool/latency/locks/storage; Redis latency/memory/eviction.
- Queue depth/age/retry/dead-letter; outbox lag.
- Auth failure/rate-limit; score conflict; draw duration/failure; projection lag.
- Email/billing webhook success/failure; entitlement reconciliation mismatch.

### Alerts ban đầu

- Sev-1: data corruption/loss, auth compromise, production unavailable, wrong score widespread.
- Sev-2: public/live unavailable > ngưỡng, queue/outbox lag ảnh hưởng giải, billing entitlement diện rộng.
- Sev-3: degraded performance, single feature/provider issue có workaround.
- Alert phải có runbook link, owner và tránh PII trong payload.

## 5. SLO/SLI

- Availability và latency theo NFR.
- Live freshness đo `public_received_at - score_event_recorded_at`.
- Projection freshness đo confirmed result đến standing/bracket active.
- Job success/age và billing reconciliation correctness.
- Error budget review trước khi mở rộng feature/traffic.

## 6. Backup/restore

- PostgreSQL automated backup/PITR nếu provider hỗ trợ; encrypted at rest/in transit.
- S3 versioning/lifecycle cho asset quan trọng; Redis không được coi là backup.
- Backup manifest gồm DB timestamp, migration version, object snapshot relation và encryption key policy.
- Retention: daily/weekly/monthly được chốt theo cost trước beta; tối thiểu đáp ứng RPO.
- Restore drill sang môi trường sạch: restore DB/object, run migration compatibility, checksum fixtures, login/public/live read smoke.
- Ghi thời gian thực tế so với RTO; drill fail chặn GA.

## 7. Migration và rollback

- Expand schema tương thích N-1 → deploy code dual-read/write nếu cần → backfill idempotent → switch → contract ở release sau.
- Không chạy migration table rewrite lớn không đo lock/time.
- Mỗi migration ghi data size assumption, lock risk, forward recovery và backup need.
- Rollback app chỉ về version tương thích schema hiện tại; không tự chạy down migration phá dữ liệu.
- Nếu score/draw algorithm lỗi, giữ algorithm/preset version cũ và rollback routing; không rewrite published history.

## 8. Incident runbooks tối thiểu

- DB unavailable/pool exhausted.
- Redis unavailable/queue stalled.
- Socket overload/reconnect storm.
- Score event/projection mismatch.
- Wrong published draw/bracket.
- Billing webhook backlog/entitlement mismatch.
- Email provider failure.
- Suspected account/admin compromise.
- PII leakage/public cache incident.
- Disk/storage full và failed deployment.

Mỗi runbook có detect, impact, immediate containment, diagnosis, recovery, verification, communication và postmortem.

## 9. Feature rollout

- Feature flag dùng cho rollout/risk isolation, không thay authorization/entitlement.
- Flag có owner, default, audience, expiry/removal task; không để flag chết vô hạn.
- Rollout internal → selected beta tournaments → percentage/tier → all.
- Schema/event phải an toàn khi flag on/off và worker version khác tạm thời.
- Kill switch cho billing checkout, bulk import và realtime publish khi provider/hệ thống bất ổn; core public read ưu tiên giữ.

## 10. Beta operations

- Chọn giải pilot có organizer đồng ý và kênh fallback nhập/kết quả rõ.
- Trước sự kiện: capacity check, staff/scorer rehearsal, backup, device/network test, support contact.
- Trong sự kiện: dashboard live/outbox/socket/DB; on-call và escalation.
- Sau sự kiện: reconcile match/standings/audit, export, thu feedback và incident review.
- Không dùng giải quan trọng đầu tiên làm test production không rehearsal.

## 11. Release checklist

### Trước deploy

- [ ] Approved release scope/CR/ADR và version.
- [ ] CI/full regression/security/load/accessibility pass.
- [ ] Migration rehearsal và backup gần nhất verified.
- [ ] Secrets/config/provider quota/certificate/domain kiểm tra.
- [ ] On-call, rollback owner, monitoring window và communication sẵn sàng.

### Sau deploy

- [ ] Health/readiness/synthetic auth/public/socket/score/job pass.
- [ ] Error/latency/DB/Redis/queue/outbox không regression.
- [ ] Migration row/checksum đúng.
- [ ] Không PII/secret trong sample logs.
- [ ] Release note/status update và deploy audit.

### Go-live GA

- [ ] Terms/privacy/cookie/support/contact được duyệt.
- [ ] Restore drill đạt RPO/RTO.
- [ ] Admin MFA và key rotation procedure.
- [ ] Billing reconciliation/refund/support workflow nếu thu tiền.
- [ ] Zero Sev-1/2; risk acceptance được chủ dự án ký.
- [ ] Capacity headroom và cost alert.

## 12. Cost controls

- Theo dõi DB storage/connections, Redis memory, egress/socket, object storage, email và error tracking volume.
- Rate/quota server bảo vệ hạ tầng nhưng không silently drop live data.
- Public cache và snapshot giảm DB fan-out; load test trước tăng VIP limit.
- Cost spike alert có breakdown theo tournament/capability nếu khả thi.
- Không tối ưu bằng cách giảm backup/log/audit dưới policy.
