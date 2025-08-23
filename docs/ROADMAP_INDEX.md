# Project Modernization Roadmap (Index)

هذا الملف هو الفهرس المركزي لخطة التحديث وإعادة الهيكلة. (Arabic + English)

## Scope Areas
1. إعادة هيكلة الخدمات / Service Layer Refactor
2. المراقبة (Logs + Metrics + Tracing)
3. الاختبارات الشاملة (وحدات، تكامل، تحميل) / Testing Strategy
4. دعم اللغات (i18n) / Internationalization
5. الأمان (Rate Limiting + رفع ملفات مؤمن + سياسات) / Security Hardening
6. الأداء (Caching + تقليل N+1 + تحسين Firestore Usage) / Performance Optimization
7. الحوكمة والتدفق التشغيلي / Delivery Governance & Phasing

## Phase Overview (High-Level)
| Phase | Focus | Key Deliverables | Success Criteria |
|-------|-------|------------------|------------------|
| P0 | Preparation & Baseline (DONE) | Logging wrapper, error classes, transition service, initial tests | CI green; base unit test passing |
| P1 | Service Extraction (IN PROGRESS) | OrdersService + NotificationService + repositories | Orders routes migrated; push abstraction added |
| P2 | Observability Deepening | Structured logs + metrics dashboards + error taxonomy | 90% routes instrumented |
| P3 | i18n Migration | Replace switch-case with catalog + locale negotiation | Push + UI use catalog |
| P4 | Security Enhancements | Rate limiter, signed uploads, permission audit | <1% rejected due to abuse |
| P5 | Performance & Caching | Response caching, query batching, hot-path profiling | 30–50% lower p95 latency |
| P6 | Load & Resilience | Load tests + failure injection + retry policies | Stable under target load |

## KPI / OKR Draft
- Reduce mean order status transition API latency p95 from TBD ms to (TBD -30%).
- Achieve 85% unit test coverage on service layer (orders + notifications).
- Zero unawaited side-effect warnings after refactor.
- <= 0.1% push delivery hard failures (excluding invalid tokens).
- Internationalization coverage: 100% of notification & user-facing strings externalized.

## File Map Added by Plan
- `docs/ROADMAP_INDEX.md` (this file)
- `docs/DETAILED_PLANS.md` (full deep-dive)
- `docs/TEST_CASE_MATRIX.md` (initial matrix & coverage targets)

## How to Use
- Treat each section in DETAILED_PLANS as an Epic.
- Convert numbered tasks into issue tracker tickets.
- Update TEST_CASE_MATRIX as coverage grows.

## Current Status
P0 complete. P1 near completion (OrdersService, NotificationService, repositories). Metrics endpoint & instrumentation (latency + error counters + push counters) started (early P2). Remaining: extend instrumentation to other routes, introduce i18n catalog (P3), security & caching phases next.

## Next Step
Finish P1 by validating push abstraction integration across creation flow (new order events) then proceed with P2: instrument remaining routes and add tracing/opentelemetry (optional).
# Project Modernization Roadmap (Index)

هذا الملف هو الفهرس المركزي لخطة التحديث وإعادة الهيكلة. (Arabic + English)

## Scope Areas
1. إعادة هيكلة الخدمات / Service Layer Refactor
2. المراقبة (Logs + Metrics + Tracing)
3. الاختبارات الشاملة (وحدات، تكامل، تحميل) / Testing Strategy
4. دعم اللغات (i18n) / Internationalization
5. الأمان (Rate Limiting + رفع ملفات مؤمن + سياسات) / Security Hardening
6. الأداء (Caching + تقليل N+1 + تحسين Firestore Usage) / Performance Optimization
7. الحوكمة والتدفق التشغيلي / Delivery Governance & Phasing

## Phase Overview (High-Level)
| Phase | Focus | Key Deliverables | Success Criteria |
|-------|-------|------------------|------------------|
| P0 | Preparation & Baseline (DONE) | Logging wrapper, error classes, transition service, initial tests | CI green; base unit test passing |
| P1 | Service Extraction (IN PROGRESS) | OrdersService + NotificationService + repositories | Orders routes migrated; push abstraction added |
| P2 | Observability Deepening | Structured logs + metrics dashboards + error taxonomy | 90% routes instrumented |
| P3 | i18n Migration | Replace switch-case with catalog + locale negotiation | Push + UI use catalog |
| P4 | Security Enhancements | Rate limiter, signed uploads, permission audit | <1% rejected due to abuse |
| P5 | Performance & Caching | Response caching, query batching, hot-path profiling | 30–50% lower p95 latency |
| P6 | Load & Resilience | Load tests + failure injection + retry policies | Stable under target load |

## KPI / OKR Draft
- Reduce mean order status transition API latency p95 from TBD ms to (TBD -30%).
- Achieve 85% unit test coverage on service layer (orders + notifications).
- Zero unawaited side-effect warnings after refactor.
- <= 0.1% push delivery hard failures (excluding invalid tokens).
- Internationalization coverage: 100% of notification & user-facing strings externalized.

## File Map Added by Plan
- `docs/ROADMAP_INDEX.md` (this file)
- `docs/DETAILED_PLANS.md` (full deep-dive)
- `docs/TEST_CASE_MATRIX.md` (initial matrix & coverage targets)

## How to Use
- Treat each section in DETAILED_PLANS as an Epic.
- Convert numbered tasks into issue tracker tickets.
- Update TEST_CASE_MATRIX as coverage grows.

## Current Status
P0 complete. P1 near completion (OrdersService, NotificationService, repositories). Metrics endpoint & instrumentation (latency + error counters + push counters) started (early P2). Remaining: extend instrumentation to other routes, introduce i18n catalog (P3), security & caching phases next.

## Next Step
Finish P1 by validating push abstraction integration across creation flow (new order events) then proceed with P2: instrument remaining routes and add tracing/opentelemetry (optional).*** End Patch
