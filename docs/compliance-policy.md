# Payments compliance: source context

[Existing Confluence policy](https://beacon-stone.atlassian.net/wiki/spaces/SPT/pages/147980346) is the authoritative fictional policy. [Google compliance working document](https://docs.google.com/document/d/1-gkUCrdTfqE2eKZgfTi83LD3y9sNkO0f2lf3oCodMYg/edit) is linked but was not readable through current access.

The source's hard no-go gates include an in-scope SOC2 TypeII report, PCI-DSS Level1 AOC, applicable PSD2/SCA capability, no raw PAN in Meridian, acceptable residency, documented incident notification and no unresolved regulatory action. Trust & Safety owns the policy. These are the demo company's procurement rules, not general legal advice or actual vendor assessments.

The running clients collect no financial credentials. The Java backend stores synthetic state only. There is no production authentication, KYC/AML enforcement, encryption/retention program or compliance attestation. [PAY-152](psd2-sca-signoff.md) logs a synthetic PSD2 SCA rehearsal gate: an in-app 6-digit passcode fallback with SMS one-time codes excluded. That register does not authorize live canary traffic. Room IDs isolate demo data but are not access credentials. Never enter real customer information.

See [strategy](company-strategy.md), [playbook](provider-expansion-playbook.md) and [API standards](api-standards.md).
