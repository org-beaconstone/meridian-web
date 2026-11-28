# Verification record

Verified locally on 18 September 2026 using Node 26.8.2 and Chromium, and again on 28 November 2026 using Node 22.23.4. GitHub Actions is configured separately for Node 22; see its run for CI status.

## Passed

- `npm run check`: ESLint, TypeScript, Vite production build and **132 unit tests**.
- `npm run test:e2e`: **17 browser tests** against Vite development mode.
- `TEST_PRODUCTION=1 npm run test:e2e`: **17 browser tests** against the production bundle.
- Axe scans of Overview, Payments, Budgets and Activity, plus the account-details dialog, payment review and budget editor, at 1440px and 390px: no detected violations under WCAG 2 A/AA, 2.1 AA and 2.2 AA tags. This is an automated screen-level check, not a full conformance certification.
- Visual captures at 1440px desktop and 390px mobile: no runtime page errors; mobile document width equals viewport width.
- npm dependency audit at the 18 September install: zero reported vulnerabilities. The 28 November install reported vulnerabilities in existing transitive packages; this change does not add or upgrade dependencies.

## Covered flows

Card and bank-payment routing; review and confirmation; persisted debit exactly once; receipt and Escape focus return; decline/unavailable with no debit and safe retry; decimal validation; the £10,000 ceiling and a confirmed maximum payment; quick-recipient routing into the matching activity category; masked account details with focus return; rejected budget edits and an over-budget limit that survives reload; a second payment with an empty reference; budget updates across reload; search and category filters, including an empty intersection; reset confirmation/cancellation; corrupt/denied storage recovery; mobile payment journey.

Unit regressions include unsafe amounts, real-calendar dates, changed payloads on reused IDs, known recipient/provider coherence, duplicate stored transaction IDs and malformed budget shapes.

## Screenshots

- [Desktop overview](images/overview-desktop.png)
- [Desktop payment screen](images/payment-desktop.png)
- [Mobile overview](images/overview-mobile.png)
- [Mobile payment screen](images/payment-mobile.png)

## Hosted rehearsal verification

The 10-test browser suite also passed against https://meridian-money.kaizen.shared.atlassian-3p.com/ after deployment on 18 September 2026 (local time). That hosted run predates the seven journeys added on 28 November. This includes desktop/mobile automated accessibility scans and the payment lifecycle under the hosted CSP. The named host returns HTTP 200 and routes to deployment `kzd_cc9e1f0b1dce491eba873f1399c4c473`. Hosted verification found blocked inlined font subsets on the first deployment; emitting all assets as files resolved this without changing the CSP. Browser checks now also assert no console errors or failed requests.

The project retains its inherited enforced `corp-edge` restriction. These tests ran from an allowed environment; they do not establish public internet availability. See [deployment notes](deployment.md).

## Known limits

Provider outcomes are synchronous local simulations. No real API, auth, SCA or payment processing was tested. Browser storage is single-tab demo state, not a shared ledger. npm reports old React peer ranges in some transitive Atlaskit analytics packages; installed versions pass both tested modes. Vite warns that the main bundle exceeds 500 kB uncompressed; code splitting is a future production optimization, not a functional blocker. Manual Kaizen deployment is configured; GitHub CI is verification-only, not continuous deployment.
