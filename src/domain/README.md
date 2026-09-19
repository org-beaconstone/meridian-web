# Domain layer

Fictional GBP simulation, with no network or real credentials.

- `model.ts`: exported types, `RECIPIENTS`, `PROVIDERS`, fixed `DEMO_DATE`, validation, integer-pence parsing, provider routing and payment execution.
- `storage.ts`: strict Zod validation, versioned browser state and graceful recovery.
- `index.ts`: public barrel exports. Import using relative paths; this project has no `@/` alias.

`parseAmount(string)` returns `[pence | null, error | null]`. It rejects zero, signs, exponent notation, more than two decimals and amounts over £10,000. `validatePayment(state, draft)` also checks the recipient, method, available balance and note length.

`executePayment(state, draft, scenario, id, now)` returns a discriminated union: `{ ok: true, state, transaction }` or `{ ok: false, error }`. It does not mutate the input. Repeated successful IDs with the same payload do not debit again. An altered recipient, amount, method or note with the same ID is rejected. Decline and unavailable return errors without adding transactions or moving money. This in-memory behavior is not a server-side idempotency guarantee.

`monthlySpent` sums completed transactions for the fixed demo month. `updateBudget` accepts a positive limit up to £10,000. `money` formats integer pence as GBP. The initial state has £12,480.50 balance, £1,842.80 spent and £3,200 total category limits.

`loadState()` always returns `{ state, warning }`; corrupt data resets to fresh fixtures with a warning. `saveState(state)` returns false for invalid data, denied storage or quota exhaustion. Schemas require safe integer amounts, valid calendar dates, known recipients, matching provider/method pairs, unique transaction IDs and exactly five positive budgets. Unexpected fields are rejected.

Unit tests live next to the code, including boundary regressions in `edge-cases.test.ts`. Run `npm test` for the current test count.
