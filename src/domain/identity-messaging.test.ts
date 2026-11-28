import { describe, expect, it } from 'vitest';
import {
  EXPLICIT_REJECTION_APPLICANT_MESSAGE,
  PAUSED_APPLICANT_MESSAGE,
  VERIFIED_APPLICANT_MESSAGE,
  isIdentityVerificationResult,
  selectApplicantIdentityMessage,
} from './identity-messaging';

const REJECTION_AS_OUTCOME = /\brejected\b|\brejection\b|\bdenied\b|\bdenial\b/i;
const RETRY_POLICY = /automatic|will retry|we'll retry|retry policy/i;

function pausedText() {
  const message = PAUSED_APPLICANT_MESSAGE;
  return `${message.title} ${message.body} ${message.nextStep ?? ''}`;
}

describe('selectApplicantIdentityMessage', () => {
  it('keeps the verified outcome on its existing copy', () => {
    expect(selectApplicantIdentityMessage('verified')).toBe(VERIFIED_APPLICANT_MESSAGE);
    expect(VERIFIED_APPLICANT_MESSAGE).toEqual({
      outcome: 'verified',
      title: 'Identity verified',
      body: 'Your identity check is complete. You can continue this application.',
      nextStep: null,
    });
    expect(VERIFIED_APPLICANT_MESSAGE.title).not.toMatch(/paused/i);
  });

  it('keeps an explicit rejection on its existing copy', () => {
    expect(selectApplicantIdentityMessage('explicit_rejection')).toBe(
      EXPLICIT_REJECTION_APPLICANT_MESSAGE,
    );
    expect(EXPLICIT_REJECTION_APPLICANT_MESSAGE).toEqual({
      outcome: 'explicit_rejection',
      title: 'Application declined',
      body: 'This application was declined after the identity check. That decision is final for this application.',
      nextStep: null,
    });
    expect(EXPLICIT_REJECTION_APPLICANT_MESSAGE.title).not.toMatch(/paused/i);
  });

  it('shows a paused outcome for timeout and unavailable', () => {
    const timeout = selectApplicantIdentityMessage('timeout');
    const unavailable = selectApplicantIdentityMessage('unavailable');
    expect(timeout).toBe(PAUSED_APPLICANT_MESSAGE);
    expect(unavailable).toBe(timeout);
    expect(timeout.outcome).toBe('paused');
    expect(pausedText()).toContain('paused, not declined');
    expect(timeout.nextStep).toBe('Return to continue, or try again later.');
    expect(pausedText()).not.toMatch(REJECTION_AS_OUTCOME);
    expect(pausedText()).not.toMatch(RETRY_POLICY);
    expect(pausedText().match(/\bdeclin\w*/gi)).toEqual(['declined']);
  });

  it('does not treat a payment-style decline code as an identity result', () => {
    expect(isIdentityVerificationResult('declined')).toBe(false);
    expect(isIdentityVerificationResult('rejected')).toBe(false);
    expect(isIdentityVerificationResult('timeout')).toBe(true);
    expect(isIdentityVerificationResult('unavailable')).toBe(true);
    expect(isIdentityVerificationResult('verified')).toBe(true);
    expect(isIdentityVerificationResult('explicit_rejection')).toBe(true);
  });
});
