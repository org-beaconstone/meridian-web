# Verification record

Verified locally on 18 September 2026 using Node 26.8.2 and Chromium. GitHub Actions is configured separately for Node 22; see its run for CI status.

## Passed

- `npm run check`: ESLint, TypeScript, Vite production build and **128 unit tests**.
- `npm run test:e2e`: **10 browser tests** against Vite development mode.
- `TEST_PRODUCTION=1 npm run test:e2e`: **10 browser tests** against the production bundle.
- Axe scans of Overview, Payments, Budgets and Activity at 1440px and 390px: no detected violations under WCAG 2 A/AA, 2.1 AA and 2.2 AA tags. This is an automated screen-level check, not a full conformance certification.
- Visual captures at 1440px desktop and 390px mobile: no runtime page errors; mobile document width equals viewport width.
- npm dependency audit at install: zero reported vulnerabilities.

## Covered flows

Card and bank-payment routing; review and confirmation; persisted debit exactly once; receipt and Escape focus return; decline/unavailable with no debit and safe retry; decimal validation; budget updates across reload; search/filter empty state; reset confirmation/cancellation; corrupt/denied storage recovery; mobile payment journey.

Unit regressions include unsafe amounts, real-calendar dates, changed payloads on reused IDs, known recipient/provider coherence, duplicate stored transaction IDs and malformed budget shapes.

## Screenshots

- [Desktop overview](images/overview-desktop.png)
- [Desktop payment screen](images/payment-desktop.png)
- [Mobile overview](images/overview-mobile.png)
- [Mobile payment screen](images/payment-mobile.png)

## Known limits

Provider outcomes are synchronous local simulations. No real API, auth, SCA or payment processing was tested. Browser storage is single-tab demo state, not a shared ledger. npm reports old React peer ranges in some transitive Atlaskit analytics packages; installed versions pass both tested modes. Vite warns that the main bundle exceeds 500 kB uncompressed; code splitting is a future production optimization, not a functional blocker. No deployment is configured.
