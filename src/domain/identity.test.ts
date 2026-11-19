import { describe, expect, it, vi } from 'vitest';
import {
  acceptInitialFunding,
  acknowledgeContract,
  activateSavingsAccount,
  identityLogRecord,
  submitIdentity,
  validateIdentityCapture,
  writeIdentityLog,
  type IdentityCapture,
  type IdentityDecision,
} from './identity';

const applicationId = '11111111-1111-4111-8111-111111111111';
const secretReference = 'AB12CD34';
const cardNumber = '4242424242424242';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig';

const capture = (): IdentityCapture => ({
  givenName: 'Jordan',
  familyName: 'Ellis',
  dateOfBirth: '1990-04-12',
  documentReference: secretReference,
  consentAccepted: true,
});

function decisionFor(outcome: 'verified' | 'rejected' | 'unavailable') {
  const result = submitIdentity(capture(), outcome, applicationId);
  if (!result.ok) throw new Error(result.errors.join(','));
  return result.decision;
}

describe('identity capture', () => {
  it('accepts a fictional adult capture without returning the attributes', () => {
    const result = submitIdentity(capture(), 'verified', applicationId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const encoded = JSON.stringify(result.decision);
    expect(encoded).not.toContain('Jordan');
    expect(encoded).not.toContain('Ellis');
    expect(encoded).not.toContain('1990-04-12');
    expect(encoded).not.toContain(secretReference);
    expect(result.decision.authoritative).toBe(false);
    expect(result.decision.acceptance).toBe('blocked');
    expect(result.decision.dependency).toBe('W02');
  });

  it('requires consent and does not echo rejected values', () => {
    const errors = validateIdentityCapture({
      ...capture(),
      consentAccepted: false,
      givenName: cardNumber,
      familyName: token,
      dateOfBirth: '2010-01-01',
      documentReference: cardNumber,
    });
    const text = errors.join(' ');
    expect(text).toContain('Consent is required');
    expect(text).not.toContain(cardNumber);
    expect(text).not.toContain(token);
    expect(text).not.toContain('2010-01-01');
    expect(text).not.toContain('Jordan');
  });

  it('rejects card numbers and credentials in the document reference', () => {
    for (const documentReference of [cardNumber, '4242-4242-4242-4242', token, 'sk_live_abc123']) {
      const errors = validateIdentityCapture({ ...capture(), documentReference });
      expect(errors.join(' ')).toContain('not accepted');
      expect(errors.join(' ')).not.toContain(documentReference);
    }
  });

  it('checks age on the fixed demo date', () => {
    expect(validateIdentityCapture({ ...capture(), dateOfBirth: '2008-09-18' })).toEqual([]);
    expect(
      validateIdentityCapture({ ...capture(), dateOfBirth: '2008-09-19' }).join(' '),
    ).toContain('aged 18');
    expect(validateIdentityCapture({ ...capture(), dateOfBirth: '1906-09-18' })).toEqual([]);
    expect(
      validateIdentityCapture({ ...capture(), dateOfBirth: '1905-09-18' }).join(' '),
    ).toContain('aged 18');
    expect(
      validateIdentityCapture({ ...capture(), dateOfBirth: '2026-02-31' }).join(' '),
    ).toContain('real date');
  });

  it('accepts hyphenated and apostrophe names', () => {
    expect(
      validateIdentityCapture({
        ...capture(),
        givenName: 'Mary-Jane',
        familyName: "O'Neil",
      }),
    ).toEqual([]);
  });
});

describe('verification outcomes', () => {
  it('keeps rejection final and unavailability retryable', () => {
    const rejected = decisionFor('rejected');
    const unavailable = decisionFor('unavailable');
    const verified = decisionFor('verified');

    expect(rejected.retryable).toBe(false);
    expect(rejected.code).toBe('IDENTITY_REJECTED');
    expect(rejected.summary).toContain('final decision');
    expect(rejected.summary.toLowerCase()).not.toContain('unavailable');

    expect(unavailable.retryable).toBe(true);
    expect(unavailable.code).toBe('VERIFICATION_UNAVAILABLE');
    expect(unavailable.summary).toContain('not a rejection');
    expect(unavailable.summary.toLowerCase()).not.toContain('rejected');

    expect(verified.retryable).toBe(false);
    expect(verified.code).toBe('IDENTITY_VERIFIED_REHEARSAL');
    expect(verified.summary).toContain('not an accepted verification');
  });

  it('refuses account activation and funding for every rehearsal outcome', () => {
    for (const outcome of ['verified', 'rejected', 'unavailable'] as const) {
      const decision = decisionFor(outcome);
      const activation = activateSavingsAccount(decision);
      const funding = acceptInitialFunding(decision, cardNumber);
      expect(activation.ok).toBe(false);
      expect(activation.accountActivated).toBe(false);
      expect(activation.funded).toBe(false);
      expect(funding.accountActivated).toBe(false);
      expect(funding.funded).toBe(false);
      expect(JSON.stringify(funding)).not.toContain(cardNumber);
      expect(JSON.stringify(activation)).not.toContain(secretReference);
    }

    expect(activateSavingsAccount(decisionFor('rejected')).code).toBe('IDENTITY_REJECTED');
    expect(activateSavingsAccount(decisionFor('rejected')).retryable).toBe(false);
    expect(activateSavingsAccount(decisionFor('unavailable')).code).toBe(
      'VERIFICATION_UNAVAILABLE',
    );
    expect(activateSavingsAccount(decisionFor('unavailable')).retryable).toBe(true);
    expect(activateSavingsAccount(decisionFor('unavailable')).summary).toContain('not a rejection');

    const verifiedGate = activateSavingsAccount(decisionFor('verified'));
    expect(verifiedGate.code).toBe('INTEGRATION_BLOCKED');
    expect(verifiedGate.summary).toContain('W02');
    expect(verifiedGate.summary).toContain('26 November 2026');
    expect(verifiedGate.summary.toLowerCase()).not.toContain('rejected');
    expect(activateSavingsAccount(null).code).toBe('NOT_VERIFIED');
  });

  it('does not treat a contract-shaped payload as acceptance', () => {
    const decision = decisionFor('verified');
    const payload = {
      source: 'W02',
      outcome: 'verified',
      token,
      documentReference: secretReference,
      givenName: 'Jordan',
    };
    const acknowledged = acknowledgeContract(decision, payload);
    const encoded = JSON.stringify(acknowledged);
    expect(acknowledged.authoritative).toBe(false);
    expect(acknowledged.acceptance).toBe('blocked');
    expect(encoded).not.toContain(token);
    expect(encoded).not.toContain(secretReference);
    expect(encoded).not.toContain('Jordan');
    expect(activateSavingsAccount(acknowledged).code).toBe('INTEGRATION_BLOCKED');
    expect(acceptInitialFunding(acknowledged, '20.00').funded).toBe(false);
  });
});

describe('identity logs', () => {
  it('writes only the outcome record and ignores extra fields', () => {
    const decision = decisionFor('unavailable');
    const poisoned = {
      ...decision,
      givenName: 'Jordan',
      familyName: 'Ellis',
      dateOfBirth: '1990-04-12',
      documentReference: secretReference,
      token,
      summary: `verified ${token}`,
    } as IdentityDecision;
    const lines: string[] = [];
    const record = writeIdentityLog(poisoned, (line) => lines.push(line));
    const encoded = `${JSON.stringify(record)}\n${lines.join('\n')}`;
    expect(record).toEqual({
      event: 'identity.outcome',
      applicationId,
      outcome: 'unavailable',
      retryable: true,
      code: 'VERIFICATION_UNAVAILABLE',
      acceptance: 'blocked',
      dependency: 'W02',
    });
    expect(encoded).not.toContain('Jordan');
    expect(encoded).not.toContain('Ellis');
    expect(encoded).not.toContain('1990-04-12');
    expect(encoded).not.toContain(secretReference);
    expect(encoded).not.toContain(token);
    expect(Object.keys(identityLogRecord(poisoned)).sort()).toEqual(
      ['acceptance', 'applicationId', 'code', 'dependency', 'event', 'outcome', 'retryable'].sort(),
    );
  });

  it('does not write to the console by default', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    writeIdentityLog(decisionFor('rejected'));
    expect(log).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
    expect(debug).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    log.mockRestore();
    info.mockRestore();
    debug.mockRestore();
    warn.mockRestore();
  });
});
