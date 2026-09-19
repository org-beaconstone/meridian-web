# API standards and implemented boundary

[Existing Confluence API standards](https://beacon-stone.atlassian.net/wiki/spaces/SPT/pages/147947597) govern the fictional target architecture. Provider secrets belong only in the backend; payment intents must be persisted before provider calls; retries retain idempotency; webhooks need signatures and replay handling. Never reroute an uncertain payment without confirmed absence of capture.

## Working rehearsal

The [Java backend](https://github.com/org-beaconstone/meridian-api) owns the H2 ledger. Web/mobile use one [contract](https://github.com/org-beaconstone/meridian-api/blob/main/docs/contract.md) with integer pence and a shared room header. The server creates and persists an intent before invoking Adyen/Worldpay simulation adapters. Known outcomes update the ledger atomically; pending attempts reserve capacity and settle only through signed synthetic callbacks. Same-key altered payloads conflict. No client fabricates success after an API error.

The signature protocol is Meridian-specific simulation, not vendor SDK integration. No operational circuit breaker, live automatic provider fallback, production auth or SCA is claimed. The source standards remain the production target, not a checklist falsely marked complete.

[Connected startup](../INTEGRATION.md) · [Workspace](workspace-map.md) · [Policy](compliance-policy.md)
