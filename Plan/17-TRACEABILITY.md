# 17 - Ma trận truy vết yêu cầu → task → test

## 1. Chức năng

| Requirement          | Phase/task chính | Test/evidence bắt buộc                          | Đặc tả nguồn           |
| -------------------- | ---------------- | ----------------------------------------------- | ---------------------- |
| REQ-ACC-01..05       | P1-01            | E2E-A..F; auth integration/token/session/idempotency/overload deny | PRD, Security §3, API §Identity, CR-2026-001 |
| REQ-ACC-06..08       | P1-02, P6        | entitlement/privacy export-delete tests         | Security §5/§7         |
| REQ-ORG-01..03       | P1-03            | wizard resume/slug/quota/timezone E2E           | UX Flow A              |
| REQ-ORG-04           | P1-04            | role/IDOR/cross-tournament matrix               | Security §2/§4         |
| REQ-ORG-05..08       | P1-03            | lifecycle/archive/clone/checklist tests         | Domain §2              |
| REQ-PAR-01..04       | P2-01            | DB type/privacy/roster fixtures                 | Data §4, UX Flow B     |
| REQ-PAR-05/06/09     | P2-02            | registration transition/bulk/concurrency        | Domain §2              |
| REQ-PAR-07/08        | P2-03            | import retry/rollback/privacy/formula injection | API §9                 |
| REQ-DRW-01..05       | P3-02            | property/golden/determinism/constraint tests    | Domain §4              |
| REQ-DRW-06..09/11    | P3-04            | E2E-05/06, revision DB immutability             | Domain §5, UX Flow C/F |
| REQ-DRW-10           | P3-01/03/05      | RR/bracket/BYE/schedule fixtures                | Domain §3/§8           |
| REQ-MAT-01           | P3-05            | overlap/rest/court property + E2E-07            | Domain §8              |
| REQ-MAT-02..06/09/10 | P4-01            | reducer/idempotency/concurrency/audit E2E-08    | Domain §7, API §4      |
| REQ-MAT-07/08        | P4-02            | projection replay, crash/retry, E2E-10          | Architecture §6        |
| REQ-PUB-01..06/09    | P4-03            | privacy/cache/SEO/a11y/visual                   | UX Flow E              |
| REQ-PUB-07/10        | P4-04            | socket sequence/gap/reconnect/load E2E-09       | API §3                 |
| REQ-PUB-08           | P4-04            | sanitize/schedule/dedupe/realtime E2E-11        | API §7                 |
| REQ-VIP-01/02        | P1-02, P5-02     | server gate/quota race/cross-tier               | Security §5            |
| REQ-VIP-03..05       | P5-01            | webhook duplicate/order/grace E2E-12            | Security §6, API §8    |
| REQ-ADM-01..03       | P5-03            | admin MFA/reason/audit/no-bypass E2E-13         | Security §2/§10        |
| REQ-AST-01..05       | P2-04            | deterministic suggestions/reason/no-auto-apply  | Backlog §3             |

## 2. Phi chức năng

| NFR                            | Gate             | Bằng chứng                                   |
| ------------------------------ | ---------------- | -------------------------------------------- |
| NFR-01 availability            | P6/production    | SLI dashboard, alert test, incident drill    |
| NFR-02 Web Vitals              | P4/P6            | Lighthouse/RUM staging mobile report         |
| NFR-03 API latency             | P4/P6            | k6 HTTP report + DB query profile            |
| NFR-04 live latency/resync     | P4               | socket load/gap/reconnect report             |
| NFR-05 concurrent viewers      | P4/P6            | staged k6/socket benchmark, capacity signoff |
| NFR-06 WCAG                    | từng UI phase/P6 | axe + keyboard/screen reader checklist       |
| NFR-07 secrets/PII             | mỗi phase/P6     | scans, public DTO/log privacy tests          |
| NFR-08 RPO/RTO                 | P6               | restore drill timestamps/checksum            |
| NFR-09 retention/audit         | P5/P6            | policy config, cleanup/archive tests         |
| NFR-10 browsers                | P4/P6            | Playwright browser/device matrix             |
| NFR-11 idempotency/concurrency | P1-P5            | integration race/retry tests                 |
| NFR-12 observability           | P0/P6            | logs/metrics/alerts synthetic incident       |

## 3. Quyết định → cơ chế kiểm soát

| Decisions      | Cơ chế                                                 |
| -------------- | ------------------------------------------------------ |
| D-001..003     | `guard:plan`, workspace/frozen lockfile/CI structure   |
| D-004..007     | architecture review, deploy/migration integration      |
| D-008/015..019 | domain boundary, property/golden/replay/realtime tests |
| D-009/010      | time/auth tests, DB/cookie controls                    |
| D-011/020/021  | permission/entitlement server matrix                   |
| D-012..014/017 | publication/revision/preset immutability constraints   |
| D-022/023      | CI/release gates, observability/privacy checks         |
| D-024          | `PROJECT_STATE.md`, one in-progress task review        |
| D-025          | advisor deterministic/no-auto-apply acceptance tests   |
| D-026          | Auth contract schemas, migration/constraint, idempotency, key-rotation, outbox and E2E-A..F tests |

## 4. Quy tắc truy vết

- PR/handoff ghi tất cả Requirement/Decision/Checklist IDs chịu ảnh hưởng.
- `P1-001..007` thuộc DoD `P1-01`; grant chuyển sang `P1-008`, membership/invitation sang `P1-017`, socket revoke/disconnect sang `P4-020` theo `CR-2026-001`.
- Requirement mới phải thêm row trước khi code.
- Test bị xóa/đổi oracle phải chỉ ra requirement nào vẫn được bảo vệ.
- Một requirement không có task/test là khoảng trống và không thể đánh dấu release complete.
