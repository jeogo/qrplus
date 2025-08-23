# Detailed Modernization & Refactor Plan

Mixed Language (Arabic + English) for clarity with local team.

---
## 1. إعادة هيكلة الخدمات / Service Layer Refactor
**Goal:** فصل منطق الأعمال عن طبقة HTTP (Next.js Route Handlers) لتسهيل الاختبار، المراقبة، وإعادة الاستخدام.

### 1.1 Target Architecture
- `services/orders-service.ts`: CRUD + status transitions + archival orchestration.
- `services/notification-service.ts`: Push abstraction (roles, batching, localization keys).
- `services/i18n-service.ts`: Key lookup + fallback + formatting helpers.
- `repositories/*`: Firestore data access (ordersRepo, orderItemsRepo, tokensRepo, accountsRepo, archiveRepo).
- `adapters/push-adapter.ts`: Wrap Firebase Admin messaging.
- `adapters/cache-adapter.ts`: Pluggable (in-memory -> Redis future).

### 1.2 Refactor Strategy (Incremental)
1. Extract pure transition validation & role-gate to service (no Firestore write) + test.
2. Introduce repository functions used by route handlers (thin wrapper).
3. Move side-effects (mirror, push, archive) behind a `OrdersService.updateStatus()` method.
4. Replace inline async IIFEs with an explicit `PostCommitActions` queue executed after transaction result.
5. Add domain events enum (e.g., `ORDER_STATUS_CHANGED`, `ORDER_ARCHIVED`).
6. (Optional later) Add event dispatcher for decoupling (facilitates future queue/message broker).

### 1.3 Acceptance Criteria
- Route handler ≤ 40 lines, only: parse -> authorize -> call service -> map result.
- No direct Firebase admin usage outside repositories & adapters.
- 95% of order logic covered by unit tests.

### 1.4 Risks & Mitigations
- Risk: Large PR churn. Mitigation: Strangler pattern; create new files, cut over one endpoint at a time.
- Risk: Hidden coupling (mirror/push). Mitigation: Introduce adapter interfaces first, keep concrete behind them.

---
## 2. المراقبة / Observability (Logs + Metrics + Tracing)
**Goal:** تحسين القدرة على تتبع الأخطاء والأداء.

### 2.1 Logging
- Introduce `lib/observability/logger.ts` with structured API: `log.info({ msg, ...fields })`.
- Standard fields: `requestId`, `userId`, `role`, `accountId`, `orderId`, `span`, `durationMs`.
- Map console.* temporarily to logger to maintain backward compatibility.

### 2.2 Metrics
- Minimal provider abstraction (prom-client if serverful, or OpenTelemetry metrics API).
- Counters: `orders_status_transition_total{from,to}`, `push_sent_total{kind,role,lang}`, `orders_api_errors_total{route,code}`.
- Histograms: `orders_status_transition_latency_ms`, `route_latency_ms{route}`.

### 2.3 Tracing
- Add OpenTelemetry SDK init (optional Phase P2). Wrap Firestore calls in spans if feasible.

### 2.4 Error Taxonomy
- Define error classes: `AuthError`, `ValidationError`, `NotFoundError`, `ConflictError`, `RateLimitError`.
- Map to consistent JSON `{ success:false, error:{ code, message } }`.

### 2.5 Acceptance
- 90% of service functions emit at least one structured log line.
- Metrics endpoint (if enabled) exposes counters with activity after test run.

---
## 3. الاختبارات / Testing Strategy
**Goal:** ضمان صحة المنطق وتقليل الارتداد (regression).

### 3.1 Test Types
- Unit: pure functions (transition validator, localization lookup, token grouping).
- Service: orders service with repo mocks.
- Integration: In-memory Firestore emulator (scripts) for critical flows.
- Load: k6 or autocannon script for PATCH /orders/:id status transitions.
- Smoke: Minimal route invocation after build in CI.

### 3.2 Tooling
- Framework: Vitest (fast + TS) or Jest; decide based on team preference.
- Mocking: Native + test doubles for adapters.
- Firestore Emulator: Launch in CI (GitHub Action service step) for integration tests.

