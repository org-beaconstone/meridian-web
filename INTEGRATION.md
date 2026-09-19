# Connected Meridian mode

The original standalone app remains the default, including the existing Kaizen deployment. Build or start with `VITE_API_BASE_URL=/api/v1` to use the Java backend. In connected mode state comes only from the server; there is no local-success fallback if the API fails. The page displays connection status and the shared room.

Start all repos from the sibling `meridian-api` checkout:

```sh
node scripts/rehearsal.mjs
```

Or start just web after the API is running:

```sh
VITE_API_BASE_URL=/api/v1 MERIDIAN_API_TARGET=http://127.0.0.1:8080 npm run dev
```

Connected mode polls the authoritative ledger every two seconds. Payment, budget and reset responses invalidate in-flight polls so old reads cannot overwrite new state. A room change discards prior requests and payment UI context. Declined/unavailable outcomes come from the provider simulations; an unknown network outcome keeps the same payment key for retry. Do not initiate a new payment while an earlier outcome is unknown.

BankState shape stays compatible with the standalone demo. API payloads are schema-validated. In server mode the bank state is not persisted into standalone localStorage.

Run the cross-client test after starting all services:

```sh
npx playwright test --config playwright.connected.config.ts
```

Defaults: API8080, web5175, mobile5176. Override `CONNECTED_API_URL`, `CONNECTED_WEB_URL` and `CONNECTED_MOBILE_URL` when needed.

[Backend](https://github.com/org-beaconstone/meridian-api) · [Mobile](https://github.com/org-beaconstone/meridian-mobile) · [Existing Confluence and Google context](https://github.com/org-beaconstone/meridian-api/blob/main/docs/context.md)
