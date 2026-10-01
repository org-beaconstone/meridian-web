import { useId, useState, type KeyboardEvent } from 'react';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import SectionMessage from '@atlaskit/section-message';
import Textfield from '@atlaskit/textfield';
import {
  BATTLE_CARD_CITATION,
  CASE_STUDIES,
  COMPETITOR_DEFAULTS,
  IMPORT_COST_PER_BOARD_CENTS,
  PUBLISHED_LIST_PRICES,
  SALES_PLAYBOOK_RULE,
  SALESFORCE_OUT_OF_SCOPE,
  calculateDisplacement,
  formatUsd,
  isCompetitorId,
  parseDisplacement,
  usdInputFromCents,
  type CompetitorId,
} from '../domain/roi';

type RoiTab = 'calculator' | 'notes' | 'cases';

const TABS: { id: RoiTab; label: string }[] = [
  { id: 'calculator', label: 'Calculator' },
  { id: 'notes', label: 'Notes' },
  { id: 'cases', label: 'Case studies' },
];

export default function RoiToolkit() {
  const baseId = useId();
  const [tab, setTab] = useState<RoiTab>('calculator');
  const [competitor, setCompetitor] = useState<CompetitorId>('miro');
  const [seats, setSeats] = useState('');
  const [pricePerSeat, setPricePerSeat] = useState(
    usdInputFromCents(COMPETITOR_DEFAULTS.miro.monthlyPriceCents),
  );
  const [boards, setBoards] = useState('0');
  const [discoveryConfirmed, setDiscoveryConfirmed] = useState(false);

  const selected = COMPETITOR_DEFAULTS[competitor];
  const parsed = parseDisplacement({ competitor, seats, pricePerSeat, boards });
  const visibleErrors = parsed.ok
    ? []
    : seats.trim() === ''
      ? parsed.errors.filter((error) => error !== 'Seats is required')
      : parsed.errors;
  const seatsInvalid = visibleErrors.some((error) => error.startsWith('Seats'));
  const priceInvalid = visibleErrors.some((error) => error.startsWith('Price per seat'));
  const boardsInvalid = visibleErrors.some((error) => error.startsWith('Boards'));

  function focusTab(next: RoiTab) {
    setTab(next);
    requestAnimationFrame(() => document.getElementById(`${baseId}-tab-${next}`)?.focus());
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = TABS.findIndex((item) => item.id === tab);
    if (event.key === 'Home') {
      event.preventDefault();
      focusTab(TABS[0].id);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      focusTab(TABS[TABS.length - 1].id);
      return;
    }
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    focusTab(TABS[(index + delta + TABS.length) % TABS.length].id);
  }

  function selectCompetitor(value: string) {
    if (!isCompetitorId(value)) return;
    setCompetitor(value);
    setPricePerSeat(usdInputFromCents(COMPETITOR_DEFAULTS[value].monthlyPriceCents));
    setDiscoveryConfirmed(false);
  }

  function markDraft() {
    setDiscoveryConfirmed(false);
  }

  return (
    <section className="panel roi-panel" aria-labelledby="roi-heading">
      <div className="section-heading">
        <div>
          <h2 id="roi-heading">ROI toolkit</h2>
          <p>
            Titan value stays in the case studies. This calculator adds competitor tool, seats,
            price per seat, and boards to import.
          </p>
        </div>
        <Lozenge appearance="moved">Sales draft</Lozenge>
      </div>

      <div
        className="roi-tabs"
        role="tablist"
        aria-label="ROI toolkit sections"
        aria-orientation="horizontal"
        onKeyDown={onTabKeyDown}
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            className={`roi-tab ${tab === item.id ? 'active' : ''}`}
            id={`${baseId}-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            aria-controls={`${baseId}-panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'calculator' && (
        <div
          role="tabpanel"
          id={`${baseId}-panel-calculator`}
          aria-labelledby={`${baseId}-tab-calculator`}
          className="roi-calculator"
        >
          <SectionMessage appearance="warning" title={SALES_PLAYBOOK_RULE}>
            <p>
              Seats, price per seat, and boards come from discovery. The number below is a planning
              draft until those figures are confirmed. {SALESFORCE_OUT_OF_SCOPE}
            </p>
          </SectionMessage>

          <div className="roi-form">
            <div>
              <label className="field-label" htmlFor="competitor-tool">
                Competitor tool
              </label>
              <select
                id="competitor-tool"
                value={competitor}
                onChange={(event) => selectCompetitor(event.target.value)}
              >
                <option value="miro">Miro</option>
                <option value="mural">Mural</option>
              </select>
              <small>
                Default price is the published {selected.tier} list price,{' '}
                {formatUsd(selected.monthlyPriceCents)} per seat per month.
              </small>
            </div>
            <div className="field-row">
              <div>
                <label className="field-label" htmlFor="roi-seats">
                  Seats
                </label>
                <Textfield
                  id="roi-seats"
                  value={seats}
                  inputMode="numeric"
                  placeholder="From discovery"
                  maxLength={7}
                  isInvalid={seatsInvalid}
                  onChange={(event) => {
                    setSeats(event.currentTarget.value);
                    markDraft();
                  }}
                />
                <small>Paid competitor seats the customer would stop buying.</small>
              </div>
              <div>
                <label className="field-label" htmlFor="roi-price">
                  Price per seat (USD per month)
                </label>
                <Textfield
                  id="roi-price"
                  value={pricePerSeat}
                  inputMode="decimal"
                  placeholder="0.00"
                  maxLength={12}
                  isInvalid={priceInvalid}
                  onChange={(event) => {
                    setPricePerSeat(event.currentTarget.value);
                    markDraft();
                  }}
                  aria-describedby="roi-price-help"
                />
                <small id="roi-price-help">
                  Prefilled from the published list price because the {BATTLE_CARD_CITATION.name}{' '}
                  was not readable here. Replace it with the discovered price.
                </small>
              </div>
            </div>
            <div className="field-row">
              <div>
                <label className="field-label" htmlFor="roi-boards">
                  Boards to import
                </label>
                <Textfield
                  id="roi-boards"
                  value={boards}
                  inputMode="numeric"
                  placeholder="0"
                  maxLength={7}
                  isInvalid={boardsInvalid}
                  onChange={(event) => {
                    setBoards(event.currentTarget.value);
                    markDraft();
                  }}
                />
                <small>
                  Year 1 subtracts {formatUsd(IMPORT_COST_PER_BOARD_CENTS)} per board, an
                  illustrative import rate from the notes tab.
                </small>
              </div>
              <div className="roi-reset">
                <Button
                  appearance="subtle"
                  onClick={() => {
                    setPricePerSeat(usdInputFromCents(selected.monthlyPriceCents));
                    markDraft();
                  }}
                >
                  Reset to published list price
                </Button>
              </div>
            </div>
          </div>

          {visibleErrors.length > 0 && (
            <div className="message" role="alert">
              <SectionMessage appearance="error" title="Check the discovery inputs">
                <ul>
                  {visibleErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </SectionMessage>
            </div>
          )}

          {!parsed.ok && visibleErrors.length === 0 && (
            <p className="roi-prompt">Enter seats from discovery to calculate annual savings.</p>
          )}

          {parsed.ok && (
            <div className="roi-result" aria-live="polite" data-testid="annual-savings">
              <div className="roi-result-label">
                <span>Annual savings, year 1</span>
                <Lozenge appearance={discoveryConfirmed ? 'success' : 'default'}>
                  {discoveryConfirmed ? 'Discovery confirmed' : 'Not a quote'}
                </Lozenge>
              </div>
              <strong>{formatUsd(parsed.result.annualSavingsCents)}</strong>
              <dl>
                <div>
                  <dt>Competitor subscription avoided</dt>
                  <dd>{formatUsd(parsed.result.annualSubscriptionCents)}</dd>
                </div>
                <div>
                  <dt>Board import, one time</dt>
                  <dd>{formatUsd(parsed.result.importCostCents)}</dd>
                </div>
                <div>
                  <dt>Recurring savings after year 1</dt>
                  <dd>{formatUsd(parsed.result.recurringSavingsCents)}</dd>
                </div>
              </dl>
              <p>
                {parsed.result.seats.toLocaleString('en-US')} {selected.name} seats ×{' '}
                {formatUsd(parsed.result.monthlyPriceCents)} × 12 −{' '}
                {parsed.result.boardsToImport.toLocaleString('en-US')} boards ×{' '}
                {formatUsd(IMPORT_COST_PER_BOARD_CENTS)}. Whiteboard’s incremental license is
                modeled as $0.00 for a customer who already has it.
              </p>
              {parsed.result.annualSavingsCents < 0 && (
                <p>
                  The one-time import cost is larger than the subscription avoided in year 1.
                  Recurring savings after year 1 leave that import cost out.
                </p>
              )}
              <label className="roi-confirm">
                <input
                  type="checkbox"
                  checked={discoveryConfirmed}
                  onChange={(event) => setDiscoveryConfirmed(event.target.checked)}
                />
                Discovery confirmed: the customer provided seats, price per seat, and boards.
              </label>
            </div>
          )}
        </div>
      )}

      {tab === 'notes' && (
        <div
          role="tabpanel"
          id={`${baseId}-panel-notes`}
          aria-labelledby={`${baseId}-tab-notes`}
          className="roi-notes"
        >
          <SectionMessage appearance="information" title={BATTLE_CARD_CITATION.name}>
            <p>
              Checked {BATTLE_CARD_CITATION.checkedOn} on {BATTLE_CARD_CITATION.host}.{' '}
              {BATTLE_CARD_CITATION.finding}
            </p>
          </SectionMessage>
          <h3>Default competitor prices</h3>
          <p>
            AJ-1 asks for defaults sourced from the battle card ticket and cited here. That ticket
            could not be read, so the calculator prefills the published Business list price for the
            selected tool. Retrieved {COMPETITOR_DEFAULTS.miro.retrievedOn}. Enterprise prices are
            custom on both vendors and stay blank.
          </p>
          <table>
            <caption>Published list prices cited in place of the battle card ticket</caption>
            <thead>
              <tr>
                <th scope="col">Competitor tool</th>
                <th scope="col">Tier</th>
                <th scope="col">Price per seat / month</th>
                <th scope="col">Used as default</th>
                <th scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              {PUBLISHED_LIST_PRICES.map((price) => (
                <tr key={`${price.tool}-${price.tier}`}>
                  <td>{price.tool}</td>
                  <td>{price.tier}</td>
                  <td>{formatUsd(price.monthlyPriceCents)}</td>
                  <td>{price.isDefault ? 'Yes' : 'No'}</td>
                  <td>
                    <a href={price.sourceUrl}>{price.sourceUrl}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>Annual savings</h3>
          <p>
            Year-1 annual savings = seats × price per seat per month × 12 − boards to import ×{' '}
            {formatUsd(IMPORT_COST_PER_BOARD_CENTS)}. The {formatUsd(IMPORT_COST_PER_BOARD_CENTS)}{' '}
            board rate is an illustrative planning assumption, not a battle-card price and not a
            services quote. Recurring savings after year 1 omit that import cost. Money is stored as
            integer USD cents.
          </p>
          <h3>How to use it</h3>
          <p>
            {SALES_PLAYBOOK_RULE} The earlier calculator quantified Titan value only (Mitch Davis,
            ETA 28 May). These inputs cover the whiteboard motion: displacing Miro or Mural seats.{' '}
            {SALESFORCE_OUT_OF_SCOPE}
          </p>
        </div>
      )}

      {tab === 'cases' && (
        <div
          role="tabpanel"
          id={`${baseId}-panel-cases`}
          aria-labelledby={`${baseId}-tab-cases`}
          className="roi-cases"
        >
          <SectionMessage appearance="warning" title="Illustrative toolkit">
            <p>
              The Q3 Planning Offsite case studies are not in this repository. These{' '}
              {CASE_STUDIES.length} write-ups are illustrative stand-ins. One of them is a
              whiteboard displacement story. None of them is verified customer evidence.
            </p>
          </SectionMessage>
          <div className="case-list">
            {CASE_STUDIES.map((study) => {
              const savings = study.displacement ? calculateDisplacement(study.displacement) : null;
              return (
                <article key={study.id} aria-labelledby={`case-${study.id}`}>
                  <div className="case-kicker">
                    <Lozenge appearance="inprogress">Illustrative</Lozenge>
                    {study.motion === 'whiteboard-displacement' && (
                      <Lozenge appearance="new">Whiteboard displacement</Lozenge>
                    )}
                    {study.motion === 'titan-value' && (
                      <Lozenge appearance="default">Titan value</Lozenge>
                    )}
                  </div>
                  <h3 id={`case-${study.id}`}>{study.title}</h3>
                  <p>{study.summary}</p>
                  {savings && (
                    <p className="case-savings">
                      Illustrative annual savings: {formatUsd(savings.annualSavingsCents)} from{' '}
                      {savings.seats} seats, {formatUsd(savings.monthlyPriceCents)} per seat per
                      month, and {savings.boardsToImport} boards to import.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
