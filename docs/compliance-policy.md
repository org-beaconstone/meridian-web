# Payments compliance and regulatory policy

**Fictional internal policy proposal.** Owner: Daniel Brooks, Trust & Safety. Reviewed 18 September 2026. Not legal advice, an attestation, or evidence of real regulatory approval. Qualified legal and compliance owners must determine the applicable rules before production use.

## Non-negotiable vendor gates

- **SOC 2 Type II:** Require a current, in-scope report and review exceptions, report period, bridge coverage and relevant subservice organizations. Missing or unacceptable evidence is a no-go for onboarding in this fictional policy. This is Meridian's proposed procurement rule, not a claim that SOC 2 is universally legally required.
- **PCI-DSS:** Determine applicable card-data scope and require appropriate current provider compliance evidence. Review who captures, transmits and stores account data. Never log or store CVV. Prefer reviewed tokenized/hosted collection patterns; outsourcing does not erase bank or merchant obligations.
- **PSD2/SCA:** Establish jurisdiction, exemptions, challenge flows, responsibilities and evidence with compliance specialists. Never equate a provider's general support statement with every customer flow being compliant. Review accessibility and safe return from challenges.
- **Residency and privacy:** Document data classes, storage/processing locations, cross-border transfers, subprocessors, retention and deletion. No new corridor proceeds without approved contractual and technical controls. Residency requirements are assessed per market, not inferred from customer nationality.
- **KYC/AML:** Define onboarding checks, sanctions screening, ongoing monitoring, escalation and record retention. A payment amount threshold alone is not an AML policy.
- Unresolved critical security findings, unclear incident ownership, missing reconciliation controls or undisclosed settlement/dispute responsibilities block pilot approval.

## Data handling principles

Use least-privilege access, reviewed encryption and key management, auditable privileged actions and redacted telemetry. Keep provider secrets server-side. Minimize customer and financial data collection. Retention and breach-notification obligations must be determined for the relevant jurisdiction and incident; this proposal does not invent a universal deadline.

## Review and approval

Trust & Safety owns evidence acceptance. Payments Platform demonstrates implementation against [API standards](api-standards.md). Growth Engineering demonstrates understandable consent, fees, outcomes and accessible customer interaction. Vendor evidence must be reassessed on material changes and at an agreed periodic review.

The [provider playbook](provider-expansion-playbook.md) applies these checks before scoring can permit a sandbox-to-pilot decision. Commercial or growth targets from [company strategy](company-strategy.md) never override a no-go.

## What is and is not implemented here

The web demo has fictional fixtures, masked labels, no real card or bank credential collection, and deterministic payment outcomes. It uses localStorage without encryption for demo state and user-entered reference text. Do not enter real personal or financial data.

There are **no** provider credentials, actual tokens, sandbox API calls, identity checks, SCA challenges, fraud systems, regulatory filings or compliance attestations in this application. Success/decline/unavailable are provider-result simulations, not SCA decisions. Browser data validation is not a compliance control or security boundary.
