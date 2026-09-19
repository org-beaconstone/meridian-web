# Meridian Bank: FY26-28 strategy

**Fictional planning seed.** Owner: Elena Ruiz, Growth Engineering, with Priya Shah, Payments Platform. Reviewed 18 September 2026. This describes the demo company's story, not a real bank's commitments.

## Starting point

Meridian is a mid-size, digital-first bank headquartered in New York, serving 4 million customers across the US and UK. The established provider set is Adyen and Worldpay. A next-provider integration is deliberately not selected or implemented.

## Three-year ambition

Grow digital payment volume to **3x the FY26 baseline** by the end of FY28, enter selected European markets, and become a multi-provider payment platform rather than a customer interface tied to two integrations. Use an indexed baseline of 100, with a target of 300; absolute transaction volumes are not supplied by the brief.

| Planning horizon | Intended outcome                                                                | Decision evidence                                                               |
| ---------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| FY26             | Stabilize the existing payment journey and establish a shared provider contract | Baseline payment success, abandonment, recovery and accessibility findings      |
| FY27             | Pilot a relevant local European payment experience                              | Market demand, local method coverage, vendor scorecard and regulatory readiness |
| FY28             | Scale approved corridors and reach 3x baseline volume                           | Sustainable unit economics, reconciled payments, reliability and customer trust |

European market prioritization should consider France, Germany and the Netherlands as candidates, not confirmed launches. Choose a market and local customer need before choosing a provider. A popular regional service alone is not sufficient evidence of fit.

## Product principles

1. Keep the payment screen understandable: who, how much, payment method, review and outcome.
2. Keep budgets visible so payment decisions retain financial context.
3. Add provider capabilities behind stable contracts across web, API and native clients.
4. Never increase approval rates by weakening compliance controls or retrying ambiguous payments across providers.

## Ownership and dependencies

Payments Platform owns provider evaluation and orchestration. Trust & Safety owns regulatory and vendor no-go gates. Growth Engineering owns the customer experience and experiment plan. Mobile Experience owns native parity and capability configuration. See [workspace map](workspace-map.md) for illustrative PAY, MWEB, MAPI and MMOB ownership.

Track payment completion, customer abandonment, duplicate/unknown outcomes, reconciliation backlog, cost per completed payment and adoption of local methods. Establish real baselines before setting numeric production thresholds.

## Planning inputs

- [Provider expansion playbook](provider-expansion-playbook.md): scorecard and rollout phases.
- [Compliance policy](compliance-policy.md): mandatory no-go checks.
- [API standards](api-standards.md): auth, retry and provider contract requirements.
- [Brand and design system](brand-design-system.md): accessible UI and third-party identity rules.

The working `meridian-web` repo is a synthetic customer demo. API and mobile repository descriptions are contextual targets, not created services. No Confluence page or Jira issue is implied by this document.
