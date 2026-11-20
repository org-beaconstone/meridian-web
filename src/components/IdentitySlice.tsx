import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import SectionMessage from '@atlaskit/section-message';
import {
  IDENTITY_SLICE,
  IDENTITY_WORKFLOW,
  LATER_THREADS,
  evaluateRelease,
  formatSliceDate,
  releaseHeadline,
  requestSavingsOpening,
  requestThread,
  traceSummary,
} from '../domain/identity-slice';
import Dialog from './Dialog';

export default function IdentitySlice({
  onClose,
  onBack,
}: {
  onClose: () => void;
  onBack: () => void;
}) {
  const assessment = evaluateRelease(IDENTITY_SLICE);
  const { timeline } = IDENTITY_SLICE;
  const opening = requestSavingsOpening(IDENTITY_SLICE, false);
  const verifiedOpening = requestSavingsOpening(IDENTITY_SLICE, true);
  const funding = requestThread('funding');

  return (
    <Dialog title="Identity slice" onClose={onClose}>
      <p>
        <Lozenge appearance={assessment.productionClaim ? 'success' : 'inprogress'}>
          {releaseHeadline(IDENTITY_SLICE)}
        </Lozenge>
      </p>
      <p>
        {IDENTITY_SLICE.accountableTeam} coordinates this batch. The identity adapter date is{' '}
        {formatSliceDate(timeline.identityAdapterCurrent)}, moved from{' '}
        {formatSliceDate(timeline.identityAdapterPrevious)}. Integration testing is planned from{' '}
        {formatSliceDate(timeline.integrationTestingStart)}. The pilot forecast is{' '}
        {formatSliceDate(timeline.pilotForecast)}.
      </p>
      <SectionMessage
        title={assessment.productionClaim ? 'Release checks complete' : 'Production claim withheld'}
      >
        <p>{opening.summary}</p>
        <p>{verifiedOpening.summary}</p>
        <p>{funding.summary}</p>
      </SectionMessage>
      <section className="slice-block" aria-labelledby="slice-workflow">
        <h3 id="slice-workflow">Identity workflow</h3>
        <ol className="slice-steps">
          {IDENTITY_WORKFLOW.map((step) => (
            <li key={step.id}>{step.label}</li>
          ))}
        </ol>
      </section>
      <dl className="detail-list">
        <div>
          <dt>Mobile dependency</dt>
          <dd>{IDENTITY_SLICE.mobile.status === 'confirmed' ? 'Confirmed' : 'Open'}</dd>
        </div>
        <div>
          <dt>Integration evidence</dt>
          <dd>{assessment.integrationReady ? 'Confirmed' : 'Unconfirmed'}</dd>
        </div>
        <div>
          <dt>Traceability</dt>
          <dd>{traceSummary(IDENTITY_SLICE)}</dd>
        </div>
      </dl>
      <section className="slice-block" aria-labelledby="slice-later">
        <h3 id="slice-later">Later batches</h3>
        <ul className="slice-list">
          {LATER_THREADS.map((thread) => (
            <li key={thread.id}>
              <span>{thread.label}</span>
              <span className="slice-status">Later batch</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="slice-block" aria-labelledby="slice-checks">
        <h3 id="slice-checks">Release checklist</h3>
        <ul className="slice-list">
          {assessment.checks.map((check) => (
            <li key={check.id}>
              <span>{check.label}</span>
              <span className="slice-status">
                {check.state === 'done' ? 'Done' : check.state === 'open' ? 'Open' : 'Inconsistent'}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <div className="dialog-actions">
        <Button onClick={onBack}>Back to account</Button>
      </div>
    </Dialog>
  );
}
