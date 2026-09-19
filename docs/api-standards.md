# Payment API integration standards

**Fictional proposal**, owned by Payments Platform with Trust & Safety review. Updated 18 September 2026. `meridian-api` is a contextual Java/Spring Boot repository, not created in this demo. None of these backend controls are implemented by the local web simulation.

## Proposed provider abstraction

The orchestrator owns a `PaymentProvider` port with authorize, capture, refund and status-query operations. Adyen and Worldpay adapters translate that contract to their own SDKs. Provider-specific credentials, error codes and webhook formats stay behind adapters. Monetary amounts are integer minor units plus an explicit currency, not floating-point values.

Routing uses supported method, currency, market, residency constraints and operational health. Never assume providers are interchangeable. The web demo maps card to Adyen and bank payment to Worldpay only as a fictional rehearsal convention.

## Authentication and authorization

- Customer access uses an authenticated server-managed session with secure, HttpOnly cookies and CSRF protection, or a reviewed OAuth/OIDC flow where appropriate.
- Authorize the customer, account, payee and amount server-side for every attempt. Browser state is untrusted.
- Service-to-service calls use short-lived workload credentials and scoped authorization. Provider secrets live in the server's approved secret store, never browser bundles or repo files.
- Trust & Safety defines SCA and fraud decisions against [the compliance policy](compliance-policy.md). Do not treat a client-side checkbox as authentication.

## Idempotency and unknown outcomes

Create an idempotency key per logical payment. Bind it to the customer and a canonical payload hash. Persist the payment attempt durably before transmission. Reusing a key with a different amount, currency, payee or method must be rejected. A key alone does not guarantee exactly-once behavior across distributed systems.

**A timeout is not a decline.** If a payment may have reached a provider, record an unknown/pending outcome and query that provider's status. Do not send a new authorization to another provider while the first may have succeeded. Reconciliation or a verified no-authorization result must precede any new attempt.

Retry read/status operations with bounded exponential backoff and jitter. Retrying payment writes requires verified provider idempotency semantics and the same key. Respect rate limits and Retry-After. Do not retry hard declines automatically. Proposed timeouts and retry budgets must be agreed per provider rather than copied from generic defaults.

## Circuit breakers and routing

Maintain a breaker per provider operation/region. Health thresholds and cooldowns are configurable. An open circuit blocks new sends. Rerouting is permitted only before the request is sent, or after definitive confirmation that no authorization exists, and only if the alternate provider supports the method and compliance constraints. Ambiguous outcomes remain with their original provider for reconciliation.

## Webhooks

Verify the provider's documented signature over the exact raw body, validate replay windows, and rotate secrets. Do not invent a universal signature format. Persist events before acknowledging; deduplicate by provider/event ID. Events may arrive more than once or out of order: enforce allowed state transitions instead of assuming FIFO delivery. Redact financial credentials and sensitive customer fields from logs.

## Observability and release gates

Trace attempt ID, provider, safe correlation ID, state transitions and latency without storing PAN/CVV or secrets. Alert on unknown outcomes, duplicate attempts, reconciliation backlog and sustained failures. Retain a documented rollback and reconciliation owner. See [provider expansion](provider-expansion-playbook.md) for sandbox, pilot and full-rollout gates.

## What the web demo actually does

`src/domain/model.ts` validates integer-pence amounts, routes to two named simulations, and returns success/decline/unavailable. It checks duplicate IDs against the current in-memory transaction set. Browser localStorage is validated on load/save, not a durable server ledger. There are no real SDK calls, sessions, secrets, retries, webhooks or circuit breakers. An unavailable simulation deterministically means no debit; it is not a model for real uncertain network outcomes.
