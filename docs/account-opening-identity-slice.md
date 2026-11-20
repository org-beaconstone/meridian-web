# ABDAO-1 identity slice

Synthetic delivery record for the fictional savings-account identity batch. This page is a repository seed, not a published Confluence page, an integration report, or a production claim.

Canonical behaviour lives in `src/domain/identity-slice.ts`. Account details shows the same status. Neither one opens a savings account or accepts funding.

## Record

| Field                | Value                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| Work item            | [ABDAO-1](https://one-atlas-mesa.atlassian.net/browse/ABDAO-1) Digital Account Opening – identity slice |
| Accountable team     | Digital Channels                                                                                        |
| This batch           | Identity-verification workflow: mobile customer starts, identity verification, verification outcome     |
| Mobile dependency    | Open. A mobile customer is the entry point, and the mobile client is not confirmed ready                |
| Integration evidence | Unconfirmed                                                                                             |
| Identity adapter     | 25 November 2026, moved from 20 November 2026                                                           |
| Integration testing  | Begins 26 November 2026                                                                                 |
| Pilot forecast       | 1 December 2026. This is a forecast, not a rollout decision                                             |
| Production claim     | Withheld                                                                                                |

## Traceability

Each objective links to at least one risk and one decision. Each risk and decision is linked from an objective. Release review of those items is still open.

| Objective                                                                                                                 | Risks                                                                              | Decisions                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| O1. A mobile customer can start opening a savings account only after identity verification succeeds.                      | R1 adapter date treated as evidence. R2 mobile client still open.                  | D1 adapter moves to 25 November 2026. D4 identity thread only.                                    |
| O2. This batch covers the identity workflow, the mobile dependency, integration readiness, and release checks.            | R2 mobile client. R3 later work pulled forward.                                    | D4 identity thread only. D5 Digital Channels owns the timeline.                                   |
| O3. A production claim waits for confirmed integration evidence, reviewed risks and decisions, and a completed checklist. | R1 adapter date treated as evidence. R4 pilot forecast read as a production claim. | D2 testing begins 26 November 2026. D3 pilot forecast is 1 December 2026 and rollout stays later. |

## Release checklist

Done in this record: identity-verification scope, the later-thread list, the timeline, and objective traceability.

Open: mobile dependency confirmed, integration evidence confirmed, risks reviewed, decisions reviewed.

`evaluateRelease` allows a production claim only when every check is done and matches the record. A checkbox set ahead of the record is an inconsistency, and the claim stays withheld. The shipped record is not release ready.

Savings opening additionally requires a successful identity verification. Funding stays in a later batch even after that gate is met.

## Outside this batch

Funding, fraud controls, notifications, security and operations tasks, and rollout decisions are later batches. `requestThread` accepts only `identity-verification`.

The everyday balance is unchanged by viewing this record.
