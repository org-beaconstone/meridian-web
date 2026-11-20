// ABDAO-1 identity slice. Synthetic delivery record for a fictional savings journey.
// Recording this scope is not integration evidence and does not authorise a production claim.

import { isCalendarDate } from './model';

export const IDENTITY_SLICE_WORK_ITEM = 'ABDAO-1' as const;
export const IDENTITY_SLICE_TEAM = 'Digital Channels' as const;

export const IDENTITY_WORKFLOW = [
  { id: 'mobile-start', label: 'Mobile customer starts' },
  { id: 'identity-verification', label: 'Identity verification' },
  { id: 'outcome', label: 'Verification outcome' },
] as const;

export const LATER_THREADS = [
  { id: 'funding', label: 'Funding' },
  { id: 'fraud-controls', label: 'Fraud controls' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'security-operations', label: 'Security and operations tasks' },
  { id: 'rollout', label: 'Rollout decisions' },
] as const;

export type LaterThreadId = (typeof LATER_THREADS)[number]['id'];

export type CheckId =
  | 'scope'
  | 'later-threads'
  | 'timeline'
  | 'traceability'
  | 'mobile'
  | 'integration-evidence'
  | 'risk-review'
  | 'decision-review';

export interface SliceObjective {
  id: 'O1' | 'O2' | 'O3';
  statement: string;
  riskIds: string[];
  decisionIds: string[];
}

export interface SliceRisk {
  id: 'R1' | 'R2' | 'R3' | 'R4';
  statement: string;
  releaseReviewed: boolean;
}

export interface SliceDecision {
  id: 'D1' | 'D2' | 'D3' | 'D4' | 'D5';
  statement: string;
  releaseReviewed: boolean;
}

export interface SliceCheck {
  id: CheckId;
  label: string;
  complete: boolean;
}

export interface IdentitySliceTimeline {
  identityAdapterPrevious: string;
  identityAdapterCurrent: string;
  integrationTestingStart: string;
  pilotForecast: string;
}

export interface IdentitySliceRecord {
  workItem: typeof IDENTITY_SLICE_WORK_ITEM;
  accountableTeam: typeof IDENTITY_SLICE_TEAM;
  batchThreads: ['identity-verification'];
  laterThreads: LaterThreadId[];
  timeline: IdentitySliceTimeline;
  objectives: SliceObjective[];
  risks: SliceRisk[];
  decisions: SliceDecision[];
  checklist: SliceCheck[];
  mobile: { status: 'open' | 'confirmed'; summary: string };
  integration: { evidence: 'unconfirmed' | 'confirmed'; summary: string };
}

export interface VisibleCheck {
  id: CheckId;
  label: string;
  state: 'done' | 'open' | 'inconsistent';
}

export interface ReleaseAssessment {
  productionClaim: boolean;
  integrationReady: boolean;
  fundingPermitted: false;
  checks: VisibleCheck[];
  openChecks: string[];
  inconsistencies: string[];
}

const CHECK_LABELS: Record<CheckId, string> = {
  scope: 'Identity-verification thread recorded',
  'later-threads': 'Later threads recorded',
  timeline: 'Timeline recorded',
  traceability: 'Objectives traced to risks and decisions',
  mobile: 'Mobile dependency confirmed',
  'integration-evidence': 'Integration evidence confirmed',
  'risk-review': 'Risks reviewed',
  'decision-review': 'Decisions reviewed',
};

const CHECK_ORDER: readonly CheckId[] = [
  'scope',
  'later-threads',
  'timeline',
  'traceability',
  'mobile',
  'integration-evidence',
  'risk-review',
  'decision-review',
];

const LATER_IDS: readonly LaterThreadId[] = LATER_THREADS.map((thread) => thread.id);

