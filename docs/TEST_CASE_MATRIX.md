# Test Case Matrix (Initial Draft)

Focus: Orders lifecycle, Notification emission, Permissions, i18n, Security (rate limit), Caching correctness.

## Legend
P = Priority (H/M/L)  |  Type = (U=Unit, S=Service, I=Integration, L=Load)

## 1. Order Status Transitions
| ID | Scenario | Expected | Type | P |
|----|----------|----------|------|---|
| T-ORD-001 | pending -> approved | Success, push new+approved logic considered | S | H |
| T-ORD-002 | approved -> ready | Success, push ready | S | H |
| T-ORD-003 | ready -> served | Success, archive scheduled | S | H |
| T-ORD-004 | pending -> ready (skip) | Validation error INVALID_TRANSITION | U/S | H |
| T-ORD-005 | served -> approved | INVALID_TRANSITION | U/S | M |
| T-ORD-006 | waiter attempts approved->ready | FORBIDDEN_TRANSITION | I | H |
| T-ORD-007 | kitchen attempts ready->served | FORBIDDEN_TRANSITION | I | H |
| T-ORD-008 | double PATCH same status quickly | Second is idempotent/no duplicate push | S/I | M |
| T-ORD-009 | status update when account inactive | SYSTEM_INACTIVE error 423 | I | H |

## 2. Permissions
| ID | Scenario | Expected | Type | P |
|----|----------|----------|------|---|
| T-PERM-001 | Missing token | 401 Unauthenticated | I | H |
| T-PERM-002 | Role lacks permission | 403 Forbidden | I | H |
| T-PERM-003 | Admin full transition path | All succeed | I | M |

## 3. Notifications
| ID | Scenario | Expected | Type | P |
|----|----------|----------|------|---|
| T-NOT-001 | approved -> ready triggers sendReady once | Single batch recorded | S | H |
| T-NOT-002 | ready -> served triggers served + archive | Push served + archive event queued | S/I | H |
| T-NOT-003 | cancelled triggers cancelled push | Cancelled batch | S | M |
| T-NOT-004 | invalid tokens removed | token active=false set | I | M |
| T-NOT-005 | client tokens receive anonymized title | No raw order number for client role | S | M |

## 4. i18n
| ID | Scenario | Expected | Type | P |
|----|----------|----------|------|---|
| T-I18N-001 | AR locale push | Arabic strings retrieved | U/S | M |
| T-I18N-002 | FR locale push | French strings retrieved | U/S | M |
| T-I18N-003 | Missing key fallback | Uses default language + warns | U | L |

## 5. Security
| ID | Scenario | Expected | Type | P |
|----|----------|----------|------|---|
| T-SEC-001 | Rate limit exceeded | 429 error with code RATE_LIMITED | I | H |
| T-SEC-002 | Unsigned upload attempt | Rejected | I | H |
| T-SEC-003 | Signed upload success | URL returned | I | M |
| T-SEC-004 | Invalid MIME upload | Validation error | I | M |

## 6. Caching
| ID | Scenario | Expected | Type | P |
|----|----------|----------|------|---|
| T-CACHE-001 | First GET order cache miss | Repo hit metric increments | I | M |
| T-CACHE-002 | Second GET within TTL | Cache hit metric increments, no DB call | I | M |
| T-CACHE-003 | Order updated invalidates cache | Next GET sees new status | I | H |

## 7. Performance / Load
| ID | Scenario | Expected | Type | P |
|----|----------|----------|------|---|
| T-LOAD-001 | 50 concurrent PATCH/sec for 60s | Error rate < 1%, p95 < target | L | H |
| T-LOAD-002 | Burst 5 rapid transitions same order | No inconsistent state | L | M |

## 8. Error Handling
| ID | Scenario | Expected | Type | P |
|----|----------|----------|------|---|
| T-ERR-001 | Unknown server error | 500 with structured payload | I | H |
| T-ERR-002 | Validation error schema | 400 with code VALIDATION_ERROR | I | H |

## Coverage Tracking
- Update table with Status column once implemented.

## Notes
- Add derived tests for additional statuses if lifecycle expands.
- Load scenarios may be scaled up after baseline passes.
# Test Case Matrix (Initial Draft)