### 3.3 Coverage Targets
| Layer | Target |
|-------|--------|
| Pure utils | 100% lines |
| Services | 85% lines / 95% branches for transitions |
| Routes (integration) | Critical paths only |

### 3.4 CI Gates
- Fail build if global < 80% line coverage.
- Lint + type-check + unit + integration in parallel stages.

### 3.5 Test Data Strategy
- Factories (e.g., `makeOrder({ status:'pending' })`).
- Deterministic IDs for reproducibility.
- Use seed scripts for manual QA only; tests isolated.

---
## 4. دعم اللغات / Internationalization (i18n)
**Goal:** فصل النصوص عن المنطق + تسهيل إضافة لغات.

### 4.1 Catalog Structure
- `i18n/notifications.{lang}.json` (keys: `order.new.title`, `order.new.body`, ...)
- `i18n/common.{lang}.json` for shared UI.

### 4.2 Lookup Flow
1. Determine lang preference (token DB record, header, fallback 'fr').
2. Load compiled catalog (import JSON -> map) — prefer build-time bundling.
3. Format with interpolation: e.g., `t('order.ready.title', { num, table })`.

### 4.3 Migration Steps
- Inventory existing switch-case strings (push-sender now).
- Replace with key lookups; fallback to default language if missing.
- Add tests verifying AR/FR value correctness.

### 4.4 Future-Proofing
- Add missing key detection in dev (warn if key absent).

### 4.5 Acceptance
- Zero hard-coded AR/FR strings in code (excluding tests & fallbacks).

---
## 5. الأمان / Security Hardening
**Goal:** تقليل مخاطر الإساءة ورفع جودة التحكم بالوصول.

### 5.1 Rate Limiting
- Middleware applying token + IP bucket (e.g., sliding window). Store counters (in-memory first, Redis later).
- Policies: e.g., 30 writes / 60s / account for order status transitions.

### 5.2 Secure File Upload
- Switch to signed Cloudinary uploads: server returns signature & timestamp; client uploads directly.
- Validate MIME & size (enforce via Cloudinary upload preset + client pre-check).

### 5.3 Auth & Permissions Audit
- Enumerate resources/actions; document matrix.
- Add tests for forbidden transitions per role.

### 5.4 Input Validation Uniformity
- All route inputs pass through Zod schemas; remove manual ad-hoc checks.

### 5.5 Secrets & Config
- Introduce config validation at startup; fail fast if missing (`CLOUDINARY_API_KEY`, etc.).

### 5.6 Acceptance
- Rate limit responses return 429 with structured error.
- All uploads require server-provided signature (no unsigned preset exposure).

---
## 6. الأداء / Performance Optimization
**Goal:** تقليل زمن الاستجابة وتكاليف Firestore.

### 6.1 Caching Strategy
- In-memory LRU for hot GET order lookups (TTL 5–10s) keyed by `accountId:orderId`.
- Potential CDN caching for public menu endpoints (cache-control headers).

### 6.2 Query Optimization
- Batch fetch of related documents where possible (e.g., order + items with a single aggregated structure in mirror or precomputed subcollection if needed).
- Evaluate composite indexes needed; document them.

### 6.3 Write Path Improvements
- Collapse sequential status updates (debounce waiter double taps) via optimistic guard / idempotency key.

### 6.4 Push Pipeline Performance
- Group send operations concurrently per language-role group (Promise.all with concurrency cap).
- Track push sending latency metric.

### 6.5 Profiling & Benchmarks
- Baseline: capture p50/p95 for GET /orders/:id, PATCH status under moderate load.
- Post-optimization comparison.

### 6.6 Acceptance
- Demonstrated ≥30% reduction in p95 for status PATCH after caching + refactor.

---
## 7. الحوكمة و إدارة التنفيذ / Delivery Governance
**Goal:** تنفيذ آمن تدريجي بدون تجميد التطوير.

