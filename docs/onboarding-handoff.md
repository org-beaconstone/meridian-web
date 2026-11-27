# Security-to-scheduling handoff (MER-1)

Rehearsal seed for the Project Meridian customer onboarding plan v2.1. This note is the in-repo description of the handoff. It is not a published runbook, and it is not evidence that a real customer was approved.

The customer case in the demo is Harbour & Pine Markets, `ONB-1842`. Priya Shah is the designated implementation contact. Product Operations is the internal queue. Rowan Hale records the Trust & Safety sign-off. None of these are real people, and the rehearsal sends no email, ticket, or payment.

## Automated trigger

`approveSecurityChecklist` in `src/domain/onboarding.ts` is the handoff trigger. It runs when a Trust & Safety reviewer records sign-off and every mandatory security checklist item is complete. The checklist matches the fictional procurement gates: SOC 2 Type II, PCI scope with no raw PAN in Meridian, residency, incident notification, PSD2/SCA capability, and no unresolved regulatory action.

One successful call does all of the following together:

1. Stores the security approval on the case.
2. Moves the case from legal and security review (step 3) to implementation scheduling.
3. Opens the step 4 plan-approval window and the step 5 environment-configuration window.
4. Records a notice for the customer's implementation contact.
5. Records a notice for Product Operations.

The trigger is `security_checklist_approved`. Repeating the same sign-off returns the same case and does not add a second pair of notices. A different sign-off after approval is rejected. An incomplete checklist is rejected and leaves the case in security review. The function does not change its input.

The Onboarding screen calls this function directly. Validation lives in the domain, so the screen cannot approve a case the domain rejects.

## Schedule

Business days are Monday to Friday on the UTC calendar. The rehearsal sign-off clock is 18 September 2026, 16:30 UTC, the same fixed demo date as the banking screens.

| Milestone                       | Rule from the sign-off date                  | Rehearsal date |
| ------------------------------- | -------------------------------------------- | -------------- |
| Plan approval opens             | Next business day                            | 21 Sep 2026    |
| Plan approval due               | Two business days                            | 22 Sep 2026    |
| Environment configuration opens | Next business day after plan approval is due | 23 Sep 2026    |
| Environment configuration due   | Five business days                           | 25 Sep 2026    |

## Notices

With the notify channel available, both notices are marked `automated` and recorded at the sign-off time.

| Audience                           | Channel reference                       |
| ---------------------------------- | --------------------------------------- |
| Priya Shah, implementation contact | `contact://harbour-pine/implementation` |
| Product Operations                 | `queue://product-operations/onboarding` |

Channel references are rehearsal tokens. An email address is rejected for the reviewer name and for the implementation contact.

## Operational fallback

Policy `MER-1-HANDOFF-FB` version 1.0. In this fictional record, Product Operations approved it on 1 September 2026 after review with Trust & Safety. Use it only when the notify channel is unavailable.

The security sign-off still opens the schedule automatically. Both notices are marked `operational_fallback`, and the case stores a manual queue reference, `queue://product-operations/onboarding/ONB-1842`.

The operations clock is weekdays 09:00–17:00 UTC. Time outside that window waits until the next window opens.

| Obligation                                   | SLA                                |
| -------------------------------------------- | ---------------------------------- |
| Tell the implementation contact              | 4 business hours                   |
| Product Operations acknowledges the schedule | 17:00 UTC on the next business day |

For the Friday 16:30 UTC rehearsal sign-off, 30 minutes remain in that window, so the contact notice is due 12:30 UTC on Monday 21 September 2026. Product Operations is due 17:00 UTC the same Monday.

## Verification

Domain tests cover the trigger, both audiences, an incomplete checklist, idempotent replay, rejection of a second different sign-off, and the fallback clock including weekends and the edge of the business window. The browser journey is `security sign-off schedules implementation and notifies both audiences` in `tests/e2e/banking.spec.ts`. The banking balance stays on its fixture, because this handoff is separate from the payment ledger.
