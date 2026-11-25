# ABDAO-13 identity fallback operational handover

Fictional Alderbank demonstration. This file is a repository seed for coordination task [ABDAO-13](https://one-atlas-mesa.atlassian.net/browse/ABDAO-13). It is not a published Confluence page, a compliance attestation, or a release approval.

| Field | Record |
| --- | --- |
| Disposition | **NOT REVIEWED** |
| Review date | None recorded |
| Reviewer / authority | **NOT CONFIRMED** |
| Preparation date | 25 November 2026 |
| Pilot [ABDAO-7](https://one-atlas-mesa.atlassian.net/browse/ABDAO-7) | **NOT READY** |
| Release gate | This coordination task and its Blocks link do not enforce a release gate |
| Scenario due date | 27 November 2026, illustrative only, not a commitment |

The preparation date records when this evidence inventory was written. It is not a review timestamp.

## Evidence scope and version

| Field | Record |
| --- | --- |
| Repository | [org-beaconstone/meridian-web](https://github.com/org-beaconstone/meridian-web) |
| Inspected revision | `da868e76fb6b2106a6a854bc05dc4efa6431a024` (`main` at inspection) |
| Package version | `0.1.0` (`package.json`) |
| Product in that revision | Meridian Money, a fictional customer payments demo (Adyen card simulation and Worldpay bank-payment simulation) |
| Requested scope | Operational readiness of the Alderbank digital-account-opening identity fallback (parent ABDAO-1, identity slice) |
| Identity-fallback implementation in the inspected revision | Absent |
| Sibling checkouts | `meridian-api` and `meridian-mobile` were not checked out and were not modified. This record does not speak for them |

The inspected tree is a payments rehearsal. It has no account-opening journey, no identity-verification step, and no identity-fallback integration. ABDAO-13 describes the existing handover as a design outline only, and states that fallback results, a reviewed retry policy, and accepted operational evidence are missing. This inventory matches that description for the revision above. It does not fill those gaps.

## Controls required by DBRAS-04

ABDAO-13 names these operational-readiness controls. The assurance standard page was not readable during this preparation (see Sources), so the list below is the list on the work item.

| Control | Evidence in the inspected revision | Status |
| --- | --- | --- |
| Safe pause and resume | No identity-fallback pause/resume procedure, control, or test | Missing |
| No activation or funding before identity is verified | No account activation, funding gate, or identity-verification flow | Missing |
| Rollback and escalation | No identity-fallback rollback or escalation procedure | Missing |
| Support ownership | ABDAO-13 names Platform Engineering as the narrative accountable team. No confirmed support roster is in this revision | Unconfirmed |
| Reviewed retry policy | No identity-fallback retry policy. Payment retry behavior listed under Out of scope was not accepted as this policy | Missing |
| Minimal diagnostic identifiers | No identity-fallback diagnostic identifier scheme | Missing |
| Source links to test outputs | No identity-fallback or identity-integration test output | Missing |
| Source links to a security review | No security-review record for the identity fallback. ABDAO-11 remains unreviewed on the work item | Missing |
| Explicit reviewer disposition, date, and outstanding actions | Disposition and date are recorded in the header. Outstanding actions are listed below | Open |

No operational steps, retry limits, escalation contacts, or diagnostic identifier formats are specified here. Those values are not in the inspected revision, and inventing them would present a design outline as accepted operating evidence.

## Reviewer record

- Named real reviewer / authority: **NOT CONFIRMED**.
- ABDAO-13 states that the Jira assignee was intentionally left unassigned for this reason. Assignment of the coordination task does not confirm an operational reviewer.
- Avery, Samira, and Taylor are narrative roles on the work item (delivery coordination, staff guidance, and security review). They are not accounts, and this record does not treat them as review decisions.
- Disposition: **NOT REVIEWED**.
- Actual review date: none.
- No approval is recorded.

## Open issues retained

Live Jira was not re-queried. These states are the states given on ABDAO-13:

- [ABDAO-6](https://one-atlas-mesa.atlassian.net/browse/ABDAO-6) remains pending.
- [ABDAO-11](https://one-atlas-mesa.atlassian.net/browse/ABDAO-11) remains unreviewed.
- [ABDAO-7](https://one-atlas-mesa.atlassian.net/browse/ABDAO-7) remains **NOT READY**.
- Fallback and integration results are missing.
- A reviewed identity-fallback retry policy is missing.
- Accepted operational evidence is missing.
- A real accountable reviewer is not confirmed.

## Outstanding actions

A release decision for the identity fallback can be requested only after a confirmed reviewer assesses a complete handover. Still open:

1. Confirm a real accountable reviewer / authority.
2. Prepare the identity-fallback runbook against the DBRAS-04 controls, with links to actual fallback and integration test outputs and to the security review.
3. Have that reviewer record a disposition, the actual review date, and any actions still open.
4. Leave ABDAO-6, ABDAO-11, and ABDAO-7 on their current states until their own evidence exists.

## Out of scope: payments rehearsal

These paths describe the Meridian payments simulation. They are linked so they are not later cited as identity-fallback evidence.

- [Verification record](verification.md) for the payments build and browser suite. Its dates and deployment id belong to that payments rehearsal.
- [Demo runbook](demo-runbook.md) decline and unavailable payment scenarios.
- [Connected mode](../INTEGRATION.md): server state is authoritative; an API failure does not become a local payment success; an unknown network outcome keeps the same payment key.
- [API standards](api-standards.md): no operational circuit breaker or live automatic provider fallback is claimed.
- [Compliance policy](compliance-policy.md): no production authentication, SCA, or KYC/AML enforcement.
- Payment idempotency and scenario handling in `src/domain/model.ts`, `src/hooks/useBank.ts`, and `tests/e2e/banking.spec.ts`.

## Sources and access limits

- Work item: https://one-atlas-mesa.atlassian.net/browse/ABDAO-13
- Parent: ABDAO-1, Digital Account Opening - identity slice
- Assurance standard: https://one-atlas-mesa.atlassian.net/wiki/spaces/ABDAO/pages/3047464
- On 25 November 2026 the Confluence content API for page 3047464 returned HTTP 403, and the Jira issue API for ABDAO-13 returned HTTP 404 (`Issue does not exist or you do not have permission to see it.`). The control list and linked-issue states above come from the work item text supplied for this preparation, not from a fresh read of those pages.
