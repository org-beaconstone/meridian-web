import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Lozenge from '@atlaskit/lozenge';
import SectionMessage from '@atlaskit/section-message';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Globe2,
  Landmark,
  LayoutDashboard,
  Leaf,
  LockKeyhole,
  Monitor,
  PieChart,
  Plus,
  ReceiptText,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import Dialog from './components/Dialog';
import {
  createInitialState,
  DEMO_DATE,
  executePayment,
  getProvider,
  money,
  monthlySpent,
  parseAmount,
  RECIPIENTS,
  updateBudget,
  validatePayment,
  type BankState,
  type Budget,
  type Category,
  type PaymentDraft,
  type Scenario,
  type Transaction,
} from './domain/model';
import { loadState, saveState } from './domain/storage';

type Page = 'Overview' | 'Payments' | 'Budgets' | 'Activity' | 'Settings';
const categoryColor: Record<Category, string> = {
  Shopping: '#697D6B',
  'Food & drink': '#B98650',
  Transport: '#8398AA',
  Bills: '#B9A26F',
  Lifestyle: '#A18DA9',
};
const nav = [
  { name: 'Overview', icon: LayoutDashboard },
  { name: 'Payments', icon: ArrowUpRight },
  { name: 'Budgets', icon: PieChart },
  { name: 'Activity', icon: ReceiptText },
  { name: 'Settings', icon: Settings2 },
] as const;

const SETTINGS_KEY = 'meridian_settings';
type AppSettings = {
  maskBalance: boolean;
  notifyPayments: boolean;
  notifyBudgets: boolean;
};
const defaultSettings: AppSettings = {
  maskBalance: false,
  notifyPayments: true,
  notifyBudgets: true,
};
function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}
const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
const blankDraft = (): PaymentDraft => ({
  recipientId: RECIPIENTS[0].id,
  amount: '',
  method: 'card',
  note: '',
});