Focus: Orders lifecycle, Notification emission, Permissions, i18n, Security (rate limit), Caching correctness.

## Legend
P = Priority (H/M/L)  |  Type = (U=Unit, S=Service, I=Integration, L=Load)

## 1. Order Status Transitions
| ID | Scenario | Expected | Type | P |
|----|----------|----------|------|---|
| T-ORD-001 | pending -> approved | Success, push new+approved logic considered | S | H |
| T-ORD-002 | approved -> ready | Success, push ready | S | H |
| T-ORD-003 | ready -> served | Success, archive scheduled | S | H |
| T-ORD-004 | pending -> ready (skip) | Validation error INVALID_TRANSITION | U/S | H |
| T-ORD-005 | served -> approved | INVALID_TRANSITION | U/S | M |
| T-ORD-006 | waiter attempts approved->ready | FORBIDDEN_TRANSITION | I | H |
| T-ORD-007 | kitchen attempts ready->served | FORBIDDEN_TRANSITION | I | H |
| T-ORD-008 | double PATCH same status quickly | Second is idempotent/no duplicate push | S/I | M |
| T-ORD-009 | status update when account inactive | SYSTEM_INACTIVE error 423 | I | H |

## 2. Permissions
| ID | Scenario | Expected | Type | P |
|----|----------|----------|------|---|
| T-PERM-001 | Missing token | 401 Unauthenticated | I | H |
| T-PERM-002 | Role lacks permission | 403 Forbidden | I | H |
| T-PERM-003 | Admin full transition path | All succeed | I | M |

## 3. Notifications
| ID | Scenario | Expected | Type | P |
|----|----------|----------|------|---|
| T-NOT-001 | approved -> ready triggers sendReady once | Single batch recorded | S | H |
| T-NOT-002 | ready -> served triggers served + archive | Push served + archive event queued | S/I | H |
| T-NOT-003 | cancelled triggers cancelled push | Cancelled batch | S | M |
| T-NOT-004 | invalid tokens removed | token active=false set | I | M |
| T-NOT-005 | client tokens receive anonymized title | No raw order number for client role | S | M |

## 4. i18n
| ID | Scenario | Expected | Type | P |
|----|----------|----------|------|---|
| T-I18N-001 | AR locale push | Arabic strings retrieved | U/S | M |
| T-I18N-002 | FR locale push | French strings retrieved | U/S | M |
| T-I18N-003 | Missing key fallback | Uses default language + warns | U | L |

## 5. Security
| ID | Scenario | Expected | Type | P |
|----|----------|----------|------|---|
| T-SEC-001 | Rate limit exceeded | 429 error with code RATE_LIMITED | I | H |
| T-SEC-002 | Unsigned upload attempt | Rejected | I | H |
| T-SEC-003 | Signed upload success | URL returned | I | M |
| T-SEC-004 | Invalid MIME upload | Validation error | I | M |

## 6. Caching
| ID | Scenario | Expected | Type | P |
|----|----------|----------|------|---|
| T-CACHE-001 | First GET order cache miss | Repo hit metric increments | I | M |
| T-CACHE-002 | Second GET within TTL | Cache hit metric increments, no DB call | I | M |
| T-CACHE-003 | Order updated invalidates cache | Next GET sees new status | I | H |

## 7. Performance / Load
| ID | Scenario | Expected | Type | P |
|----|----------|----------|------|---|
| T-LOAD-001 | 50 concurrent PATCH/sec for 60s | Error rate < 1%, p95 < target | L | H |
| T-LOAD-002 | Burst 5 rapid transitions same order | No inconsistent state | L | M |

## 8. Error Handling
| ID | Scenario | Expected | Type | P |
|----|----------|----------|------|---|
| T-ERR-001 | Unknown server error | 500 with structured payload | I | H |
| T-ERR-002 | Validation error schema | 400 with code VALIDATION_ERROR | I | H |

## Coverage Tracking
- Update table with Status column once implemented.

## Notes
- Add derived tests for additional statuses if lifecycle expands.
- Load scenarios may be scaled up after baseline passes.
