import { describe, expect, it } from 'vitest';
import {
  FALLBACK_POLICY,
  PRODUCT_OPERATIONS_CHANNEL,
  PRODUCT_OPERATIONS_LABEL,
  REHEARSAL_SIGNOFF_AT,
  SECURITY_APPROVER_ROLE,
  SECURITY_CHECKLIST,
  addBusinessDays,
  addBusinessHours,
  approveSecurityChecklist,
  createSeedCase,
  type OnboardingCase,
  type SecuritySignOff,
} from './onboarding';

const signOff: SecuritySignOff = {
  approverName: 'Rowan Hale',
  approverRole: SECURITY_APPROVER_ROLE,
  signedAt: REHEARSAL_SIGNOFF_AT,
};

function readyCase(): OnboardingCase {
  const onboarding = createSeedCase();
  onboarding.checklist = onboarding.checklist.map((item) => ({ ...item, complete: true }));
  return onboarding;
}

function freezeDeep<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as object)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

describe('approveSecurityChecklist', () => {
  it('opens scheduling and notifies both audiences when the channel is available', () => {
    const input = freezeDeep(readyCase());
    const result = approveSecurityChecklist(input, signOff, { notifyChannelAvailable: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.onboarding.stage).toBe('implementation_scheduling');
    expect(result.onboarding.securityApproval).toMatchObject({
      approverName: 'Rowan Hale',
      approverRole: 'Trust & Safety',
      signedAt: '2026-09-18T16:30:00.000Z',
      planRef: 'MER-1',
      planVersion: '2.1',
    });
    expect(result.onboarding.schedule).toEqual({
      openedAt: '2026-09-18T16:30:00.000Z',
      trigger: 'security_checklist_approved',
      planApprovalOpens: '2026-09-21',
      planApprovalDue: '2026-09-22',
      environmentConfigOpens: '2026-09-23',
      environmentConfigDue: '2026-09-25',
    });
    expect(result.onboarding.fallback).toBeNull();
    expect(result.onboarding.notifications.map((notice) => notice.audience)).toEqual([
      'implementation_contact',
      'product_operations',
    ]);
    expect(result.onboarding.notifications[0]).toMatchObject({
      recipientLabel: 'Priya Shah',
      channelRef: 'contact://harbour-pine/implementation',
      delivery: 'automated',
      dueAt: null,
    });
    expect(result.onboarding.notifications[0].summary).toContain(
      'Priya Shah (implementation contact) was notified automatically at 18 Sep 2026, 16:30 UTC',
    );
    expect(result.onboarding.notifications[1]).toMatchObject({
      recipientLabel: PRODUCT_OPERATIONS_LABEL,
      channelRef: PRODUCT_OPERATIONS_CHANNEL,
      delivery: 'automated',
    });
    expect(result.onboarding.notifications[1].summary).toContain(
      'Product Operations was notified automatically at 18 Sep 2026, 16:30 UTC',
    );
    expect(input.stage).toBe('security_review');
    expect(input.securityApproval).toBeNull();
    expect(input.notifications).toEqual([]);
  });

  it('keeps the schedule and applies the approved fallback when notify is unavailable', () => {
    const result = approveSecurityChecklist(readyCase(), signOff, {
      notifyChannelAvailable: false,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.onboarding.stage).toBe('implementation_scheduling');
    expect(result.onboarding.schedule?.trigger).toBe('security_checklist_approved');
    expect(result.onboarding.fallback).toMatchObject({
      policyRef: 'MER-1-HANDOFF-FB',
      policyVersion: '1.0',
      approvedBy: 'Product Operations',
      reviewedWith: 'Trust & Safety',
      approvedAt: '2026-09-01',
      reason: 'notify_channel_unavailable',
      manualQueueRef: 'queue://product-operations/onboarding/ONB-1842',
      implementationContactDueAt: '2026-09-21T12:30:00.000Z',
      productOperationsDueAt: '2026-09-21T17:00:00.000Z',
    });
    expect(
      result.onboarding.notifications.every((notice) => notice.delivery === 'operational_fallback'),
    ).toBe(true);
    expect(result.onboarding.notifications[0].summary).toContain('21 Sep 2026, 12:30 UTC');
    expect(result.onboarding.notifications[0].summary).toContain('4 business hours');
    expect(result.onboarding.notifications[1].summary).toContain('21 Sep 2026, 17:00 UTC');
    expect(FALLBACK_POLICY.approvedAt < '2026-09-18').toBe(true);
  });

  it('replays an identical sign-off without a second notice', () => {
    const first = approveSecurityChecklist(readyCase(), signOff, { notifyChannelAvailable: true });
    if (!first.ok) throw new Error('expected approval');
    const replay = approveSecurityChecklist(first.onboarding, signOff, {
      notifyChannelAvailable: false,
    });
    expect(replay).toEqual(first);
  });

  it('rejects a different sign-off after approval', () => {
    const first = approveSecurityChecklist(readyCase(), signOff, { notifyChannelAvailable: true });
    if (!first.ok) throw new Error('expected approval');
    const again = approveSecurityChecklist(
      first.onboarding,
      { ...signOff, approverName: 'Amina Cole' },
      { notifyChannelAvailable: true },
    );
    expect(again).toEqual({ ok: false, errors: ['Security review is already signed off'] });
  });

  it('rejects an incomplete checklist with one error per open item', () => {
    const onboarding = createSeedCase();
    onboarding.checklist = onboarding.checklist.map((item, index) =>
      index === 0 ? { ...item, complete: true } : item,
    );
    const result = approveSecurityChecklist(onboarding, signOff, { notifyChannelAvailable: true });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(
      SECURITY_CHECKLIST.slice(1).map((item) => `Complete checklist item: ${item.label}`),
    );
    expect(onboarding.stage).toBe('security_review');
  });

  it('rejects a checklist that does not match the plan', () => {
    const onboarding = readyCase();
    onboarding.checklist = onboarding.checklist.slice(0, 5);
    const result = approveSecurityChecklist(onboarding, signOff, { notifyChannelAvailable: true });
    expect(result).toEqual({
      ok: false,
      errors: ['Security checklist does not match plan MER-1 v2.1'],
    });
  });

  it('rejects sign-off from anyone other than Trust & Safety', () => {
    const result = approveSecurityChecklist(
      readyCase(),
      { ...signOff, approverRole: 'Product Operations' },
      { notifyChannelAvailable: true },
    );
    expect(result).toEqual({
      ok: false,
      errors: ['Security sign-off must be recorded by Trust & Safety'],
    });
  });

  it('rejects an email address in place of the reviewer name', () => {
    const result = approveSecurityChecklist(
      readyCase(),
      { ...signOff, approverName: 'rowan@example.com' },
      { notifyChannelAvailable: true },
    );
    expect(result).toEqual({
      ok: false,
      errors: ['Approver name must be a name, not an email address'],
    });
  });

  it('rejects a real-looking contact channel', () => {
    const onboarding = readyCase();
    onboarding.implementationContact = {
      ...onboarding.implementationContact,
      channelRef: 'priya@example.com',
    };
    const result = approveSecurityChecklist(onboarding, signOff, { notifyChannelAvailable: true });
    expect(result).toEqual({
      ok: false,
      errors: ['Implementation contact needs a contact:// channel reference'],
    });
  });

  it('rejects an impossible sign-off time', () => {
    const result = approveSecurityChecklist(
      readyCase(),
      { ...signOff, signedAt: '2026-02-31T16:30:00.000Z' },
      { notifyChannelAvailable: true },
    );
    expect(result).toEqual({
      ok: false,
      errors: ['Sign-off time must be a UTC timestamp'],
    });
  });

  it('rejects handoff outside legal and security review', () => {
    const onboarding = readyCase();
    onboarding.stage = 'implementation_scheduling';
    const result = approveSecurityChecklist(onboarding, signOff, { notifyChannelAvailable: true });
    expect(result).toEqual({
      ok: false,
      errors: ['Handoff is only available during legal and security review'],
    });
  });
});

describe('fallback clock', () => {
  it('counts business days across a weekend', () => {
    expect(addBusinessDays('2026-09-18', 1)).toBe('2026-09-21');
    expect(addBusinessDays('2026-09-18', 5)).toBe('2026-09-25');
    expect(addBusinessDays('2026-09-19', 1)).toBe('2026-09-21');
  });

  it('spends four business hours inside the 09:00–17:00 UTC window', () => {
    expect(addBusinessHours('2026-09-18T10:00:00.000Z', 4)).toBe('2026-09-18T14:00:00.000Z');
    expect(addBusinessHours('2026-09-18T16:00:00.000Z', 2)).toBe('2026-09-21T10:00:00.000Z');
    expect(addBusinessHours('2026-09-18T08:00:00.000Z', 4)).toBe('2026-09-18T13:00:00.000Z');
    expect(addBusinessHours('2026-09-18T17:00:00.000Z', 4)).toBe('2026-09-21T13:00:00.000Z');
    expect(addBusinessHours('2026-09-19T12:00:00.000Z', 4)).toBe('2026-09-21T13:00:00.000Z');
  });
});
