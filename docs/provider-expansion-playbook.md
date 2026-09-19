# Payment provider expansion playbook

**Fictional planning seed.** Owner: Priya Shah, Payments Platform. Reviewers: Trust & Safety and Growth Engineering. Updated 18 September 2026. Current providers: Adyen and Worldpay only. No next vendor has been chosen.

## 1. Establish the customer need

Name the target European market, local payment methods, supported currencies and customer problem. Use the [FY26-28 strategy](company-strategy.md), not vendor popularity alone. Agree web and native acceptance criteria before writing an adapter.

## 2. Apply no-go criteria first

A strong commercial score cannot compensate for missing evidence. [Compliance policy](compliance-policy.md) requires current in-scope SOC 2 Type II evidence, applicable PCI evidence, an approved SCA approach and defensible residency/subprocessor arrangements. No unresolved critical security finding, unclear settlement liability or unresolvable ambiguous-payment risk can proceed to a real-data pilot.

## 3. Score eligible candidates

Proposed rubric: rate each criterion from 1 (insufficient) to 5 (strong), then compute `sum(weight × rating / 5)` for a score out of 100. Attach evidence and confidence to every rating. Suggested sandbox threshold: 75/100 plus all no-go gates cleared. These are fictional internal selection rules, not claims about any vendor.

| Criterion                         | Weight | Evidence                                                                          |
| --------------------------------- | ------ | --------------------------------------------------------------------------------- |
| Local market and method coverage  | 30%    | Supported rails, currencies, customer adoption, settlement coverage               |
| Reliability and recovery          | 25%    | Measured sandbox behavior, idempotency, status APIs, reconciliation and incidents |
| Compliance and data handling      | 20%    | Independent assurance scope, DPA, residency, SCA and fraud responsibilities       |
| Integration and developer support | 15%    | API/SDK quality, accessible UI options, webhook contracts, support ownership      |
| Commercial fit                    | 10%    | Full fee model, refunds, FX, disputes, reserves and exit terms                    |

Payments Platform owns the technical rating; Trust & Safety signs compliance; Growth Engineering signs customer fit; Finance reviews commercial assumptions. Adyen and Worldpay have no fabricated vendor scores in this seed.

## 4. Sandbox > pilot > full rollout

| Phase        | Scope                                                                                                                                                                      | Exit decision                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Sandbox      | Synthetic data only; adapter contract, successful/declined/unknown outcomes, duplicate requests, SCA return paths, webhook replays, accessibility and reconciliation tests | Required scenarios pass, no critical findings, operations and compliance review complete                   |
| Pilot        | Explicit opt-in or reviewed small cohort in one approved corridor; agreed traffic cap, support cover, real-time monitoring and daily reconciliation                        | Stable measured performance, zero unresolved duplicate debits, reconciled ledger, customer and risk review |
| Full rollout | Gradual increase within approved markets and supported methods; each step has an observation window and named rollback owner                                               | All pilot gates remain healthy; expansion is evidence-led, not an automatic calendar ramp                  |

The exact cohort, thresholds and observation window are set in the candidate's rollout plan. Failure stops expansion. A kill switch blocks new attempts without losing status reconciliation for existing ones. Rollback must never resend an uncertain payment to another provider.

## 5. Complete the cross-team change

Update the provider registry, web method selector, backend routing/callback contracts, native capability config, policy evidence and support runbook together. See [API standards](api-standards.md), [brand rules](brand-design-system.md) and [workspace map](workspace-map.md).

In this repository, sandbox/pilot/full are documented future phases, not operational environments. The app runs local deterministic simulations only. The next integration remains a planner exercise.
