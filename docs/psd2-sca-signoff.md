# PAY-152 compliance register seed: PSD2 SCA gate

Synthetic Confluence-ready seed for the fictional Meridian rehearsal. This page is **not** a legal opinion, a qualified Trust & Safety attestation, or evidence that European production traffic is cleared. It records the operational gate requested by [PAY-152](https://beacon-stone.atlassian.net/browse/PAY-152) against the architecture tracked as PAY-1204.

Canonical behaviour lives in `src/domain/sca.ts`. The payment screen rehearses the same copy and factor rules. Neither one enables live canary traffic.

## Register entry

| Field                   | Value                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| Work item               | PAY-152                                                                                        |
| Parent                  | PAY-146 Meridian Mobile: European Payment Platform Expansion                                   |
| Architecture reference  | PAY-1204                                                                                       |
| Owner roles             | Trust & Safety, Payments Platform engineering, Payments Platform legal                         |
| Written sign-off        | Logged                                                                                         |
| Architecture            | In-app 6-digit passcode fallback, with device biometric as the primary rehearsal factor        |
| SMS / SIM one-time code | Not permitted                                                                                  |
| Production canary       | Closed. The logged sign-off is a mandatory gate and is not itself a live-traffic authorization |
| Evidence                | Domain checks in `src/domain/sca.ts`, customer rehearsal on the payment screen                 |

No named person has signed this seed. Role names are the stakeholders the work item requires. Do not treat this file as their signature.

## What was reviewed

The rehearsal checks three artefacts together:

1. **Factor set.** Primary path is a simulated device biometric (inherence on a device the customer already has). Fallback is a 6-digit passcode entered in the app (knowledge) on that same device (possession). SMS, voice, email and SIM-bound one-time codes are rejected factors.
2. **Dynamic linking.** The biometric prompt names the payee and the amount. The audit record binds payment id, recipient id and integer minor-unit amount. A prompt without both payee and amount is refused.
3. **Audit payload.** The event is `sca.authentication` with factor, outcome, attempt count and the dynamic link. Passcode, PIN, one-time code, biometric template, PAN and CVV fields are forbidden. The rehearsal passcode is never copied into the payload.

SIM-swap exposure is addressed by omission of the phone channel: control of a SIM does not yield an accepted factor. The browser rehearsal demonstrates that rule. It does not implement a secure element, app attestation or real device binding, so it is not a production control against a live SIM-swap attack.

A static 6-digit code has limited entropy. The rehearsal pairs it with attempt lockout (five failures locks that payment) and refuses to treat it as sufficient on its own. That is an architecture constraint in this demo, not a claim that every paragraph of the PSD2 RTS is met.

## Approved biometric copy

Template in `BIOMETRIC_PROMPT_TEMPLATE`:

> Approve {amount} to {payee} on this device. Meridian will not send a text message or use your phone number for this check.

## Approved fallback flow

1. The customer reviews payee, amount, method and provider.
2. Verification offers the biometric rehearsal first.
3. **Use 6-digit passcode instead** reveals `FALLBACK_COPY`:

> If this device cannot use biometrics, enter the 6-digit passcode saved in the Meridian app. A code sent by text, email or phone call cannot approve the payment. Controlling a SIM does not provide this factor.

4. The field label is `6-digit app passcode`. The fictional rehearsal code is displayed so customers do not type a personal PIN.
5. A recognised code, or the simulated biometric, produces an audit event and only then submits the existing payment simulation.
6. Five unrecognised attempts lock that payment, including the biometric shortcut. Starting a new payment is required.
7. Provider decline or unavailable still moves no money. Retry stays on the same payment id after a successful rehearsal authentication.

## Approved audit payload

```json
{
  "event": "sca.authentication",
  "registerId": "PAY-152",
  "paymentId": "pay-152-demo",
  "recipientId": "northline-studio",
  "amountPence": 2599,
  "dynamicLink": "dl_pay-152-demo_northline-studio_2599",
  "factor": "in_app_passcode",
  "outcome": "accepted",
  "attempt": 1
}
```

`factor` is `device_biometric` or `in_app_passcode`. `outcome` is `accepted`, `rejected` or `locked`.

## Canary gate

`evaluateCanaryGate` allows live traffic only when all of the following are true:

- the written PAY-152 sign-off is logged
- SMS one-time codes stay forbidden
- both approved factors, and no rejected factor, are the permitted set
- audit copy, biometric copy and the fallback flow are marked approved
- Trust & Safety, Payments Platform engineering and Payments Platform legal are listed stakeholders
- `liveCanaryAuthorized` is separately true

The shipped record sets `writtenSignOff` to `logged` and `liveCanaryAuthorized` to `false`. Asking for live traffic therefore stays closed. The web client never requests live traffic.

European corridor clearance in the [compliance policy](compliance-policy.md) is unchanged: no third provider is selected, and this seed does not clear one.
