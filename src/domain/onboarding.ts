// Security-to-scheduling handoff for the fictional MER-1 customer onboarding plan.
// Records notices inside the demo. It does not email, open tickets, or move money.

import { DEMO_DATE, isCalendarDate } from './model';

export const ONBOARDING_PLAN_REF = 'MER-1';
export const ONBOARDING_PLAN_VERSION = '2.1';
export const SECURITY_APPROVER_ROLE = 'Trust & Safety';
export const PRODUCT_OPERATIONS_LABEL = 'Product Operations';
export const PRODUCT_OPERATIONS_CHANNEL = 'queue://product-operations/onboarding';
export const REHEARSAL_SIGNOFF_AT = `${DEMO_DATE}T16:30:00.000Z`;

/** Operations window for the fallback SLA. Weekdays 09:00–17:00 UTC. */
const BUSINESS_START_MS = 9 * 3_600_000;
const BUSINESS_END_MS = 17 * 3_600_000;

export const FALLBACK_POLICY = {
  policyRef: 'MER-1-HANDOFF-FB',
  policyVersion: '1.0',
  approvedBy: 'Product Operations',
  reviewedWith: 'Trust & Safety',
  approvedAt: '2026-09-01',
  implementationContactBusinessHours: 4,
  productOperationsBusinessDays: 1,
} as const;

export const SECURITY_CHECKLIST = [
  {
    id: 'soc2-type-ii',
    label: 'In-scope SOC 2 Type II report recorded',
    evidence: 'Synthetic customer file only.',
  },
  {
    id: 'pci-scope',
    label: 'PCI scope confirmed with no raw PAN in Meridian',
    evidence: 'Records the customer scope decision.',
  },
  {
    id: 'residency',
    label: 'Data residency accepted for the customer markets',
    evidence: 'Markets named on this onboarding case.',
  },
  {
    id: 'incident-notice',
    label: 'Incident notification path documented',
    evidence: 'Named path on the customer file.',
  },
  {
    id: 'sca-capability',
    label: 'PSD2 and SCA capability confirmed',
    evidence: 'Applies to in-scope customer payments.',
  },
  {
    id: 'regulatory-action',
    label: 'No unresolved regulatory action',
    evidence: 'Reviewer marks the customer file clear.',
  },
] as const;

export type SecurityChecklistId = (typeof SECURITY_CHECKLIST)[number]['id'];
export type OnboardingStage = 'security_review' | 'implementation_scheduling';
export type NoticeDelivery = 'automated' | 'operational_fallback';
export type NoticeAudience = 'implementation_contact' | 'product_operations';

export interface SecurityChecklistItem {
  id: SecurityChecklistId;
  label: string;
  evidence: string;
  mandatory: true;
  complete: boolean;
}

export interface ImplementationContact {
  name: string;
  role: string;
  channelRef: string;
}

export interface SecuritySignOff {
  approverName: string;
  approverRole: string;
  signedAt: string;
}

export interface SecurityApproval extends SecuritySignOff {
  planRef: typeof ONBOARDING_PLAN_REF;
  planVersion: typeof ONBOARDING_PLAN_VERSION;
}

export interface ImplementationSchedule {
  openedAt: string;
  trigger: 'security_checklist_approved';
  planApprovalOpens: string;
  planApprovalDue: string;
  environmentConfigOpens: string;
  environmentConfigDue: string;
}

export interface HandoffNotification {
  id: string;
  audience: NoticeAudience;
  recipientLabel: string;
  channelRef: string;
  recordedAt: string;
  dueAt: string | null;
  delivery: NoticeDelivery;
  summary: string;
}

export interface FallbackRecord {
  policyRef: typeof FALLBACK_POLICY.policyRef;
  policyVersion: typeof FALLBACK_POLICY.policyVersion;
  approvedBy: typeof FALLBACK_POLICY.approvedBy;
  reviewedWith: typeof FALLBACK_POLICY.reviewedWith;
  approvedAt: typeof FALLBACK_POLICY.approvedAt;
  reason: 'notify_channel_unavailable';
  manualQueueRef: string;
  implementationContactDueAt: string;
  productOperationsDueAt: string;
}

