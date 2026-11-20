import { describe, expect, it } from 'vitest';
import {
  IDENTITY_SLICE,
  IDENTITY_SLICE_TEAM,
  IDENTITY_WORKFLOW,
  LATER_THREADS,
  evaluateRelease,
  formatSliceDate,
  releaseHeadline,
  requestSavingsOpening,
  requestThread,
  traceSummary,
  type IdentitySliceRecord,
} from './identity-slice';

function readyRecord(): IdentitySliceRecord {
  const record = structuredClone(IDENTITY_SLICE);
  record.mobile.status = 'confirmed';
  record.integration.evidence = 'confirmed';
  record.risks.forEach((risk) => {
    risk.releaseReviewed = true;
  });
  record.decisions.forEach((decision) => {
    decision.releaseReviewed = true;
  });
  record.checklist.forEach((check) => {
    check.complete = true;
  });
  return record;
}

describe('identity slice delivery record', () => {
  it('records the slipped timeline and Digital Channels ownership', () => {
    expect(IDENTITY_SLICE.accountableTeam).toBe(IDENTITY_SLICE_TEAM);
    expect(IDENTITY_SLICE.accountableTeam).toBe('Digital Channels');
    expect(IDENTITY_SLICE.timeline).toEqual({
      identityAdapterPrevious: '2026-11-20',
      identityAdapterCurrent: '2026-11-25',
      integrationTestingStart: '2026-11-26',
      pilotForecast: '2026-12-01',
    });
    expect(formatSliceDate(IDENTITY_SLICE.timeline.identityAdapterCurrent)).toBe(
      '25 November 2026',
    );
    expect(formatSliceDate(IDENTITY_SLICE.timeline.integrationTestingStart)).toBe(
      '26 November 2026',
    );
    expect(formatSliceDate(IDENTITY_SLICE.timeline.pilotForecast)).toBe('1 December 2026');
  });

  it('keeps this batch to the identity-verification workflow', () => {
    expect(IDENTITY_SLICE.batchThreads).toEqual(['identity-verification']);
    expect(IDENTITY_WORKFLOW.map((step) => step.id)).toEqual([
      'mobile-start',
      'identity-verification',
      'outcome',
    ]);
    expect(LATER_THREADS.map((thread) => thread.id)).toEqual([
      'funding',
      'fraud-controls',
      'notifications',
      'security-operations',
      'rollout',
    ]);
    expect(requestThread('identity-verification')).toEqual({
      accepted: true,
      summary: 'This batch: Identity verification. It does not open or fund an account.',
    });
    for (const thread of LATER_THREADS) {
      expect(requestThread(thread.id)).toEqual({
        accepted: false,
        summary: `${thread.label} stays in a later batch.`,
      });
    }
    expect(requestThread('provider-selection').accepted).toBe(false);
  });

  it('traces every objective to risks and decisions', () => {
    expect(traceSummary(IDENTITY_SLICE)).toBe('3 objectives are linked to risks and decisions.');
    const riskIds = new Set(IDENTITY_SLICE.risks.map((risk) => risk.id));
    const decisionIds = new Set(IDENTITY_SLICE.decisions.map((decision) => decision.id));
    const usedRisks = new Set<string>();
    const usedDecisions = new Set<string>();
    for (const objective of IDENTITY_SLICE.objectives) {
      expect(objective.riskIds.length).toBeGreaterThan(0);
      expect(objective.decisionIds.length).toBeGreaterThan(0);
      objective.riskIds.forEach((id) => {
        expect(riskIds.has(id as (typeof IDENTITY_SLICE.risks)[number]['id'])).toBe(true);
        usedRisks.add(id);
      });
      objective.decisionIds.forEach((id) => {
        expect(decisionIds.has(id as (typeof IDENTITY_SLICE.decisions)[number]['id'])).toBe(true);
        usedDecisions.add(id);
      });
    }
    expect(usedRisks.size).toBe(IDENTITY_SLICE.risks.length);
    expect(usedDecisions.size).toBe(IDENTITY_SLICE.decisions.length);
  });

  it('withholds a production claim while release checks stay open', () => {
    const assessment = evaluateRelease(IDENTITY_SLICE);
    expect(releaseHeadline(IDENTITY_SLICE)).toBe('Not release ready');
    expect(assessment.productionClaim).toBe(false);
    expect(assessment.integrationReady).toBe(false);
    expect(assessment.fundingPermitted).toBe(false);
    expect(assessment.inconsistencies).toEqual([]);
    expect(assessment.openChecks).toEqual([
      'Mobile dependency confirmed',
      'Integration evidence confirmed',
      'Risks reviewed',
      'Decisions reviewed',
    ]);
    expect(
      assessment.checks.filter((check) => check.state === 'done').map((check) => check.id),
    ).toEqual(['scope', 'later-threads', 'timeline', 'traceability']);
    expect(requestSavingsOpening(IDENTITY_SLICE, false).permitted).toBe(false);
    expect(requestSavingsOpening(IDENTITY_SLICE, true)).toEqual({
      permitted: false,
      summary:
        'Identity verification succeeded for this check. Release checks are still open, so the savings account stays closed.',
    });
  });

  it('allows opening only after verification and a consistent completed checklist', () => {
    const ready = readyRecord();
    const assessment = evaluateRelease(ready);
    expect(assessment.productionClaim).toBe(true);
    expect(assessment.integrationReady).toBe(true);
    expect(assessment.fundingPermitted).toBe(false);
    expect(assessment.openChecks).toEqual([]);
    expect(requestSavingsOpening(ready, false).permitted).toBe(false);
    expect(requestSavingsOpening(ready, true)).toEqual({
      permitted: true,
      summary:
        'Identity verification succeeded and the release checks are complete. Savings-account opening can start. Funding stays in a later batch.',
    });
    expect(requestThread('funding').accepted).toBe(false);
  });

  it('fails closed when a checkbox overstates the record', () => {
    const record = structuredClone(IDENTITY_SLICE);
    record.checklist.forEach((check) => {
      check.complete = true;
    });
    const assessment = evaluateRelease(record);
    expect(assessment.productionClaim).toBe(false);
    expect(assessment.inconsistencies.length).toBeGreaterThan(0);
    expect(requestSavingsOpening(record, true).permitted).toBe(false);
  });

  it('rejects a later thread placed in this batch', () => {
    const record = structuredClone(IDENTITY_SLICE);
    record.batchThreads = [
      'identity-verification',
      'funding',
    ] as unknown as IdentitySliceRecord['batchThreads'];
    const assessment = evaluateRelease(record);
    expect(assessment.productionClaim).toBe(false);
    expect(assessment.inconsistencies).toContain('A later thread is recorded inside this batch.');
  });

  it('rejects a broken objective link and an impossible timeline', () => {
    const broken = structuredClone(IDENTITY_SLICE);
    broken.objectives[0].riskIds = ['R9'];
    expect(traceSummary(broken)).toBe('An objective links to a missing risk.');
    expect(evaluateRelease(broken).productionClaim).toBe(false);

    const dates = structuredClone(IDENTITY_SLICE);
    dates.timeline.pilotForecast = '2026-11-01';
    expect(evaluateRelease(dates).inconsistencies).toContain(
      'Timeline dates must ascend from the previous adapter date to the pilot forecast.',
    );

    const invalid = structuredClone(IDENTITY_SLICE);
    invalid.timeline.identityAdapterCurrent = '2026-02-31';
    expect(evaluateRelease(invalid).inconsistencies).toContain(
      'Timeline dates must be real calendar dates.',
    );
  });
});