### 7.1 Branching & Releases
- Feature branches per epic segment (e.g., `feat/service-orders-basic`).
- Weekly integration branch -> main after CI & review.

### 7.2 Progressive Rollout
- Feature flag for new service layer initially (env var toggle to fall back to legacy code for critical endpoints if needed for one release).

### 7.3 Documentation
- Update `README` with: architecture diagram, local dev steps, test commands, observability instructions.
- Add `docs/ARCHITECTURE.md` (later).

### 7.4 Risk Register (Sample)
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Latent bug in refactored status updates | Medium | High | Dual-path flag + integration tests |
| Rate limiting false positives | Low | Medium | Dry-run mode logs only first |
| Catalog key drift | Medium | Low | Build-time key presence check |

### 7.5 Exit Criteria For Modernization Initiative
- All legacy inline logic removed from route handlers (except thin wiring).
- Observability dashboard adopted by team.
- SLA on order status update (< 300ms p95) met.

---
## 8. Task Breakdown (Initial Backlog Extract)
Numbering for issue creation.

1. Create logging wrapper & integrate in one route. (DONE)
2. Define error classes + map in handler middleware. (DONE)
3. Extract transition validator & role guard to service method + tests. (DONE)
4. Introduce repositories (orders, accounts, tokens) + adapt GET /orders/:id. (PARTIAL - tokens repo TBD)
5. Implement OrdersService.updateStatus with post-commit actions. (DONE)
6. Swap PATCH route to service usage (flagged fallback). (DONE - flag not required, direct swap)
7. Implement NotificationService abstraction + migrate push-sender internals. (DONE - basic wrapper, i18n migration pending)
8. Add metrics counters + histogram wrappers. (DONE - extended with push + error counters, needs route coverage expansion)
9. Create i18n catalogs for notifications (AR/FR) + replace switch-case.
10. Add missing key dev warnings & tests.
11. Implement rate limiting middleware (dry-run logging mode first).
12. Secure Cloudinary uploads (signature endpoint + doc update).
13. Config schema validation on startup.
14. Add caching adapter & cache GET /orders/:id.
15. Concurrency improvement: guard duplicate status updates (idempotency key).
16. Introduce load test script (k6/autocannon) + baseline results doc.
17. Add integration tests with Firestore emulator for status flow.
18. Add performance metrics dashboard instructions in docs.
19. Remove legacy code paths & disable flag.
20. Architecture & service layer final documentation pass.

---
## 9. Dependencies & Sequencing Notes
- (3,4) precede (5,6).
- (7) can run parallel after (5) interface defined.
- (9) depends on (7) for central text lookup path or can be done earlier if isolated.
- (11) independent—can slot after (6).
- (14) after (5) to cache service outputs.

---
## 10. Success Metrics & Verification Plan
| Metric | Tool | Threshold | Verification Cadence |
|--------|------|-----------|----------------------|
| Route latency p95 | Metrics histo | -30% vs baseline | Weekly report |
| Push failure rate | Counter | < 5% non-invalid | After each deploy |
| Test coverage services | Coverage report | ≥ 85% lines | CI gate |
| i18n key coverage | Build script | 100% | Each build |
| Rate limit triggers | Log dashboard | < 1% requests | Weekly |

---
## 11. Out of Scope (For Now)
- Full CQRS/Event sourcing.
- Message queue (Kafka/PubSub) integration (future if scale demands).
- Real-time WebSocket gateway migration (beyond current SSE usage).

---
## 12. Open Questions
- Do we need multi-tenant isolation beyond account_id (Firestore collections per tenant)?
- Required retention period for archived orders? (affects archival storage design).
- Target traffic profile for load test (orders/hour)?
- Cloudinary file size constraints & accepted MIME types list.

---
## 13. Approval Checklist
- [ ] Product sign-off on phased delivery
- [ ] Security review of rate limiter & upload signing
- [ ] DevOps approval for metrics stack
- [ ] Localization keys validated by content team

---
## 14. Next Immediate Action (Upon Approval)
Start Phase P0: tasks (1), (2), (3) + baseline performance snapshot.
# Detailed Modernization & Refactor Plan

