# Connected Meridian workspace

## Code repositories

- [meridian-web](https://github.com/org-beaconstone/meridian-web): existing ADS React/TypeScript banking experience. Standalone mode preserved; connected mode calls the Java API.
- [meridian-api](https://github.com/org-beaconstone/meridian-api): Java21/Spring Boot, H2 rehearsal ledger, provider port and Adyen/Worldpay simulations, signed synthetic webhooks, idempotency and audit events.
- [meridian-mobile](https://github.com/org-beaconstone/meridian-mobile): shared-contract Swift/Kotlin SDKs, native SwiftUI and Compose sources, plus explicitly labelled mobile browser companion.

All three exist as private repositories in org-beaconstone. No actual provider SDK, credentials or production financial data is included. See [connected mode](../INTEGRATION.md).

## Existing company context

The user supplied four Confluence pages and two Google working documents. They are not newly created by this implementation. [Canonical links and verified context](https://github.com/org-beaconstone/meridian-api/blob/main/docs/context.md).

Payments Platform owns provider engineering; Trust & Safety owns policy gates; Growth Engineering owns web conversion and checkout. PAY-1187, PAY-1204, MAPI-771, MWEB-318 and MMOB-402 appear in the source documents. Their live Jira status was not independently queried here.

The native two-provider configuration remains deliberately hardcoded. No future European provider is selected, named or implemented. The browser rehearsal's card/Adyen and bank/Worldpay mapping is a simple simulation, not the source story's complete production failover routing.