function Avatar({ name, category }: { name: string; category: Category }) {
  return (
    <span
      className="merchant-avatar"
      style={{ '--merchant-color': categoryColor[category] } as CSSProperties}
    >
      {name
        .split(/\s|&/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')}
    </span>
  );
}

function Transactions({
  transactions,
  onSelect,
}: {
  transactions: Transaction[];
  onSelect: (transaction: Transaction) => void;
}) {
  return (
    <div className="transaction-list">
      {transactions.length ? (
        transactions.map((transaction) => (
          <button
            key={transaction.id}
            className="transaction-row"
            onClick={() => onSelect(transaction)}
          >
            <Avatar name={transaction.name} category={transaction.category} />
            <span className="transaction-name">
              <strong>{transaction.name}</strong>
              <span>
                {transaction.category} <span aria-hidden="true">·</span>{' '}
                {dateLabel(transaction.date)}
              </span>
            </span>
            <span className="transaction-amount">
              <strong>
                {transaction.status === 'completed' ? '−' : ''}
                {money(transaction.amount)}
              </strong>
              <span className={transaction.status === 'completed' ? 'success-text' : ''}>
                {transaction.status === 'completed' ? 'Completed' : 'Declined'}
              </span>
            </span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        ))
      ) : (
        <div className="empty-state">
          <Search size={28} />
          <h3>No matching payments</h3>
          <p>Try another name or category.</p>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [initial] = useState(loadState);
  const [state, setState] = useState<BankState>(initial.state);
  const [warning, setWarning] = useState(initial.warning);
  const [page, setPage] = useState<Page>('Overview');
  const [draft, setDraft] = useState<PaymentDraft>(blankDraft);
  const [step, setStep] = useState<'details' | 'review' | 'done'>('details');
  const [errors, setErrors] = useState<string[]>([]);
  const [scenario, setScenario] = useState<Scenario>('success');
  const [receipt, setReceipt] = useState<Transaction | null>(null);
  const [lastPayment, setLastPayment] = useState<Transaction | null>(null);
  const [dialog, setDialog] = useState<'controls' | 'account' | 'reset' | null>(null);
  const [budgetEdit, setBudgetEdit] = useState<Budget | null>(null);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetError, setBudgetError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const paymentId = useRef(crypto.randomUUID());
  const confirming = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (!saveState(state))
      setWarning('Changes are kept for this visit only. Browser storage is unavailable.');
  }, [state]);
  useEffect(() => {
    if (mounted.current) heading.current?.focus();
    mounted.current = true;
  }, [page, step]);

  const spent = monthlySpent(state);
  const budgetTotal = state.budgets.reduce((sum, budget) => sum + budget.limit, 0);
  const remaining = budgetTotal - spent;
  const recipient = RECIPIENTS.find((item) => item.id === draft.recipientId)!;
  const provider = getProvider(draft.method);
  const amount = parseAmount(draft.amount)[0] ?? 0;
  const transactions = [...state.transactions]
    .reverse()
    .sort((a, b) => b.date.localeCompare(a.date));
  const filtered = transactions.filter(
    (transaction) =>
      (filter === 'all' || transaction.category === filter) &&
      `${transaction.name} ${transaction.reference} ${transaction.note}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );

  function navigate(next: Page) {
    setPage(next);
    setNotice('');
  }
  function startPayment(recipientId?: string) {
    setDraft({ ...blankDraft(), recipientId: recipientId ?? RECIPIENTS[0].id });
    setStep('details');
    setErrors([]);
    setLastPayment(null);
    paymentId.current = crypto.randomUUID();
    confirming.current = false;
    navigate('Payments');
  }
  function confirmPayment() {
    if (confirming.current) return;
    confirming.current = true;
    const result = executePayment(
      state,
      draft,
      scenario,
      paymentId.current,
      `${DEMO_DATE}T12:00:00Z`,
    );
    if (result.ok) {
      setState(result.state);
      setLastPayment(result.transaction);
      setErrors([]);
      setStep('done');
    } else {
      setErrors([result.error]);
      confirming.current = false;
    }
  }
  function openBudget(budget: Budget) {
    setBudgetEdit(budget);
    setBudgetAmount((budget.limit / 100).toFixed(2));
    setBudgetError('');
  }
  function reset() {
    setState(createInitialState());
    setDraft(blankDraft());
    setStep('details');
    setScenario('success');
    setErrors([]);
    setLastPayment(null);
    setWarning(null);
    setQuery('');
    setFilter('all');
    setDialog(null);
    setPage('Overview');
    setNotice('Demo reset. You’re ready for a fresh run.');
  }

  function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      /* ignore if storage unavailable */
    }
  }

  function budgetLine(budget: Budget, compact = false) {
    const used = monthlySpent(state, budget.category);
    const percent =
      budget.limit > 0
        ? Math.min(100, Math.round((used / budget.limit) * 100))
        : used > 0
          ? 100
          : 0;
    return (
      <div className={`budget-line ${compact ? 'compact' : ''}`} key={budget.category}>
        <div className="budget-label">
          <span>
            <i style={{ background: categoryColor[budget.category] }} />
            {budget.category}
          </span>
          {!compact && (
            <Button
              appearance="subtle"
              onClick={() => openBudget(budget)}
              aria-label={`Edit ${budget.category} budget`}
            >
              Edit
            </Button>
          )}
        </div>
        <div className="budget-numbers">
          <strong>{money(used)}</strong>
          <span>of {money(budget.limit)}</span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label={`${budget.category} budget used`}
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${money(used)} spent of ${money(budget.limit)}`}
        >
          <span
            style={{
              width: `${percent}%`,
              background:
                used > budget.limit
                  ? 'var(--ds-background-danger-bold)'
                  : categoryColor[budget.category],
            }}
          />
        </div>
        {!compact && (
          <p className={used > budget.limit ? 'danger-text' : 'muted'}>
            {used > budget.limit
              ? `${money(used - budget.limit)} over budget`
              : `${money(budget.limit - used)} left to spend`}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <a
          href="#"
          className="brand"
          onClick={(event) => {
            event.preventDefault();
            navigate('Overview');
          }}
          aria-label="Meridian Money home"
        >
          <img src="./meridian.svg" alt="" />
          <span>
            meridian<span className="brand-subtitle">MONEY, IN BALANCE.</span>
          </span>
        </a>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {nav.map(({ name, icon: Icon }) => (
            <button
              className={`nav-item ${page === name ? 'active' : ''}`}
              aria-current={page === name ? 'page' : undefined}
              key={name}
              onClick={() => navigate(name)}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{name}</span>
              {name === 'Payments' && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="leaf-icon">
              <Leaf size={20} />
            </span>
            <strong>
              A little clarity.
              <br />A lot of possibility.
            </strong>
            <p>Make room for what matters.</p>
          </div>
          <button className="profile" onClick={() => setDialog('account')}>
            <span className="profile-avatar">AM</span>
            <span>
              <strong>Alex Morgan</strong>
              <small>Personal account</small>
            </span>
            <ChevronRight size={17} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Personal banking <ChevronRight size={14} aria-hidden="true" /> <strong>{page}</strong>
          </div>
          <div className="topbar-right">
            <span className="demo-badge">
              <span />
              Fictional demo
            </span>
            <Button appearance="subtle" onClick={() => setDialog('controls')}>
              <span className="button-with-icon">
                <Settings2 size={16} />
                Demo controls
              </span>
            </Button>
            <span className="small-avatar" aria-label="Alex Morgan">
              AM
            </span>
          </div>
        </header>
        <main id="main" className="main-content">
          {warning && (
            <div className="message">
              <SectionMessage appearance="warning" title="Browser storage notice">
                <p>{warning}</p>
              </SectionMessage>
            </div>
          )}
          <div role="status" className={notice ? 'notice' : 'sr-only'}>
            {notice}
          </div>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {page === 'Overview' ? 'FRIDAY, 18 SEPTEMBER 2026' : 'YOUR MONEY. YOUR WAY.'}
              </div>
              <h1 ref={heading} tabIndex={-1}>
                {page === 'Overview'
                  ? 'Your everyday, balanced.'
                  : page === 'Payments'
                    ? 'A little closer. One payment away.'
                    : page === 'Budgets'
                      ? 'A plan for what matters.'
                      : page === 'Settings'
                        ? 'Your preferences, your way.'
                        : 'The story of your spending.'}
              </h1>
              <p>
                {page === 'Overview'
                  ? 'Good evening, Alex. Here’s where you stand today.'
                  : page === 'Payments'
                    ? 'Pay with confidence. Keep your plans in view.'
                    : page === 'Budgets'
                      ? 'Small intentions today. More possibilities tomorrow.'
                      : page === 'Settings'
                        ? 'Tailor Meridian to the way you work.'
                        : 'Every payment, in one clear picture.'}
              </p>
            </div>
            {page !== 'Payments' && page !== 'Settings' && (
              <Button appearance="primary" onClick={() => startPayment()}>
                <span className="button-with-icon">
                  <Plus size={17} />
                  Make a payment
                </span>
              </Button>
            )}
          </div>

          {page === 'Overview' && (
            <>
              <div className="summary-grid">
                <section className="balance-card" aria-labelledby="balance-title">
                  <div className="balance-card-top">
                    <span className="account-label">
                      <Wallet size={18} />
                      Everyday account
                    </span>
                    <span className="account-currency">
                      GBP <span>•• 2048</span>
                    </span>
                  </div>
                  <div className="balance-copy">
                    <div id="balance-title">Available balance</div>
                    <div className="balance-value" data-testid="balance">
                      {settings.maskBalance ? '••••••' : money(state.balance)}
                    </div>
                    <span className="balance-subtitle">
                      <span className="gold-dot" />A little peace of mind, every day.
                    </span>
                  </div>
                  <div className="balance-card-bottom">
                    <button onClick={() => startPayment()}>
                      <ArrowUpRight size={18} />
                      Make a payment
                    </button>
                    <button onClick={() => setDialog('account')}>
                      <Landmark size={17} />
                      Account details
                    </button>
                    <div className="card-brand">
                      meridian<span>everyday</span>
                    </div>
                  </div>
                  <div className="orbital orbital-one" />
                  <div className="orbital orbital-two" />
                  <div className="orbital orbital-three" />
                </section>
                <section className="month-card">
                  <div className="section-kicker">
                    <span className="icon-tile">
                      <PieChart size={18} />
                    </span>
                    September, at a glance
                  </div>
                  <div className="month-value">{money(spent)}</div>
                  <p>spent of your {money(budgetTotal)} monthly plan</p>
                  <div className="segmented-track">
                    {state.budgets.map((budget) => (
                      <span
                        key={budget.category}
                        style={{
                          width: `${(monthlySpent(state, budget.category) / Math.max(spent, budgetTotal)) * 100}%`,
                          background: categoryColor[budget.category],
                        }}
                      />
                    ))}
                  </div>
                  <div className="month-footer">
                    <span>
                      <span className="tiny-dot" />
                      {money(Math.abs(remaining))}{' '}
                      {remaining >= 0 ? 'left to spend' : 'over your plan'}
                    </span>
                    <button aria-label="View monthly budgets" onClick={() => navigate('Budgets')}>
                      <ArrowRight size={19} />
                    </button>
                  </div>
                </section>
              </div>
              <div className="dashboard-grid">
                <div className="dashboard-main">
                  <section className="panel quick-pay">
                    <div className="section-heading">
                      <h2>Send a little something</h2>
                      <span className="muted">Your people & places</span>
                    </div>
                    <div className="recipients">
                      {RECIPIENTS.slice(0, 4).map((item) => (
                        <button key={item.id} onClick={() => startPayment(item.id)}>
                          <Avatar name={item.name} category={item.category} />
                          <strong>{item.name}</strong>
                          <span>{item.category}</span>
                        </button>
                      ))}
                      <button className="all-recipients" onClick={() => startPayment()}>
                        <span className="merchant-avatar add-avatar">
                          <Plus size={24} />
                        </span>
                        <strong>Make a payment</strong>
                        <span>All recipients</span>
                      </button>
                    </div>
                  </section>
                  <section className="panel">
                    <div className="section-heading">
                      <div>
                        <h2>Recent activity</h2>
                        <p>A closer look at your everyday.</p>
                      </div>
                      <Button appearance="subtle" onClick={() => navigate('Activity')}>
                        View all
                      </Button>
                    </div>
                    <Transactions transactions={transactions.slice(0, 4)} onSelect={setReceipt} />
                  </section>
                </div>
                <div className="dashboard-aside">
                  <section className="panel budget-panel">
                    <div className="section-heading">
                      <h2>Your spending plan</h2>
                      <span className="pill">SEP</span>
                    </div>
                    {state.budgets.slice(0, 3).map((budget) => budgetLine(budget, true))}
                    <button className="text-link" onClick={() => navigate('Budgets')}>
                      Explore your budgets <ArrowRight size={16} />
                    </button>
                  </section>
                  <section className="insight-card">
                    <Sparkles size={22} />
                    <div>
                      <h3>Big plans start small.</h3>
                      <p>A budget isn’t a limit. It’s space for the things you love.</p>
                      <button className="text-link" onClick={() => navigate('Budgets')}>
                        Make room for more <ArrowRight size={16} />
                      </button>
                    </div>
                  </section>
                </div>
              </div>
            </>
          )}

          {page === 'Payments' && (
            <div className="payment-layout">
              <section className="panel payment-panel">
                <ol className="stepper" aria-label="Payment progress">
                  {['Payment details', 'Review', 'Complete'].map((label, index) => (
                    <li
                      key={label}
                      className={
                        index <= ['details', 'review', 'done'].indexOf(step) ? 'reached' : ''
                      }
                      aria-current={
                        index === ['details', 'review', 'done'].indexOf(step) ? 'step' : undefined
                      }
                    >
                      <span>
                        {index < ['details', 'review', 'done'].indexOf(step) ? (
                          <Check size={13} />
                        ) : (
                          index + 1
                        )}
                      </span>
                      {label}
                    </li>
                  ))}
                </ol>
                {errors.length > 0 && (
                  <div role="alert" className="message">
                    <SectionMessage
                      appearance="error"
                      title={step === 'review' ? 'Payment not completed' : 'Check your payment'}
                    >
                      <p>
                        {errors.join('. ')}
                        {step === 'review'
                          ? '. No money has left your account. You can go back or change the demo scenario and retry.'
                          : ''}
                      </p>
                    </SectionMessage>
                  </div>
                )}
                {step === 'details' && (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      const nextErrors = validatePayment(state, draft);
                      setErrors(nextErrors);
                      if (!nextErrors.length) setStep('review');
                    }}
                    noValidate
                  >
                    <div className="form-intro">
                      <h2>Who are we paying?</h2>
                      <p>Choose a saved recipient to get started.</p>
                    </div>
                    <label className="field-label" htmlFor="recipient">
                      Recipient
                    </label>
                    <select
                      id="recipient"
                      value={draft.recipientId}
                      onChange={(event) => setDraft({ ...draft, recipientId: event.target.value })}
                    >
                      {RECIPIENTS.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <div className="recipient-detail">
                      <Avatar name={recipient.name} category={recipient.category} />
                      <div>
                        <strong>{recipient.name}</strong>
                        <span>{recipient.detail}</span>
                      </div>
                      <Lozenge appearance="success">Saved recipient</Lozenge>
                    </div>
                    <div className="field-row">
                      <div>
                        <label className="field-label" htmlFor="amount">
                          Amount (GBP)
                        </label>
                        <Textfield
                          id="amount"
                          name="amount"
                          value={draft.amount}
                          inputMode="decimal"
                          placeholder="0.00"
                          maxLength={12}
                          onChange={(event) =>
                            setDraft({ ...draft, amount: event.currentTarget.value })
                          }
                          aria-describedby="amount-help"
                        />
                        <small id="amount-help">
                          Available: {money(state.balance)}. Maximum £10,000.
                        </small>
                      </div>
                      <div>
                        <label className="field-label" htmlFor="note">
                          Reference <span className="muted">(optional)</span>
                        </label>
                        <Textfield
                          id="note"
                          value={draft.note}
                          maxLength={200}
                          placeholder="What’s it for?"
                          onChange={(event) =>
                            setDraft({ ...draft, note: event.currentTarget.value })
                          }
                        />
                      </div>
                    </div>
                    <fieldset className="method-fieldset">
                      <legend>How would you like to pay?</legend>
                      <p>Two familiar ways. One simple payment.</p>
                      <label className={`method-card ${draft.method === 'card' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="method"
                          value="card"
                          checked={draft.method === 'card'}
                          onChange={() => setDraft({ ...draft, method: 'card' })}
                        />
                        <span className="method-icon">
                          <CreditCard size={22} />
                        </span>
                        <span className="method-copy">
                          <strong>Debit card</strong>
                          <span>Meridian Visa •••• 4829</span>
                        </span>
                        <span className="provider-wordmark">adyen</span>
                      </label>
                      <label className={`method-card ${draft.method === 'bank' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="method"
                          value="bank"
                          checked={draft.method === 'bank'}
                          onChange={() => setDraft({ ...draft, method: 'bank' })}
                        />
                        <span className="method-icon">
                          <Landmark size={22} />
                        </span>
                        <span className="method-copy">
                          <strong>Bank payment</strong>
                          <span>Your everyday account •• 2048</span>
                        </span>
                        <span className="provider-wordmark worldpay">Worldpay</span>
                      </label>
                    </fieldset>
                    <div className="form-footer">
                      <span>
                        <LockKeyhole size={14} />
                        Demo only. No real money moves.
                      </span>
                      <Button type="submit" appearance="primary">
                        Review payment
                      </Button>
                    </div>
                  </form>
                )}
                {step === 'review' && (
                  <div className="review">
                    <div className="form-intro">
                      <h2>One last look.</h2>
                      <p>Check everything below before confirming your demo payment.</p>
                    </div>
                    <div className="review-recipient">
                      <Avatar name={recipient.name} category={recipient.category} />
                      <span>Sending to {recipient.name}</span>
                      <strong>{money(amount)}</strong>
                    </div>
                    <dl className="detail-list">
                      <div>
                        <dt>Payment method</dt>
                        <dd>
                          {draft.method === 'card'
                            ? 'Debit card •••• 4829'
                            : 'Bank payment •• 2048'}
                        </dd>
                      </div>
                      <div>
                        <dt>Provider</dt>
                        <dd>
                          {provider.name} <span className="muted">(simulated)</span>
                        </dd>
                      </div>
                      <div>
                        <dt>Reference</dt>
                        <dd>{draft.note || 'No reference'}</dd>
                      </div>
                      <div>
                        <dt>Fee</dt>
                        <dd>
                          £0.00 <span className="muted">in this demo</span>
                        </dd>
                      </div>
                      <div>
                        <dt>Balance after payment</dt>
                        <dd>{money(state.balance - amount)}</dd>
                      </div>
                    </dl>
                    <div className="form-footer">
                      <Button
                        onClick={() => {
                          setStep('details');
                          setErrors([]);
                        }}
                      >
                        Back to details
                      </Button>
                      <Button appearance="primary" onClick={confirmPayment}>
                        Confirm {money(amount)} payment
                      </Button>
                    </div>
                  </div>
                )}
                {step === 'done' && lastPayment && (
                  <div className="payment-success">
                    <span className="success-icon">
                      <CheckCircle2 size={38} />
                    </span>
                    <Lozenge appearance="success">Demo payment complete</Lozenge>
                    <h2>A little thing, taken care of.</h2>
                    <p>
                      {money(lastPayment.amount)} sent to <strong>{lastPayment.name}</strong>.
                    </p>
                    <div className="receipt-chip">
                      <span>Payment reference</span>
                      <strong>{lastPayment.reference}</strong>
                    </div>
                    <p className="muted">Your balance and September budget are up to date.</p>
                    <div className="success-actions">
                      <Button appearance="primary" onClick={() => navigate('Overview')}>
                        Back to overview
                      </Button>
                      <Button onClick={() => startPayment()}>Make another payment</Button>
                      <Button appearance="subtle" onClick={() => setReceipt(lastPayment)}>
                        View receipt
                      </Button>
                    </div>
                  </div>
                )}
              </section>
              <aside className="payment-aside">
                <div className="payment-note">
                  <span className="icon-tile">
                    <ShieldCheck size={24} />
                  </span>
                  <h2>
                    Consider it
                    <br />
                    taken care of.
                  </h2>
                  <p>
                    A clear view of what you’re paying, how you’re paying, and what’s left for you.
                  </p>
                  <div className="note-divider" />
                  <span className="eyebrow">PAYING FROM</span>
                  <strong>Everyday account</strong>
                  <span>Available balance</span>
                  <div className="aside-balance">{money(state.balance)}</div>
                </div>
                <div className="panel payment-impact">
                  <div className="section-heading">
                    <h3>Your plan stays in view</h3>
                    <PieChart size={18} />
                  </div>
                  <p>{recipient.category} this month</p>
                  <strong>
                    {money(
                      monthlySpent(state, recipient.category) + (step === 'done' ? 0 : amount),
                    )}
                  </strong>
                  <span>{step === 'done' ? 'including this payment' : 'after this payment'}</span>
                </div>
                <p className="simulation-note">
                  <Globe2 size={15} />
                  Provider routing is simulated. No card or bank details are collected.
                </p>
              </aside>
            </div>
          )}

          {page === 'Budgets' && (
            <>
              <section className="budget-summary">
                <span className="icon-tile">
                  <PieChart size={25} />
                </span>
                <div>
                  <span>September spending plan</span>
                  <strong>{money(budgetTotal)}</strong>
                </div>
                <div>
                  <span>Spent so far</span>
                  <strong>{money(spent)}</strong>
                </div>
                <div>
                  <span>{remaining >= 0 ? 'Still yours to spend' : 'Over your plan'}</span>
                  <strong>{money(Math.abs(remaining))}</strong>
                </div>
              </section>
              <div className="budget-grid">
                {state.budgets.map((budget) => (
                  <section className="panel" key={budget.category}>
                    {budgetLine(budget)}
                  </section>
                ))}
                <section className="budget-tip">
                  <Leaf size={27} />
                  <h2>
                    Plans change.
                    <br />
                    Your budget can too.
                  </h2>
                  <p>
                    Edit any category to find a balance that works for you. Your updates are saved
                    on this browser.
                  </p>
                </section>
              </div>
            </>
          )}

          {page === 'Activity' && (
            <section className="panel activity-panel">
              <div className="section-heading">
                <div>
                  <h2>All payments</h2>
                  <p>{filtered.length} payments in view</p>
                </div>
                <span className="pill">SEPTEMBER 2026</span>
              </div>
              <div className="activity-filters">
                <div>
                  <label className="field-label" htmlFor="search">
                    Search payments
                  </label>
                  <Textfield
                    id="search"
                    placeholder="Search name, reference or note"
                    value={query}
                    onChange={(event) => setQuery(event.currentTarget.value)}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="category">
                    Category
                  </label>
                  <select
                    id="category"
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                  >
                    <option value="all">All categories</option>
                    {state.budgets.map((budget) => (
                      <option key={budget.category}>{budget.category}</option>
                    ))}
                  </select>
                </div>
                <Button
                  onClick={() => {
                    setQuery('');
                    setFilter('all');
                  }}
                >
                  Clear filters
                </Button>
              </div>
              <Transactions transactions={filtered} onSelect={setReceipt} />
            </section>
          )}

          {page === 'Settings' && (
            <div className="settings-grid">
              <section className="panel settings-section" aria-labelledby="display-heading">
                <div className="settings-section-header">
                  <span className="icon-tile">
                    <Monitor size={18} />
                  </span>
                  <div>
                    <h2 id="display-heading">Display</h2>
                    <p>Control how your account information is presented.</p>
                  </div>
                </div>
                <div className="settings-rows">
                  <div className="settings-row">
                    <div className="settings-row-copy">
                      <strong>Mask account balance</strong>
                      <span>Hide your balance on the Overview screen. Useful when sharing your screen.</span>
                    </div>
                    <button
                      role="switch"
                      aria-checked={settings.maskBalance}
                      className={`toggle ${settings.maskBalance ? 'on' : ''}`}
                      onClick={() => updateSetting('maskBalance', !settings.maskBalance)}
                      aria-label="Mask account balance"
                    >
                      <span className="toggle-thumb" />
                    </button>
                  </div>
                </div>
              </section>

              <section className="panel settings-section" aria-labelledby="notifications-heading">
                <div className="settings-section-header">
                  <span className="icon-tile">
                    <Bell size={18} />
                  </span>
                  <div>
                    <h2 id="notifications-heading">Notifications</h2>
                    <p>Choose which demo alerts you'd like to see.</p>
                  </div>
                </div>
                <div className="settings-rows">
                  <div className="settings-row">
                    <div className="settings-row-copy">
                      <strong>Payment confirmations</strong>
                      <span>Show a confirmation notice after each simulated payment.</span>
                    </div>
                    <button
                      role="switch"
                      aria-checked={settings.notifyPayments}
                      className={`toggle ${settings.notifyPayments ? 'on' : ''}`}
                      onClick={() => updateSetting('notifyPayments', !settings.notifyPayments)}
                      aria-label="Payment confirmations"
                    >
                      <span className="toggle-thumb" />
                    </button>
                  </div>
                  <div className="settings-row">
                    <div className="settings-row-copy">
                      <strong>Budget alerts</strong>
                      <span>Highlight categories where spending is close to or over your plan.</span>
                    </div>
                    <button
                      role="switch"
                      aria-checked={settings.notifyBudgets}
                      className={`toggle ${settings.notifyBudgets ? 'on' : ''}`}
                      onClick={() => updateSetting('notifyBudgets', !settings.notifyBudgets)}
                      aria-label="Budget alerts"
                    >
                      <span className="toggle-thumb" />
                    </button>
                  </div>
                </div>
              </section>

              <section className="panel settings-section settings-about" aria-labelledby="about-heading">
                <div className="settings-section-header">
                  <span className="icon-tile">
                    <ShieldCheck size={18} />
                  </span>
                  <div>
                    <h2 id="about-heading">About this demo</h2>
                    <p>Everything here is fictional — no real money, no real data.</p>
                  </div>
                </div>
                <dl className="detail-list">
                  <div>
                    <dt>Account holder</dt>
                    <dd>Alex Morgan (fictional)</dd>
                  </div>
                  <div>
                    <dt>Currency</dt>
                    <dd>British pound (GBP)</dd>
                  </div>
                  <div>
                    <dt>Payment providers</dt>
                    <dd>Adyen · Worldpay (simulated)</dd>
                  </div>
                  <div>
                    <dt>Demo date</dt>
                    <dd>18 September 2026</dd>
                  </div>
                </dl>
                <SectionMessage title="Demonstration only">
                  <p>
                    Settings are stored in your browser and apply to this session only. No real
                    financial data is held or transmitted.
                  </p>
                </SectionMessage>
              </section>
            </div>
          )}
          <footer className="page-footer">
            <span>
              <img src="./meridian.svg" alt="" />A clearer kind of banking.
            </span>
            <span>Fictional Meridian Bank · GBP demo · No real payments</span>
          </footer>
        </main>
      </div>

      {receipt && (
        <Dialog title="Payment receipt" onClose={() => setReceipt(null)}>
          <div className="receipt-heading">
            <ArrowDownLeft size={24} />
            <h3>{receipt.name}</h3>
            <strong>{money(receipt.amount)}</strong>
            <Lozenge appearance={receipt.status === 'completed' ? 'success' : 'removed'}>
              {receipt.status}
            </Lozenge>
          </div>
          <dl className="detail-list">
            <div>
              <dt>Date</dt>
              <dd>{dateLabel(receipt.date)} 2026</dd>
            </div>
            <div>
              <dt>Reference</dt>
              <dd>{receipt.reference}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{receipt.category}</dd>
            </div>
            <div>
              <dt>Method</dt>
              <dd>{receipt.method === 'card' ? 'Debit card' : 'Bank payment'}</dd>
            </div>
            <div>
              <dt>Provider</dt>
              <dd>{receipt.provider === 'adyen' ? 'Adyen' : 'Worldpay'} (simulated)</dd>
            </div>
            {receipt.note && (
              <div>
                <dt>Note</dt>
                <dd>{receipt.note}</dd>
              </div>
            )}
          </dl>
          <p className="muted">Demo receipt only. Not proof of payment.</p>
        </Dialog>
      )}
      {budgetEdit && (
        <Dialog title={`Edit ${budgetEdit.category} budget`} onClose={() => setBudgetEdit(null)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const result = updateBudget(state, budgetEdit.category, budgetAmount);
              if (result.ok) {
                setState(result.state);
                setNotice(`${budgetEdit.category} budget updated.`);
                setBudgetEdit(null);
              } else setBudgetError(result.error);
            }}
            noValidate
          >
            <p>Set your September spending plan for {budgetEdit.category.toLowerCase()}.</p>
            <label className="field-label" htmlFor="budget-amount">
              Monthly limit (GBP)
            </label>
            <Textfield
              id="budget-amount"
              value={budgetAmount}
              onChange={(event) => setBudgetAmount(event.currentTarget.value)}
              inputMode="decimal"
              autoFocus
            />
            {budgetError && (
              <p role="alert" className="danger-text">
                {budgetError}
              </p>
            )}
            <div className="dialog-actions">
              <Button onClick={() => setBudgetEdit(null)}>Cancel</Button>
              <Button type="submit" appearance="primary">
                Save budget
              </Button>
            </div>
          </form>
        </Dialog>
      )}
      {dialog === 'account' && (
        <Dialog title="Your everyday account" onClose={() => setDialog(null)}>
          <p>Alex Morgan’s fictional GBP account.</p>
          <dl className="detail-list">
            <div>
              <dt>Available balance</dt>
              <dd>{money(state.balance)}</dd>
            </div>
            <div>
              <dt>Account</dt>
              <dd>Demo account •• 2048</dd>
            </div>
            <div>
              <dt>Debit card</dt>
              <dd>Demo Visa •••• 4829</dd>
            </div>
            <div>
              <dt>Currency</dt>
              <dd>British pound (GBP)</dd>
            </div>
          </dl>
          <SectionMessage title="For demonstration only">
            <p>
              This account cannot receive deposits or move real money. Never enter real financial
              details into this demo.
            </p>
          </SectionMessage>
        </Dialog>
      )}
      {dialog === 'controls' && (
        <Dialog title="Rehearsal controls" onClose={() => setDialog(null)}>
          <p>
            All data is fictional. Choose the next payment outcome without changing the customer
            flow.
          </p>
          <label className="field-label" htmlFor="scenario">
            Simulated payment outcome
          </label>
          <select
            id="scenario"
            value={scenario}
            onChange={(event) => setScenario(event.target.value as Scenario)}
          >
            <option value="success">Successful payment</option>
            <option value="declined">Provider declines payment</option>
            <option value="unavailable">Provider unavailable</option>
          </select>
          <p className="muted">
            Fixed rehearsal date: 18 September 2026. No requests are sent to Adyen or Worldpay.
          </p>
          <div className="dialog-actions">
            <Button appearance="danger" onClick={() => setDialog('reset')}>
              Reset demo data
            </Button>
            <Button appearance="primary" onClick={() => setDialog(null)}>
              Done
            </Button>
          </div>
        </Dialog>
      )}
      {dialog === 'reset' && (
        <Dialog title="Start fresh?" onClose={() => setDialog(null)}>
          <p>
            This resets this browser’s demo payments and budgets to the original September snapshot.
          </p>
          <div className="dialog-actions">
            <Button onClick={() => setDialog(null)}>Keep my changes</Button>
            <Button appearance="danger" onClick={reset}>
              Reset everything
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
