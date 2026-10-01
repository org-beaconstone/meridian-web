# PAY-159 European payment plans

Synthetic Confluence-ready seed for the fictional Meridian rehearsal. This page is not a provider scorecard, a commercial selection, or evidence that a European corridor is cleared.

Work item: [PAY-159](https://beacon-stone.atlassian.net/browse/PAY-159). Status when this seed was written: In Dev. The Jira description was empty. Scope below comes from the company strategy and the provider expansion playbook already linked in this repository.

## What the epic is asking for

Meridian’s FY26 European corridors are open in the story and blocked on coverage. Adyen and Worldpay are cleared for the UK and US only. No provider is contracted for Europe (PAY-1187). Compliance review for that selection remains blocked (PAY-1204). Hard no-go gates cannot be traded for a commercial score, and a candidate under 80 does not proceed to sandbox.

Growth Engineering’s web surface can start without pretending that selection has happened. PAY-159’s first slice is a customer-visible plan catalogue and draft capture on the payment screen.

## What this repository does

`src/domain/european-plans.ts` holds five scheme plans:

| Scheme               | Market      | Currency  | Status |
| -------------------- | ----------- | --------- | ------ |
| SEPA Credit Transfer | Euro area   | EUR cents | Draft  |
| SEPA Instant         | Euro area   | EUR cents | Draft  |
| iDEAL                | Netherlands | EUR cents | Draft  |
| Bancontact           | Belgium     | EUR cents | Draft  |
| Cartes Bancaires     | France      | EUR cents | Draft  |

- Amounts are integer euro cents, with the same bounds as sterling: more than zero, at most two decimal places, and at most €10,000.
- The payee field accepts a name. An IBAN-shaped value or a long digit string is rejected. The screen does not collect a PAN, CVV or account number.
- Drafts persist in this browser under `meridian_european_plans`. They are not part of the bank ledger schema and are not sent to the rehearsal API.
- `settleEuropeanPlan` always returns the same ledger. A draft cannot debit the GBP balance.
- The live registry remains Adyen for card and Worldpay for bank. Scheme rows do not name a processor.

Reset demo data clears these drafts together with payments and budgets.

## What this repository does not do

- It does not score a vendor. Regulatory standing, market coverage, technical fit, commercials, reliability and support stay unevaluated here.
- It does not add a third provider, a feature flag that hides one, or sandbox credentials.
- It does not change `meridian-api` or `meridian-mobile`. Those repos keep the two-provider baseline until selection and the mobile configuration work land.
- It does not claim PSD2, SCA, PCI or residency clearance. Those gates still block live European traffic.

Provider selection remains the critical path in the [playbook](provider-expansion-playbook.md). A later change can attach a contracted provider to these schemes only after that playbook’s sandbox gate, and only in the API provider interface.
