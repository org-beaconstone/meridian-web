import { useState } from 'react';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import SectionMessage from '@atlaskit/section-message';
import Textfield from '@atlaskit/textfield';
import {
  FALLBACK_POLICY,
  PRODUCT_OPERATIONS_LABEL,
  REHEARSAL_SIGNOFF_AT,
  SECURITY_APPROVER_ROLE,
  approveSecurityChecklist,
  createSeedCase,
  formatPlanDate,
  formatPlanInstant,
  type OnboardingCase,
} from '../domain/onboarding';

export function OnboardingHandoff() {
  const [onboarding, setOnboarding] = useState<OnboardingCase>(createSeedCase);
  const [approverName, setApproverName] = useState('Rowan Hale');
  const [channelAvailable, setChannelAvailable] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const signedOff = onboarding.securityApproval !== null;

  function toggleItem(id: OnboardingCase['checklist'][number]['id']) {
    if (signedOff) return;
    setOnboarding((current) => ({
      ...current,
      checklist: current.checklist.map((item) =>
        item.id === id ? { ...item, complete: !item.complete } : item,
      ),
    }));
    setErrors([]);
  }

  function recordSignOff() {
    const result = approveSecurityChecklist(
      onboarding,
      {
        approverName,
        approverRole: SECURITY_APPROVER_ROLE,
        signedAt: REHEARSAL_SIGNOFF_AT,
      },
      { notifyChannelAvailable: channelAvailable },
    );
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    setOnboarding(result.onboarding);
  }

  function rehearseAgain() {
    setOnboarding(createSeedCase());
    setApproverName('Rowan Hale');
    setChannelAvailable(true);
    setErrors([]);
  }

  const usingFallback = onboarding.fallback !== null;

  return (
    <div className="dashboard-grid">
      <div className="dashboard-main">
        <section className="panel" aria-labelledby="security-checklist-title">
          <div className="section-heading">
            <div>
              <h2 id="security-checklist-title">Legal and security review</h2>
              <p>Step 3 of plan MER-1 v2.1. Every item is required before sign-off.</p>
            </div>
            <Lozenge appearance={signedOff ? 'success' : 'inprogress'}>
              {signedOff ? 'Signed off' : 'In review'}
            </Lozenge>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!signedOff) recordSignOff();
            }}
          >
            <fieldset className="check-fieldset" disabled={signedOff}>
              <legend className="sr-only">Security checklist</legend>
              <ul className="check-list">
                {onboarding.checklist.map((item) => (
                  <li key={item.id} className="check-row">
                    <label htmlFor={item.id}>
                      <input
                        id={item.id}
                        type="checkbox"
                        checked={item.complete}
                        aria-describedby={`${item.id}-evidence`}
                        onChange={() => toggleItem(item.id)}
                      />
                      <span>{item.label}</span>
                    </label>
                    <small id={`${item.id}-evidence`}>{item.evidence}</small>
                  </li>
                ))}
              </ul>
            </fieldset>
            <div className="field-row">
              <div>
                <label className="field-label" htmlFor="approver-name">
                  Security reviewer
                </label>
                <Textfield
                  id="approver-name"
                  name="approver-name"
                  value={approverName}
                  maxLength={80}
                  isDisabled={signedOff}
                  onChange={(event) => setApproverName(event.currentTarget.value)}
                />
                <small>Role recorded as {SECURITY_APPROVER_ROLE}.</small>
              </div>
              <div>
                <label className="field-label" htmlFor="notify-channel">
                  Notify channel
                </label>
                <select
                  id="notify-channel"
                  value={channelAvailable ? 'automated' : 'fallback'}
                  disabled={signedOff}
                  onChange={(event) => setChannelAvailable(event.target.value === 'automated')}
                >
                  <option value="automated">Automated on sign-off</option>
                  <option value="fallback">Unavailable, operational fallback</option>
                </select>
                <small>
                  Rehearsal clock {formatPlanInstant(REHEARSAL_SIGNOFF_AT)}. An unavailable channel
                  uses {FALLBACK_POLICY.policyRef}.
                </small>
              </div>
            </div>
            {errors.length > 0 && (
              <div role="alert" className="message">
                <SectionMessage appearance="error" title="Security sign-off needs attention">
                  <ul className="handoff-errors">
                    {errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </SectionMessage>
              </div>
            )}
            <div className="handoff-actions">
              {signedOff ? (
                <Button type="button" onClick={rehearseAgain}>
                  Rehearse handoff again
                </Button>
              ) : (
                <Button type="submit" appearance="primary">
                  Record security sign-off
                </Button>
              )}
            </div>
          </form>
        </section>

        {onboarding.schedule && onboarding.securityApproval && (
          <section className="panel" aria-labelledby="schedule-title">
            <div className="section-heading">
              <div>
                <h2 id="schedule-title">Implementation schedule</h2>
                <p>Steps 4 and 5 opened from security checklist approval.</p>
              </div>
              <Lozenge appearance={usingFallback ? 'moved' : 'success'}>
                {usingFallback ? 'Operational fallback' : 'Automated'}
              </Lozenge>
            </div>
            <div role="status" className="message">
              <SectionMessage
                appearance={usingFallback ? 'warning' : 'success'}
                title={
                  usingFallback
                    ? 'Scheduling opened on the operational fallback'
                    : 'Scheduling opened'
                }
              >
                {onboarding.notifications.map((notice) => (
                  <p key={notice.id}>{notice.summary}</p>
                ))}
              </SectionMessage>
            </div>
            <dl className="detail-list">
              <div>
                <dt>Plan approval opens</dt>
                <dd>{formatPlanDate(onboarding.schedule.planApprovalOpens)}</dd>
              </div>
              <div>
                <dt>Plan approval due</dt>
                <dd>{formatPlanDate(onboarding.schedule.planApprovalDue)}</dd>
              </div>
              <div>
                <dt>Environment configuration opens</dt>
                <dd>{formatPlanDate(onboarding.schedule.environmentConfigOpens)}</dd>
              </div>
              <div>
                <dt>Environment configuration due</dt>
                <dd>{formatPlanDate(onboarding.schedule.environmentConfigDue)}</dd>
              </div>
              <div>
                <dt>Signed off by</dt>
                <dd>
                  {onboarding.securityApproval.approverName},{' '}
                  {onboarding.securityApproval.approverRole}
                </dd>
              </div>
            </dl>
            <div className="notification-list">
              {onboarding.notifications.map((notice) => (
                <article key={notice.id} className="notification-card">
                  <strong>{notice.recipientLabel}</strong>
                  <small>
                    {notice.dueAt ? `Due ${formatPlanInstant(notice.dueAt)}` : 'Sent with sign-off'}
                    {' · '}
                    {notice.channelRef}
                  </small>
                </article>
              ))}
            </div>
            {onboarding.fallback && (
              <p className="handoff-policy">
                {onboarding.fallback.policyRef} v{onboarding.fallback.policyVersion}, approved by{' '}
                {onboarding.fallback.approvedBy} on {formatPlanDate(onboarding.fallback.approvedAt)}{' '}
                and reviewed with {onboarding.fallback.reviewedWith}. Manual queue{' '}
                {onboarding.fallback.manualQueueRef}.
              </p>
            )}
          </section>
        )}
      </div>

      <aside className="dashboard-aside">
        <section className="panel" aria-labelledby="case-title">
          <div className="section-heading">
            <div>
              <h2 id="case-title">Onboarding case</h2>
              <p>
                {onboarding.planRef} v{onboarding.planVersion}
              </p>
            </div>
          </div>
          <dl className="detail-list">
            <div>
              <dt>Customer</dt>
              <dd>{onboarding.customerName}</dd>
            </div>
            <div>
              <dt>Case</dt>
              <dd>{onboarding.id}</dd>
            </div>
            <div>
              <dt>Stage</dt>
              <dd>{signedOff ? 'Implementation scheduling' : 'Legal and security review'}</dd>
            </div>
            <div>
              <dt>Implementation contact</dt>
              <dd>{onboarding.implementationContact.name}</dd>
            </div>
            <div>
              <dt>Operations queue</dt>
              <dd>{PRODUCT_OPERATIONS_LABEL}</dd>
            </div>
          </dl>
        </section>
        <section className="panel" aria-labelledby="fallback-title">
          <div className="section-heading">
            <div>
              <h2 id="fallback-title">Approved fallback</h2>
              <p>
                {FALLBACK_POLICY.policyRef} v{FALLBACK_POLICY.policyVersion}
              </p>
            </div>
          </div>
          <p>
            {FALLBACK_POLICY.approvedBy} approved this SLA on{' '}
            {formatPlanDate(FALLBACK_POLICY.approvedAt)}, reviewed with{' '}
            {FALLBACK_POLICY.reviewedWith}. It applies when the notify channel is unavailable. The
            schedule still opens from the security sign-off.
          </p>
          <dl className="detail-list">
            <div>
              <dt>Implementation contact</dt>
              <dd>{FALLBACK_POLICY.implementationContactBusinessHours} business hours</dd>
            </div>
            <div>
              <dt>Product Operations</dt>
              <dd>Next business day, 17:00 UTC</dd>
            </div>
          </dl>
        </section>
      </aside>
    </div>
  );
}