export const IDENTITY_SLICE: IdentitySliceRecord = {
  workItem: IDENTITY_SLICE_WORK_ITEM,
  accountableTeam: IDENTITY_SLICE_TEAM,
  batchThreads: ['identity-verification'],
  laterThreads: [...LATER_IDS],
  timeline: {
    identityAdapterPrevious: '2026-11-20',
    identityAdapterCurrent: '2026-11-25',
    integrationTestingStart: '2026-11-26',
    pilotForecast: '2026-12-01',
  },
  objectives: [
    {
      id: 'O1',
      statement:
        'A mobile customer can start opening a savings account only after identity verification succeeds.',
      riskIds: ['R1', 'R2'],
      decisionIds: ['D1', 'D4'],
    },
    {
      id: 'O2',
      statement:
        'This batch covers the identity-verification workflow, the mobile dependency, integration readiness, and release checks.',
      riskIds: ['R2', 'R3'],
      decisionIds: ['D4', 'D5'],
    },
    {
      id: 'O3',
      statement:
        'A production claim waits for confirmed integration evidence, reviewed risks and decisions, and a completed release checklist.',
      riskIds: ['R1', 'R4'],
      decisionIds: ['D2', 'D3'],
    },
  ],
  risks: [
    {
      id: 'R1',
      statement:
        'The identity adapter date can be treated as confirmed integration evidence before testing has produced it.',
      releaseReviewed: false,
    },
    {
      id: 'R2',
      statement:
        'The mobile customer journey depends on a mobile client whose readiness is still open.',
      releaseReviewed: false,
    },
    {
      id: 'R3',
      statement:
        'Funding, fraud controls, notifications, security and operations tasks, or rollout decisions can be pulled into this batch.',
      releaseReviewed: false,
    },
    {
      id: 'R4',
      statement:
        'The pilot forecast can be presented as a production claim before the release checklist is complete.',
      releaseReviewed: false,
    },
  ],
  decisions: [
    {
      id: 'D1',
      statement: 'The identity adapter moves from 20 November 2026 to 25 November 2026.',
      releaseReviewed: false,
    },
    {
      id: 'D2',
      statement: 'Full integration testing begins on 26 November 2026.',
      releaseReviewed: false,
    },
    {
      id: 'D3',
      statement: 'The pilot forecast moves to 1 December 2026. Rollout remains a later decision.',
      releaseReviewed: false,
    },
    {
      id: 'D4',
      statement:
        'This batch is the identity-verification thread. Funding, fraud controls, notifications, security and operations tasks, and rollout decisions are later batches.',
      releaseReviewed: false,
    },
    {
      id: 'D5',
      statement: 'Digital Channels coordinates delivery and maintains the timeline.',
      releaseReviewed: false,
    },
  ],
  checklist: CHECK_ORDER.map((id) => ({
    id,
    label: CHECK_LABELS[id],
    complete:
      id === 'scope' || id === 'later-threads' || id === 'timeline' || id === 'traceability',
  })),
  mobile: {
    status: 'open',
    summary: 'A mobile customer starts this journey. The mobile client dependency is open.',
  },
  integration: {
    evidence: 'unconfirmed',
    summary:
      'Integration evidence is unconfirmed. Testing is planned to begin on 26 November 2026.',
  },
};

export function formatSliceDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function unique(ids: readonly string[]): boolean {
  return new Set(ids).size === ids.length;
}

function timelineProblem(timeline: IdentitySliceTimeline): string | null {
  const dates = [
    timeline.identityAdapterPrevious,
    timeline.identityAdapterCurrent,
    timeline.integrationTestingStart,
    timeline.pilotForecast,
  ];
  if (dates.some((date) => !isCalendarDate(date))) {
    return 'Timeline dates must be real calendar dates.';
  }
  const ordered = dates.every((date, index) => index === 0 || dates[index - 1] < date);
  if (!ordered)
    return 'Timeline dates must ascend from the previous adapter date to the pilot forecast.';
  return null;
}

function traceProblem(record: IdentitySliceRecord): string | null {
  if (!unique(record.objectives.map((item) => item.id))) return 'Objective ids must be unique.';
  if (!unique(record.risks.map((item) => item.id))) return 'Risk ids must be unique.';
  if (!unique(record.decisions.map((item) => item.id))) return 'Decision ids must be unique.';
  if (
    record.objectives.length === 0 ||
    record.risks.length === 0 ||
    record.decisions.length === 0
  ) {
    return 'Objectives, risks, and decisions must all be present.';
  }
  const riskIds = new Set(record.risks.map((item) => item.id));
  const decisionIds = new Set(record.decisions.map((item) => item.id));
  const usedRisks = new Set<string>();
  const usedDecisions = new Set<string>();
  for (const objective of record.objectives) {
    if (objective.riskIds.length === 0 || objective.decisionIds.length === 0) {
      return 'Each objective must link to a risk and a decision.';
    }
    if (!unique(objective.riskIds) || !unique(objective.decisionIds)) {
      return 'Each objective must link to a risk and a decision.';
    }
    for (const id of objective.riskIds) {
      if (!riskIds.has(id as SliceRisk['id'])) return 'An objective links to a missing risk.';
      usedRisks.add(id);
    }
    for (const id of objective.decisionIds) {
      if (!decisionIds.has(id as SliceDecision['id']))
        return 'An objective links to a missing decision.';
      usedDecisions.add(id);
    }
  }
  if (usedRisks.size !== record.risks.length || usedDecisions.size !== record.decisions.length) {
    return 'Each risk and decision must be linked from an objective.';
  }
  return null;
}