Mixed Language (Arabic + English) for clarity with local team.

---
## 1. إعادة هيكلة الخدمات / Service Layer Refactor
**Goal:** فصل منطق الأعمال عن طبقة HTTP (Next.js Route Handlers) لتسهيل الاختبار، المراقبة، وإعادة الاستخدام.

### 1.1 Target Architecture
- `services/orders-service.ts`: CRUD + status transitions + archival orchestration.
- `services/notification-service.ts`: Push abstraction (roles, batching, localization keys).
- `services/i18n-service.ts`: Key lookup + fallback + formatting helpers.
- `repositories/*`: Firestore data access (ordersRepo, orderItemsRepo, tokensRepo, accountsRepo, archiveRepo).
- `adapters/push-adapter.ts`: Wrap Firebase Admin messaging.
- `adapters/cache-adapter.ts`: Pluggable (in-memory -> Redis future).

### 1.2 Refactor Strategy (Incremental)
1. Extract pure transition validation & role-gate to service (no Firestore write) + test.
2. Introduce repository functions used by route handlers (thin wrapper).
3. Move side-effects (mirror, push, archive) behind a `OrdersService.updateStatus()` method.
4. Replace inline async IIFEs with an explicit `PostCommitActions` queue executed after transaction result.
5. Add domain events enum (e.g., `ORDER_STATUS_CHANGED`, `ORDER_ARCHIVED`).
6. (Optional later) Add event dispatcher for decoupling (facilitates future queue/message broker).

### 1.3 Acceptance Criteria
- Route handler ≤ 40 lines, only: parse -> authorize -> call service -> map result.
- No direct Firebase admin usage outside repositories & adapters.
- 95% of order logic covered by unit tests.

### 1.4 Risks & Mitigations
- Risk: Large PR churn. Mitigation: Strangler pattern; create new files, cut over one endpoint at a time.
- Risk: Hidden coupling (mirror/push). Mitigation: Introduce adapter interfaces first, keep concrete behind them.

---
## 2. المراقبة / Observability (Logs + Metrics + Tracing)
**Goal:** تحسين القدرة على تتبع الأخطاء والأداء.

### 2.1 Logging
- Introduce `lib/observability/logger.ts` with structured API: `log.info({ msg, ...fields })`.
- Standard fields: `requestId`, `userId`, `role`, `accountId`, `orderId`, `span`, `durationMs`.
- Map console.* temporarily to logger to maintain backward compatibility.

### 2.2 Metrics
- Minimal provider abstraction (prom-client if serverful, or OpenTelemetry metrics API).
- Counters: `orders_status_transition_total{from,to}`, `push_sent_total{kind,role,lang}`, `orders_api_errors_total{route,code}`.
- Histograms: `orders_status_transition_latency_ms`, `route_latency_ms{route}`.

### 2.3 Tracing
- Add OpenTelemetry SDK init (optional Phase P2). Wrap Firestore calls in spans if feasible.

### 2.4 Error Taxonomy
- Define error classes: `AuthError`, `ValidationError`, `NotFoundError`, `ConflictError`, `RateLimitError`.
- Map to consistent JSON `{ success:false, error:{ code, message } }`.

### 2.5 Acceptance
- 90% of service functions emit at least one structured log line.
- Metrics endpoint (if enabled) exposes counters with activity after test run.

---
## 3. الاختبارات / Testing Strategy
**Goal:** ضمان صحة المنطق وتقليل الارتداد (regression).

### 3.1 Test Types
- Unit: pure functions (transition validator, localization lookup, token grouping).
- Service: orders service with repo mocks.
- Integration: In-memory Firestore emulator (scripts) for critical flows.
- Load: k6 or autocannon script for PATCH /orders/:id status transitions.
- Smoke: Minimal route invocation after build in CI.

### 3.2 Tooling
- Framework: Vitest (fast + TS) or Jest; decide based on team preference.
- Mocking: Native + test doubles for adapters.
- Firestore Emulator: Launch in CI (GitHub Action service step) for integration tests.

