# Meridian workspace map

All teams, people and Jira keys below are fictional planning context. No Jira records or Confluence pages have been created. Repository status is explicitly separated from the proposed workspace.

## Team ownership

| Team               | Fictional lead | Responsibilities                                      | Jira key  |
| ------------------ | -------------- | ----------------------------------------------------- | --------- |
| Payments Platform  | Priya Shah     | Provider adapters, routing, ledger and reconciliation | PAY, MAPI |
| Trust & Safety     | Daniel Brooks  | Vendor diligence, fraud, SCA, PCI and residency gates | PAY, MAPI |
| Growth Engineering | Elena Ruiz     | Web payment experience, budgets and activation        | MWEB      |
| Mobile Experience  | Tom Okafor     | Native payment UI and shared payment SDK contracts    | MMOB      |

## Repository context

| Repository      | Stack                        | Context and actual status                                                                                                                           |
| --------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| meridian-web    | React, TypeScript, ADS, Vite | This working customer web demo. Two provider simulations, local state, no production connectivity.                                                  |
| meridian-api    | Java, Spring Boot            | Contextual target, not created. Proposed orchestrator with pluggable Adyen/Worldpay adapters, routing and webhooks.                                 |
| meridian-mobile | Swift and Kotlin             | Contextual target, not created. Proposed native surfaces and shared payment SDK contract; baseline configuration limited to the same two providers. |

The API and mobile baseline descriptions are story context for planning, not proof that repositories or SDKs exist. Do not point a planner at invented source URLs.

## Illustrative backlog

These are seed titles, not issue links or created records:

- PAY: Define European provider evaluation scorecard and no-go criteria.
- MWEB: Preserve accessibility and budget context through payment-method selection.
- MAPI: Document idempotency and unknown-outcome reconciliation contract.
- MMOB: Replace two-provider hardcoding with reviewed shared capability configuration.

## Working agreements

Payments Platform owns integration readiness. Growth Engineering owns customer flow changes. Trust & Safety can stop vendor onboarding on a no-go criterion. Mobile Experience reviews contract changes before any pilot. A weekly provider readiness review references [strategy](company-strategy.md), [playbook](provider-expansion-playbook.md), [compliance](compliance-policy.md) and [integration standards](api-standards.md).

Confluence-ready seeds are indexed in [README](README.md). Publish them only after choosing a real destination and replacing illustrative ownership with approved demo workspace records.
