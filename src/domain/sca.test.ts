import { describe, expect, it } from 'vitest';
import {
  BIOMETRIC_PROMPT_TEMPLATE,
  DEMO_REHEARSAL_PASSCODE,
  FALLBACK_COPY,
  MAX_PASSCODE_ATTEMPTS,
  REJECTED_FACTORS,
  SCA_SIGNOFF,
  acceptDeviceBiometric,
  attemptPasscode,
  auditPayloadIsSafe,
  biometricPromptCopy,
  dynamicLinkToken,
  evaluateCanaryGate,
  isSignOffLogged,
  type ScaSignOff,
} from './sca';

const link = {
  paymentId: 'pay-152-demo',
  recipientId: 'northline-studio',
  amountPence: 2599,
};

describe('PSD2 SCA rehearsal', () => {
  it('binds the biometric prompt to the payee and amount', () => {
    expect(biometricPromptCopy('Northline Studio', '£25.99')).toBe(
      'Approve £25.99 to Northline Studio on this device. Meridian will not send a text message or use your phone number for this check.',
    );
    expect(BIOMETRIC_PROMPT_TEMPLATE).toContain('{amount}');
    expect(BIOMETRIC_PROMPT_TEMPLATE).toContain('{payee}');
    expect(FALLBACK_COPY).toContain('6-digit passcode');
    expect(FALLBACK_COPY.toLowerCase()).not.toContain('text message code');
  });

  it('rejects a prompt that omits dynamic linking', () => {
    expect(() => biometricPromptCopy('  ', '£1.00')).toThrow(/payee and amount/);
  });

  it('keeps the passcode and SIM channels out of the audit payload', () => {
    const failed = attemptPasscode({
      link,
      passcode: DEMO_REHEARSAL_PASSCODE + '0',
      attemptsUsed: 0,
    });
    expect(failed.ok).toBe(false);
    expect(failed.audit.dynamicLink).toBe(dynamicLinkToken(link));
    expect(JSON.stringify(failed.audit)).not.toContain(DEMO_REHEARSAL_PASSCODE);
    expect(auditPayloadIsSafe(failed.audit)).toBe(true);
    expect(auditPayloadIsSafe({ passcode: '482913' })).toBe(false);
    for (const factor of REJECTED_FACTORS) {
      expect(SCA_SIGNOFF.permittedFactors).not.toContain(factor);
    }
  });

  it('accepts only the displayed 6-digit rehearsal passcode', () => {
    const accepted = attemptPasscode({
      link,
      passcode: ` ${DEMO_REHEARSAL_PASSCODE} `,
      attemptsUsed: 1,
    });
    expect(accepted.ok).toBe(true);
    expect(accepted.audit.factor).toBe('in_app_passcode');
    expect(accepted.audit.outcome).toBe('accepted');
    expect(accepted.attemptsUsed).toBe(2);

    expect(attemptPasscode({ link, passcode: '12345', attemptsUsed: 0 }).ok).toBe(false);
    expect(attemptPasscode({ link, passcode: '1234567', attemptsUsed: 0 }).ok).toBe(false);
    expect(attemptPasscode({ link, passcode: '12a456', attemptsUsed: 0 }).ok).toBe(false);
  });

  it('locks the payment after five failed passcode attempts', () => {
    let attemptsUsed = 0;
    let lastError = '';
    for (let i = 0; i < MAX_PASSCODE_ATTEMPTS; i += 1) {
      const result = attemptPasscode({ link, passcode: '000000', attemptsUsed });
      attemptsUsed = result.attemptsUsed;
      lastError = result.error ?? '';
      expect(result.ok).toBe(false);
    }
    expect(attemptsUsed).toBe(MAX_PASSCODE_ATTEMPTS);
    expect(lastError).toMatch(/locked/);
    const blocked = attemptPasscode({ link, passcode: DEMO_REHEARSAL_PASSCODE, attemptsUsed });
    expect(blocked.ok).toBe(false);
    expect(blocked.locked).toBe(true);
    expect(acceptDeviceBiometric(link, true).outcome).toBe('locked');
  });

  it('records a simulated biometric acceptance without a passcode', () => {
    const audit = acceptDeviceBiometric(link, false);
    expect(audit.factor).toBe('device_biometric');
    expect(audit.outcome).toBe('accepted');
    expect(audit.amountPence).toBe(2599);
    expect(audit.recipientId).toBe('northline-studio');
  });

  it('logs the written sign-off and keeps production canary closed', () => {
    expect(isSignOffLogged(SCA_SIGNOFF)).toBe(true);
    expect(SCA_SIGNOFF.liveCanaryAuthorized).toBe(false);
    expect(evaluateCanaryGate(SCA_SIGNOFF, { liveTraffic: false })).toEqual({
      allowed: false,
      reason: 'Live canary traffic is not requested.',
    });
    expect(evaluateCanaryGate(SCA_SIGNOFF, { liveTraffic: true })).toEqual({
      allowed: false,
      reason:
        'PAY-152 sign-off is logged as a mandatory gate. Live canary authorization remains closed.',
    });
    expect(evaluateCanaryGate(null, { liveTraffic: true }).reason).toMatch(/not logged/);

    const opened: ScaSignOff = { ...SCA_SIGNOFF, liveCanaryAuthorized: true };
    expect(evaluateCanaryGate(opened, { liveTraffic: true }).allowed).toBe(true);

    const smsAllowed: ScaSignOff = {
      ...SCA_SIGNOFF,
      smsOtpPermitted: true,
      liveCanaryAuthorized: true,
    };
    expect(isSignOffLogged(smsAllowed)).toBe(false);
    expect(evaluateCanaryGate(smsAllowed, { liveTraffic: true }).allowed).toBe(false);
  });
});
