# Meridian Money rehearsal

Fictional banking demo, no login or real money. Alex Morgan, GBP, fixed date 18 September 2026.

## Before rehearsal

```sh
npm ci
npm run check
TEST_PRODUCTION=1 npm run test:e2e
npm run dev
```

Open http://127.0.0.1:5175. Use **Demo controls > Reset demo data > Reset everything** for the original state. Fonts are bundled locally; no external data is needed.

## Three-minute baseline

1. **Overview (40 seconds).** Show the £12,480.50 available balance, September plan, saved recipients and recent activity. This is the existing customer experience, not a provider admin console.
2. **Make a payment (80 seconds).** Click Make a payment. Choose Northline Studio, enter `25.99`, add an optional reference. Select Debit card, labelled Adyen. Click Review payment, inspect amount, provider, fee and remaining balance, then Confirm £25.99 payment. The receipt is explicitly a demo receipt.
3. **Close the loop (30 seconds).** Return to Overview. Balance is £12,454.51. Open Activity, search your reference, and open the transaction receipt. Refresh to demonstrate local persistence.
4. **Budgets (30 seconds).** Open Budgets, edit Shopping, save a new monthly limit. The spending plan recalculates. No real account settings change.

## Alternate paths

- Bank payment routes to the simulated Worldpay adapter. These assignments are demo-specific, not provider-capability claims.
- Demo controls can choose Provider declines payment or Provider unavailable. Review and confirm a payment: an error appears, with no debit. Switch back to Successful payment and retry.
- Try `0` or `1.999` for amount validation. Values above £10,000 are rejected.
- A reset has a second confirmation; cancellation preserves changes.
- Escape closes receipts and returns focus to the trigger.

## Planner handoff

There are exactly two providers. A new European payment experience is intentionally absent, including hidden code or a pre-selected vendor. Frame the next task around evaluating local payment coverage, choosing a suitable provider against [the playbook](provider-expansion-playbook.md), and changing this payment screen.

Use [company strategy](company-strategy.md), [compliance policy](compliance-policy.md), [API standards](api-standards.md) and [workspace map](workspace-map.md) as fictional planning context. They are repository documents, not published Confluence pages or existing Jira work items.

## Limits

This browser demo does not implement an API, authentication, SCA or actual provider SDKs. The fee is a simulated £0.00, not a quotation. Reload preserves this browser's state; tabs are not live-synchronized. Clear only the `meridian_bank_state` localStorage key if manual recovery is necessary, rather than clearing unrelated browser data.
