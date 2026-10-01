import { useRef, useState, type FormEvent } from 'react';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import SectionMessage from '@atlaskit/section-message';
import Textfield from '@atlaskit/textfield';
import { Landmark } from 'lucide-react';
import {
  addEuropeanPlan,
  EUROPEAN_METHODS,
  europeanMethod,
  type EuropeanPaymentPlan,
} from '../domain/european-plans';
import { money } from '../domain/model';

export function EuropeanPlans({
  plans,
  storageWarning,
  onChange,
}: {
  plans: EuropeanPaymentPlan[];
  storageWarning: string | null;
  onChange: (plans: EuropeanPaymentPlan[]) => void;
}) {
  const [methodId, setMethodId] = useState<(typeof EUROPEAN_METHODS)[number]['id']>('sepa-credit');
  const [amount, setAmount] = useState('');
  const [payee, setPayee] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [savedId, setSavedId] = useState<string | null>(null);
  const planId = useRef(crypto.randomUUID());

  function savePlan(event: FormEvent) {
    event.preventDefault();
    const result = addEuropeanPlan(plans, { methodId, amount, payee, note }, planId.current);
    if (!result.ok) {
      setErrors([result.error]);
      setSavedId(null);
      return;
    }
    onChange(result.plans);
    planId.current = crypto.randomUUID();
    setAmount('');
    setNote('');
    setErrors([]);
    setSavedId(result.plan.id);
  }

  return (
    <section className="panel european-plans" aria-labelledby="european-plans-title">
      <div className="section-heading">
        <div>
          <h2 id="european-plans-title">European payment plans</h2>
          <p>Euro methods Meridian is preparing. A saved plan stays a draft.</p>
        </div>
        <Lozenge appearance="inprogress">Not live</Lozenge>
      </div>
      <SectionMessage appearance="information" title="No money moves from a plan">
        <p>
          Adyen and Worldpay are not cleared for these corridors, and no European provider is
          contracted. Saving a plan does not debit your balance.
        </p>
      </SectionMessage>
      {storageWarning && (
        <div className="message" role="status">
          <SectionMessage appearance="warning" title="Browser storage notice">
            <p>{storageWarning}</p>
          </SectionMessage>
        </div>
      )}
      {errors.length > 0 && (
        <div className="message" role="alert">
          <SectionMessage appearance="error" title="Plan not saved">
            <p>{errors.join('. ')}</p>
          </SectionMessage>
        </div>
      )}
      <form onSubmit={savePlan} noValidate>
        <div className="field-row">
          <div>
            <label className="field-label" htmlFor="european-payee">
              Who is this plan for?
            </label>
            <Textfield
              id="european-payee"
              name="european-payee"
              value={payee}
              maxLength={80}
              placeholder="Payee name"
              onChange={(event) => setPayee(event.currentTarget.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="european-amount">
              Amount (EUR)
            </label>
            <Textfield
              id="european-amount"
              name="european-amount"
              value={amount}
              inputMode="decimal"
              placeholder="0.00"
              maxLength={12}
              onChange={(event) => setAmount(event.currentTarget.value)}
              aria-describedby="european-amount-help"
            />
            <small id="european-amount-help">Maximum €10,000. Stored as euro cents.</small>
          </div>
        </div>
        <div className="field-row">
          <div>
            <label className="field-label" htmlFor="european-note">
              Plan reference <span className="muted">(optional)</span>
            </label>
            <Textfield
              id="european-note"
              name="european-note"
              value={note}
              maxLength={200}
              placeholder="What is this plan for?"
              onChange={(event) => setNote(event.currentTarget.value)}
            />
          </div>
        </div>
        <fieldset className="method-fieldset">
          <legend>Which European method is this plan for?</legend>
          <p>Local schemes only. None of these can take a payment yet.</p>
          {EUROPEAN_METHODS.map((method) => (
            <label
              key={method.id}
              className={`method-card ${methodId === method.id ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="european-method"
                value={method.id}
                checked={methodId === method.id}
                onChange={() => setMethodId(method.id)}
              />
              <span className="method-icon" aria-hidden="true">
                <Landmark size={22} />
              </span>
              <span className="method-copy">
                <strong>{method.name}</strong>
                <span>
                  {method.market} · {method.timing}
                </span>
              </span>
              <span className="method-status">
                <Lozenge appearance="inprogress">Planned</Lozenge>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="form-footer">
          <span>
            <Landmark size={14} aria-hidden="true" />
            Draft only. No provider is contacted.
          </span>
          <Button type="submit" appearance="primary">
            Save draft plan
          </Button>
        </div>
      </form>
      {savedId && (
        <p className="plan-saved" role="status">
          Draft plan saved. Your available balance is unchanged.
        </p>
      )}
      {plans.length === 0 ? (
        <p className="muted plan-empty">No European plans in this browser yet.</p>
      ) : (
        <ul className="plan-list" aria-label="Saved European plans">
          {plans.map((plan) => {
            const method = europeanMethod(plan.methodId);
            return (
              <li key={plan.id} className="plan-row">
                <span>
                  <strong>{plan.payee}</strong>
                  <span>
                    {method.name} · {method.market}
                    {plan.note ? ` · ${plan.note}` : ''}
                  </span>
                </span>
                <span className="plan-amount">
                  <strong>{money(plan.amountCents, 'EUR')}</strong>
                  <Lozenge appearance="inprogress">Draft</Lozenge>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