### 3.3 Coverage Targets
| Layer | Target |
|-------|--------|
| Pure utils | 100% lines |
| Services | 85% lines / 95% branches for transitions |
| Routes (integration) | Critical paths only |

### 3.4 CI Gates
- Fail build if global < 80% line coverage.
- Lint + type-check + unit + integration in parallel stages.

### 3.5 Test Data Strategy
- Factories (e.g., `makeOrder({ status:'pending' })`).
- Deterministic IDs for reproducibility.
- Use seed scripts for manual QA only; tests isolated.

---
## 4. دعم اللغات / Internationalization (i18n)
**Goal:** فصل النصوص عن المنطق + تسهيل إضافة لغات.

### 4.1 Catalog Structure
- `i18n/notifications.{lang}.json` (keys: `order.new.title`, `order.new.body`, ...)
- `i18n/common.{lang}.json` for shared UI.

### 4.2 Lookup Flow
1. Determine lang preference (token DB record, header, fallback 'fr').
2. Load compiled catalog (import JSON -> map) — prefer build-time bundling.
3. Format with interpolation: e.g., `t('order.ready.title', { num, table })`.

### 4.3 Migration Steps
- Inventory existing switch-case strings (push-sender now).
- Replace with key lookups; fallback to default language if missing.
- Add tests verifying AR/FR value correctness.

### 4.4 Future-Proofing
- Add missing key detection in dev (warn if key absent).

### 4.5 Acceptance
- Zero hard-coded AR/FR strings in code (excluding tests & fallbacks).

---
## 5. الأمان / Security Hardening
**Goal:** تقليل مخاطر الإساءة ورفع جودة التحكم بالوصول.

### 5.1 Rate Limiting
- Middleware applying token + IP bucket (e.g., sliding window). Store counters (in-memory first, Redis later).
- Policies: e.g., 30 writes / 60s / account for order status transitions.

### 5.2 Secure File Upload
- Switch to signed Cloudinary uploads: server returns signature & timestamp; client uploads directly.
- Validate MIME & size (enforce via Cloudinary upload preset + client pre-check).

### 5.3 Auth & Permissions Audit
- Enumerate resources/actions; document matrix.
- Add tests for forbidden transitions per role.

### 5.4 Input Validation Uniformity
- All route inputs pass through Zod schemas; remove manual ad-hoc checks.

### 5.5 Secrets & Config
- Introduce config validation at startup; fail fast if missing (`CLOUDINARY_API_KEY`, etc.).

### 5.6 Acceptance
- Rate limit responses return 429 with structured error.
- All uploads require server-provided signature (no unsigned preset exposure).

---
## 6. الأداء / Performance Optimization
**Goal:** تقليل زمن الاستجابة وتكاليف Firestore.

### 6.1 Caching Strategy
- In-memory LRU for hot GET order lookups (TTL 5–10s) keyed by `accountId:orderId`.
- Potential CDN caching for public menu endpoints (cache-control headers).

### 6.2 Query Optimization
- Batch fetch of related documents where possible (e.g., order + items with a single aggregated structure in mirror or precomputed subcollection if needed).
- Evaluate composite indexes needed; document them.

### 6.3 Write Path Improvements
- Collapse sequential status updates (debounce waiter double taps) via optimistic guard / idempotency key.

### 6.4 Push Pipeline Performance
- Group send operations concurrently per language-role group (Promise.all with concurrency cap).
- Track push sending latency metric.

### 6.5 Profiling & Benchmarks
- Baseline: capture p50/p95 for GET /orders/:id, PATCH status under moderate load.
- Post-optimization comparison.

### 6.6 Acceptance
- Demonstrated ≥30% reduction in p95 for status PATCH after caching + refactor.

---
## 7. الحوكمة و إدارة التنفيذ / Delivery Governance
**Goal:** تنفيذ آمن تدريجي بدون تجميد التطوير.