function fieldSatisfied(
  record: IdentitySliceRecord,
  id: CheckId,
): { ok: boolean; problem: string | null } {
  if (id === 'scope') {
    const ok = sameIds(record.batchThreads, ['identity-verification']);
    return { ok, problem: ok ? null : 'A later thread is recorded inside this batch.' };
  }
  if (id === 'later-threads') {
    const ok = sameIds(record.laterThreads, LATER_IDS);
    return { ok, problem: ok ? null : 'The later-thread list does not match this batch.' };
  }
  if (id === 'timeline') {
    const problem = timelineProblem(record.timeline);
    return { ok: problem === null, problem };
  }
  if (id === 'traceability') {
    const problem = traceProblem(record);
    return { ok: problem === null, problem };
  }
  if (id === 'mobile') return { ok: record.mobile.status === 'confirmed', problem: null };
  if (id === 'integration-evidence') {
    return { ok: record.integration.evidence === 'confirmed', problem: null };
  }
  if (id === 'risk-review') {
    return { ok: record.risks.every((risk) => risk.releaseReviewed), problem: null };
  }
  return { ok: record.decisions.every((decision) => decision.releaseReviewed), problem: null };
}

export function evaluateRelease(record: IdentitySliceRecord): ReleaseAssessment {
  const inconsistencies: string[] = [];
  const byId = new Map(record.checklist.map((item) => [item.id, item]));
  if (byId.size !== record.checklist.length || CHECK_ORDER.some((id) => !byId.has(id))) {
    inconsistencies.push('The release checklist must contain each check once.');
  }

  const checks: VisibleCheck[] = CHECK_ORDER.map((id) => {
    const item = byId.get(id);
    const label = item?.label || CHECK_LABELS[id];
    const field = fieldSatisfied(record, id);
    if (field.problem) inconsistencies.push(field.problem);
    if (!item) return { id, label, state: 'inconsistent' };
    if (item.label !== CHECK_LABELS[id])
      inconsistencies.push('A release check has an unknown label.');
    if (item.complete && !field.ok) {
      inconsistencies.push(`${label} is marked complete without the matching record.`);
      return { id, label, state: 'inconsistent' };
    }
    if (item.complete && field.ok) return { id, label, state: 'done' };
    return { id, label, state: 'open' };
  });

  const openChecks = checks.filter((check) => check.state !== 'done').map((check) => check.label);
  const productionClaim = openChecks.length === 0 && inconsistencies.length === 0;
  const integrationCheck = checks.find((check) => check.id === 'integration-evidence');
  return {
    productionClaim,
    integrationReady: integrationCheck?.state === 'done',
    fundingPermitted: false,
    checks,
    openChecks,
    inconsistencies,
  };
}

export function releaseHeadline(record: IdentitySliceRecord): string {
  return evaluateRelease(record).productionClaim ? 'Release ready' : 'Not release ready';
}

export function traceSummary(record: IdentitySliceRecord): string {
  const problem = traceProblem(record);
  if (problem) return problem;
  return `${record.objectives.length} objectives are linked to risks and decisions.`;
}

export function requestThread(thread: string): { accepted: boolean; summary: string } {
  if (thread === 'identity-verification') {
    return {
      accepted: true,
      summary: 'This batch: Identity verification. It does not open or fund an account.',
    };
  }
  const later = LATER_THREADS.find((item) => item.id === thread);
  if (later) return { accepted: false, summary: `${later.label} stays in a later batch.` };
  return { accepted: false, summary: 'That work stays outside this batch.' };
}

export function requestSavingsOpening(
  record: IdentitySliceRecord,
  identityVerified: boolean,
): { permitted: boolean; summary: string } {
  const assessment = evaluateRelease(record);
  if (assessment.inconsistencies.length > 0 || assessment.fundingPermitted) {
    return {
      permitted: false,
      summary:
        'The identity-slice record cannot authorise opening. The savings account stays closed.',
    };
  }
  if (!identityVerified) {
    return {
      permitted: false,
      summary: 'Identity verification has not succeeded. The savings account stays closed.',
    };
  }
  if (!assessment.productionClaim) {
    return {
      permitted: false,
      summary:
        'Identity verification succeeded for this check. Release checks are still open, so the savings account stays closed.',
    };
  }
  return {
    permitted: true,
    summary:
      'Identity verification succeeded and the release checks are complete. Savings-account opening can start. Funding stays in a later batch.',
  };
}