export interface OnboardingCase {
  id: string;
  customerName: string;
  planRef: typeof ONBOARDING_PLAN_REF;
  planVersion: typeof ONBOARDING_PLAN_VERSION;
  stage: OnboardingStage;
  checklist: SecurityChecklistItem[];
  implementationContact: ImplementationContact;
  securityApproval: SecurityApproval | null;
  schedule: ImplementationSchedule | null;
  notifications: HandoffNotification[];
  fallback: FallbackRecord | null;
}

export interface HandoffOptions {
  notifyChannelAvailable: boolean;
}

export type HandoffResult =
  { ok: true; onboarding: OnboardingCase } | { ok: false; errors: string[] };

const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const CONTACT_CHANNEL = /^contact:\/\/[a-z0-9-]+\/[a-z0-9-]+$/;
const CASE_ID = /^[A-Z0-9-]{4,40}$/;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatPlanDate(isoDate: string): string {
  if (!isCalendarDate(isoDate)) return isoDate;
  const [, month, day] = isoDate.split('-');
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${isoDate.slice(0, 4)}`;
}

export function formatPlanInstant(isoInstant: string): string {
  return `${formatPlanDate(isoInstant.slice(0, 10))}, ${isoInstant.slice(11, 16)} UTC`;
}

export function createSeedCase(): OnboardingCase {
  return {
    id: 'ONB-1842',
    customerName: 'Harbour & Pine Markets',
    planRef: ONBOARDING_PLAN_REF,
    planVersion: ONBOARDING_PLAN_VERSION,
    stage: 'security_review',
    checklist: SECURITY_CHECKLIST.map((item) => ({
      id: item.id,
      label: item.label,
      evidence: item.evidence,
      mandatory: true,
      complete: false,
    })),
    implementationContact: {
      name: 'Priya Shah',
      role: 'Implementation contact',
      channelRef: 'contact://harbour-pine/implementation',
    },
    securityApproval: null,
    schedule: null,
    notifications: [],
    fallback: null,
  };
}

/**
 * Step 3 sign-off is the only trigger into steps 4 and 5.
 * A complete checklist and a Trust & Safety sign-off open the implementation
 * schedule and record notices for the implementation contact and Product Operations.
 * An unavailable notify channel still opens the schedule and applies MER-1-HANDOFF-FB.
 * The input case is left unchanged.
 */
export function approveSecurityChecklist(
  onboarding: OnboardingCase,
  signOff: SecuritySignOff,
  options: HandoffOptions,
): HandoffResult {
  if (onboarding.securityApproval) {
    if (isSameSignOff(onboarding, signOff)) {
      return { ok: true, onboarding: structuredClone(onboarding) };
    }
    return { ok: false, errors: ['Security review is already signed off'] };
  }

  if (onboarding.stage !== 'security_review') {
    return {
      ok: false,
      errors: ['Handoff is only available during legal and security review'],
    };
  }

  const errors = collectSignOffErrors(onboarding, signOff, options);
  if (errors.length > 0) return { ok: false, errors };

  const signedAt = signOff.signedAt;
  const signedDate = signedAt.slice(0, 10);
  const planApprovalOpens = addBusinessDays(signedDate, 1);
  const planApprovalDue = addBusinessDays(signedDate, 2);
  const environmentConfigOpens = addBusinessDays(planApprovalDue, 1);
  const environmentConfigDue = addBusinessDays(signedDate, 5);
  const delivery: NoticeDelivery = options.notifyChannelAvailable
    ? 'automated'
    : 'operational_fallback';
  const contactDueAt = options.notifyChannelAvailable
    ? null
    : addBusinessHours(signedAt, FALLBACK_POLICY.implementationContactBusinessHours);
  const operationsDueAt = options.notifyChannelAvailable
    ? null
    : `${addBusinessDays(signedDate, FALLBACK_POLICY.productOperationsBusinessDays)}T17:00:00.000Z`;

  const schedule: ImplementationSchedule = {
    openedAt: signedAt,
    trigger: 'security_checklist_approved',
    planApprovalOpens,
    planApprovalDue,
    environmentConfigOpens,
    environmentConfigDue,
  };

  const contact = onboarding.implementationContact;
  const notifications: HandoffNotification[] = [
    {
      id: `notif:${onboarding.id}:implementation_contact`,
      audience: 'implementation_contact',
      recipientLabel: contact.name,
      channelRef: contact.channelRef,
      recordedAt: signedAt,
      dueAt: contactDueAt,
      delivery,
      summary: contactSummary(contact.name, delivery, signedAt, contactDueAt, schedule),
    },
    {
      id: `notif:${onboarding.id}:product_operations`,
      audience: 'product_operations',
      recipientLabel: PRODUCT_OPERATIONS_LABEL,
      channelRef: PRODUCT_OPERATIONS_CHANNEL,
      recordedAt: signedAt,
      dueAt: operationsDueAt,
      delivery,
      summary: operationsSummary(delivery, signedAt, operationsDueAt, schedule),
    },
  ];

  const fallback: FallbackRecord | null = options.notifyChannelAvailable
    ? null
    : {
        policyRef: FALLBACK_POLICY.policyRef,
        policyVersion: FALLBACK_POLICY.policyVersion,
        approvedBy: FALLBACK_POLICY.approvedBy,
        reviewedWith: FALLBACK_POLICY.reviewedWith,
        approvedAt: FALLBACK_POLICY.approvedAt,
        reason: 'notify_channel_unavailable',
        manualQueueRef: `${PRODUCT_OPERATIONS_CHANNEL}/${onboarding.id}`,
        implementationContactDueAt: contactDueAt!,
        productOperationsDueAt: operationsDueAt!,
      };

  return {
    ok: true,
    onboarding: {
      id: onboarding.id,
      customerName: onboarding.customerName,
      planRef: onboarding.planRef,
      planVersion: onboarding.planVersion,
      stage: 'implementation_scheduling',
      checklist: onboarding.checklist.map((item) => ({ ...item })),
      implementationContact: { ...contact },
      securityApproval: {
        approverName: signOff.approverName.trim(),
        approverRole: signOff.approverRole,
        signedAt,
        planRef: ONBOARDING_PLAN_REF,
        planVersion: ONBOARDING_PLAN_VERSION,
      },
      schedule,
      notifications,
      fallback,
    },
  };
}

export function addBusinessDays(isoDate: string, days: number): string {
  if (!isCalendarDate(isoDate)) throw new Error(`Invalid calendar date: ${isoDate}`);
  if (!Number.isInteger(days) || days <= 0 || days > 30) {
    throw new Error('Business days must be a positive whole number up to 30');
  }
  let cursor = isoDate;
  let remaining = days;
  while (remaining > 0) {
    cursor = nextCalendarDate(cursor);
    if (isWeekdayDate(cursor)) remaining -= 1;
  }
  return cursor;
}

export function addBusinessHours(isoInstant: string, hours: number): string {
  if (!Number.isInteger(hours) || hours <= 0 || hours > 40) {
    throw new Error('Business hours must be a positive whole number up to 40');
  }
  const parsed = parseInstant(isoInstant);
  if (!parsed) throw new Error(`Invalid UTC instant: ${isoInstant}`);
  let cursor = moveToOpenWindow(parsed);
  let remaining = hours * 3_600_000;
  while (remaining > 0) {
    const available = windowEnd(cursor).getTime() - cursor.getTime();
    if (available <= 0) {
      cursor = moveToOpenWindow(windowEnd(cursor));
      continue;
    }
    if (remaining <= available) return new Date(cursor.getTime() + remaining).toISOString();
    remaining -= available;
    cursor = moveToOpenWindow(windowEnd(cursor));
  }
  return cursor.toISOString();
}

function collectSignOffErrors(
  onboarding: OnboardingCase,
  signOff: SecuritySignOff,
  options: HandoffOptions,
): string[] {
  const errors: string[] = [];
  if (
    onboarding.planRef !== ONBOARDING_PLAN_REF ||
    onboarding.planVersion !== ONBOARDING_PLAN_VERSION
  ) {
    errors.push('Case is not on customer onboarding plan MER-1 v2.1');
  }
  if (!CASE_ID.test(onboarding.id)) errors.push('Onboarding case id is invalid');
  if (!onboarding.customerName.trim()) errors.push('Customer name is required');

  const contact = onboarding.implementationContact;
  if (!contact?.name?.trim()) errors.push('Implementation contact name is required');
  if (!CONTACT_CHANNEL.test(contact?.channelRef ?? '')) {
    errors.push('Implementation contact needs a contact:// channel reference');
  }

  const expected = SECURITY_CHECKLIST;
  const sameShape =
    onboarding.checklist.length === expected.length &&
    expected.every((item, index) => {
      const actual = onboarding.checklist[index];
      return (
        actual &&
        actual.id === item.id &&
        actual.label === item.label &&
        actual.evidence === item.evidence &&
        actual.mandatory === true
      );
    });
  if (!sameShape) {
    errors.push('Security checklist does not match plan MER-1 v2.1');
  } else {
    for (const item of onboarding.checklist) {
      if (!item.complete) errors.push(`Complete checklist item: ${item.label}`);
    }
  }

  const approverName = (signOff.approverName ?? '').trim();
  if (!approverName || !/\p{L}/u.test(approverName)) errors.push('Approver name is required');
  else if (approverName.length > 80) errors.push('Approver name is too long');
  else if (approverName.includes('@')) {
    errors.push('Approver name must be a name, not an email address');
  }
  if (signOff.approverRole !== SECURITY_APPROVER_ROLE) {
    errors.push('Security sign-off must be recorded by Trust & Safety');
  }
  if (!parseInstant(signOff.signedAt)) errors.push('Sign-off time must be a UTC timestamp');
  if (typeof options?.notifyChannelAvailable !== 'boolean') {
    errors.push('Notification channel must be marked available or unavailable');
  }
  return errors;
}

function isSameSignOff(onboarding: OnboardingCase, signOff: SecuritySignOff): boolean {
  const approval = onboarding.securityApproval;
  if (!approval) return false;
  return (
    approval.approverName === signOff.approverName.trim() &&
    approval.approverRole === signOff.approverRole &&
    approval.signedAt === signOff.signedAt &&
    onboarding.checklist.every((item) => item.complete)
  );
}

function contactSummary(
  name: string,
  delivery: NoticeDelivery,
  recordedAt: string,
  dueAt: string | null,
  schedule: ImplementationSchedule,
): string {
  const window = `Implementation plan approval opens ${formatPlanDate(schedule.planApprovalOpens)} and is due ${formatPlanDate(schedule.planApprovalDue)}.`;
  if (delivery === 'automated') {
    return `${name} (implementation contact) was notified automatically at ${formatPlanInstant(recordedAt)}. ${window}`;
  }
  return `${name} (implementation contact) is queued for manual notice by ${formatPlanInstant(dueAt ?? '')} (${FALLBACK_POLICY.implementationContactBusinessHours} business hours). ${window}`;
}

function operationsSummary(
  delivery: NoticeDelivery,
  recordedAt: string,
  dueAt: string | null,
  schedule: ImplementationSchedule,
): string {
  const window = `Environment configuration opens ${formatPlanDate(schedule.environmentConfigOpens)} and is due ${formatPlanDate(schedule.environmentConfigDue)}.`;
  if (delivery === 'automated') {
    return `${PRODUCT_OPERATIONS_LABEL} was notified automatically at ${formatPlanInstant(recordedAt)}. ${window}`;
  }
  return `${PRODUCT_OPERATIONS_LABEL} acknowledges the schedule by manual notice due ${formatPlanInstant(dueAt ?? '')} (next business day). ${window}`;
}

function parseInstant(value: string): Date | null {
  if (!INSTANT.test(value)) return null;
  if (!isCalendarDate(value.slice(0, 10))) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) return null;
  return date;
}

function nextCalendarDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function isWeekdayDate(isoDate: string): boolean {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return day !== 0 && day !== 6;
}

function millisOfDay(date: Date): number {
  return (
    date.getUTCHours() * 3_600_000 +
    date.getUTCMinutes() * 60_000 +
    date.getUTCSeconds() * 1_000 +
    date.getUTCMilliseconds()
  );
}

function moveToOpenWindow(date: Date): Date {
  const weekday = date.getUTCDay() !== 0 && date.getUTCDay() !== 6;
  const millis = millisOfDay(date);
  if (!weekday || millis >= BUSINESS_END_MS) {
    const next = nextWeekday(date);
    return new Date(
      Date.UTC(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate(), 9, 0, 0, 0),
    );
  }
  if (millis < BUSINESS_START_MS) {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 9, 0, 0, 0),
    );
  }
  return date;
}

function nextWeekday(date: Date): Date {
  const cursor = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  do {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  } while (cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6);
  return cursor;
}

function windowEnd(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 17, 0, 0, 0),
  );
}