### 7.1 Branching & Releases
- Feature branches per epic segment (e.g., `feat/service-orders-basic`).
- Weekly integration branch -> main after CI & review.

### 7.2 Progressive Rollout
- Feature flag for new service layer initially (env var toggle to fall back to legacy code for critical endpoints if needed for one release).

### 7.3 Documentation
- Update `README` with: architecture diagram, local dev steps, test commands, observability instructions.
- Add `docs/ARCHITECTURE.md` (later).

### 7.4 Risk Register (Sample)
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Latent bug in refactored status updates | Medium | High | Dual-path flag + integration tests |
| Rate limiting false positives | Low | Medium | Dry-run mode logs only first |
| Catalog key drift | Medium | Low | Build-time key presence check |

### 7.5 Exit Criteria For Modernization Initiative
- All legacy inline logic removed from route handlers (except thin wiring).
- Observability dashboard adopted by team.
- SLA on order status update (< 300ms p95) met.

---
## 8. Task Breakdown (Initial Backlog Extract)
Numbering for issue creation.

1. Create logging wrapper & integrate in one route. (DONE)
2. Define error classes + map in handler middleware. (DONE)
3. Extract transition validator & role guard to service method + tests. (DONE)
4. Introduce repositories (orders, accounts, tokens) + adapt GET /orders/:id. (PARTIAL - tokens repo TBD)
5. Implement OrdersService.updateStatus with post-commit actions. (DONE)
6. Swap PATCH route to service usage (flagged fallback). (DONE - flag not required, direct swap)
7. Implement NotificationService abstraction + migrate push-sender internals. (DONE - basic wrapper, i18n migration pending)
8. Add metrics counters + histogram wrappers. (DONE - extended with push + error counters, needs route coverage expansion)
9. Create i18n catalogs for notifications (AR/FR) + replace switch-case.
10. Add missing key dev warnings & tests.
11. Implement rate limiting middleware (dry-run logging mode first).
12. Secure Cloudinary uploads (signature endpoint + doc update).
13. Config schema validation on startup.
14. Add caching adapter & cache GET /orders/:id.
15. Concurrency improvement: guard duplicate status updates (idempotency key).
16. Introduce load test script (k6/autocannon) + baseline results doc.
17. Add integration tests with Firestore emulator for status flow.
18. Add performance metrics dashboard instructions in docs.
19. Remove legacy code paths & disable flag.
20. Architecture & service layer final documentation pass.

---
## 9. Dependencies & Sequencing Notes
- (3,4) precede (5,6).
- (7) can run parallel after (5) interface defined.
- (9) depends on (7) for central text lookup path or can be done earlier if isolated.
- (11) independent—can slot after (6).
- (14) after (5) to cache service outputs.

---
## 10. Success Metrics & Verification Plan
| Metric | Tool | Threshold | Verification Cadence |
|--------|------|-----------|----------------------|
| Route latency p95 | Metrics histo | -30% vs baseline | Weekly report |
| Push failure rate | Counter | < 5% non-invalid | After each deploy |
| Test coverage services | Coverage report | ≥ 85% lines | CI gate |
| i18n key coverage | Build script | 100% | Each build |
| Rate limit triggers | Log dashboard | < 1% requests | Weekly |

---
## 11. Out of Scope (For Now)
- Full CQRS/Event sourcing.
- Message queue (Kafka/PubSub) integration (future if scale demands).
- Real-time WebSocket gateway migration (beyond current SSE usage).

---
## 12. Open Questions
- Do we need multi-tenant isolation beyond account_id (Firestore collections per tenant)?
- Required retention period for archived orders? (affects archival storage design).
- Target traffic profile for load test (orders/hour)?
- Cloudinary file size constraints & accepted MIME types list.

---
## 13. Approval Checklist
- [ ] Product sign-off on phased delivery
- [ ] Security review of rate limiter & upload signing
- [ ] DevOps approval for metrics stack
- [ ] Localization keys validated by content team

---
## 14. Next Immediate Action (Upon Approval)
Start Phase P0: tasks (1), (2), (3) + baseline performance snapshot.

