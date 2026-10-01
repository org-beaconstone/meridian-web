// Whiteboard displacement planner for AJ-1.
// Synthetic sales draft. Amounts are integer USD cents. Separate from Meridian GBP balances.

export type CompetitorId = 'miro' | 'mural';

export interface CompetitorDefault {
  id: CompetitorId;
  name: string;
  /** Monthly price per seat in USD cents, on the vendor's annual billing list price. */
  monthlyPriceCents: number;
  tier: string;
  sourceUrl: string;
  sourceLabel: string;
  retrievedOn: '2026-10-01';
}

/**
 * Business-tier list prices used when the battle card ticket cannot be read.
 * Entry tiers stay in the notes for discovery and are not prefilled.
 * Retrieved 1 October 2026 from the vendor pricing pages.
 */
export const COMPETITOR_DEFAULTS: Record<CompetitorId, CompetitorDefault> = {
  miro: {
    id: 'miro',
    name: 'Miro',
    monthlyPriceCents: 2000,
    tier: 'Business, billed yearly',
    sourceUrl: 'https://miro.com/pricing/',
    sourceLabel: 'Miro pricing page',
    retrievedOn: '2026-10-01',
  },
  mural: {
    id: 'mural',
    name: 'Mural',
    monthlyPriceCents: 1799,
    tier: 'Business, billed annually',
    sourceUrl: 'https://www.mural.co/pricing',
    sourceLabel: 'Mural pricing page',
    retrievedOn: '2026-10-01',
  },
};

/**
 * AJ-1 asks for defaults from the Whiteboard competitor battle card ticket.
 * A Jira search on beacon-stone.atlassian.net on 1 October 2026 returned no issues.
 */
export const BATTLE_CARD_CITATION = {
  name: 'Whiteboard competitor battle card ticket',
  host: 'https://beacon-stone.atlassian.net',
  readable: false,
  checkedOn: '2026-10-01',
  finding:
    'No battle-card Jira issue was visible to this workspace. Default prices are the vendors’ published Business list prices, cited here until that ticket can be linked.',
} as const;

/** Published list prices a rep may type after discovery. Only the Business tiers are defaults. */
export const PUBLISHED_LIST_PRICES: {
  tool: string;
  tier: string;
  monthlyPriceCents: number;
  sourceUrl: string;
  isDefault: boolean;
}[] = [
  {
    tool: 'Miro',
    tier: 'Starter, billed yearly',
    monthlyPriceCents: 800,
    sourceUrl: 'https://miro.com/pricing/',
    isDefault: false,
  },
  {
    tool: 'Miro',
    tier: 'Business, billed yearly',
    monthlyPriceCents: 2000,
    sourceUrl: 'https://miro.com/pricing/',
    isDefault: true,
  },
  {
    tool: 'Mural',
    tier: 'Team+, billed annually',
    monthlyPriceCents: 999,
    sourceUrl: 'https://www.mural.co/pricing',
    isDefault: false,
  },
  {
    tool: 'Mural',
    tier: 'Business, billed annually',
    monthlyPriceCents: 1799,
    sourceUrl: 'https://www.mural.co/pricing',
    isDefault: true,
  },
];

/**
 * Illustrative internal import rate, USD cents per board.
 * It is a planning assumption so boards to import change year-1 savings.
 * Use 0 boards when import cost is unknown or waived.
 */
export const IMPORT_COST_PER_BOARD_CENTS = 2500;

export const SALES_PLAYBOOK_RULE = "Don't quote pricing before discovery.";

export const SALESFORCE_OUT_OF_SCOPE =
  'Automating the calculator inside Salesforce is out of scope. This draft does not write opportunities, quotes, or price books.';

const MAX_SEATS = 1_000_000;
const MAX_BOARDS = 1_000_000;
const MAX_MONTHLY_CENTS = 10_000_000;

export interface DisplacementInput {
  competitor: CompetitorId;
  seats: number;
  monthlyPriceCents: number;
  boardsToImport: number;
}

export interface DisplacementResult {
  competitor: CompetitorId;
  seats: number;
  monthlyPriceCents: number;
  boardsToImport: number;
  /** seats × monthly price × 12 */
  annualSubscriptionCents: number;
  /** boards × illustrative import rate. One-time, recognized in year 1. */
  importCostCents: number;
  /** Year-1 annual savings: avoided subscription minus import cost. */
  annualSavingsCents: number;
  /** Subscription avoided again each later year. Import is not repeated. */
  recurringSavingsCents: number;
}

export function isCompetitorId(value: string): value is CompetitorId {
  return value === 'miro' || value === 'mural';
}

export function formatUsd(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  const dollars = Math.floor(absolute / 100);
  const remainder = absolute % 100;
  return `${sign}$${dollars.toLocaleString('en-US')}.${String(remainder).padStart(2, '0')}`;
}

export function usdInputFromCents(cents: number): string {
  const dollars = Math.floor(Math.abs(cents) / 100);
  const remainder = Math.abs(cents) % 100;
  return `${dollars}.${String(remainder).padStart(2, '0')}`;
}

export function calculateDisplacement(input: DisplacementInput): DisplacementResult {
  if (!isCompetitorId(input.competitor)) {
    throw new Error('Competitor tool must be Miro or Mural');
  }
  if (!Number.isInteger(input.seats) || input.seats < 1 || input.seats > MAX_SEATS) {
    throw new Error('Seats must be a whole number from 1 to 1000000');
  }
  if (
    !Number.isInteger(input.monthlyPriceCents) ||
    input.monthlyPriceCents < 0 ||
    input.monthlyPriceCents > MAX_MONTHLY_CENTS
  ) {
    throw new Error('Price per seat is out of range');
  }
  if (
    !Number.isInteger(input.boardsToImport) ||
    input.boardsToImport < 0 ||
    input.boardsToImport > MAX_BOARDS
  ) {
    throw new Error('Boards to import must be a whole number from 0 to 1000000');
  }

  const annualSubscriptionCents = input.seats * input.monthlyPriceCents * 12;
  const importCostCents = input.boardsToImport * IMPORT_COST_PER_BOARD_CENTS;
  if (!Number.isSafeInteger(annualSubscriptionCents) || !Number.isSafeInteger(importCostCents)) {
    throw new Error('Annual savings are too large to calculate safely');
  }

  return {
    competitor: input.competitor,
    seats: input.seats,
    monthlyPriceCents: input.monthlyPriceCents,
    boardsToImport: input.boardsToImport,
    annualSubscriptionCents,
    importCostCents,
    annualSavingsCents: annualSubscriptionCents - importCostCents,
    recurringSavingsCents: annualSubscriptionCents,
  };
}

export interface DisplacementFields {
  competitor: string;
  seats: string;
  pricePerSeat: string;
  boards: string;
}

export type ParsedDisplacement =
  | { ok: true; input: DisplacementInput; result: DisplacementResult }
  | { ok: false; errors: string[] };

function parseWhole(
  input: string,
  label: string,
  min: number,
  max: number,
): [number | null, string | null] {
  const trimmed = input.trim();
  if (!trimmed) return [null, `${label} is required`];
  if (!/^\d+$/.test(trimmed)) return [null, `${label} must be a whole number`];
  const value = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(value) || value > max) return [null, `${label} is too large`];
  if (value < min) return [null, `${label} must be at least ${min}`];
  return [value, null];
}

function parseMonthlyCents(input: string): [number | null, string | null] {
  const trimmed = input.trim();
  if (!trimmed) return [null, 'Price per seat is required'];
  if (/[eE+-]/.test(trimmed)) {
    return [null, 'Price per seat cannot contain a sign or exponent'];
  }
  if (!/^\d+(\.\d*)?$/.test(trimmed)) return [null, 'Price per seat must be a valid amount'];
  const [dollars, fraction = ''] = trimmed.split('.');
  if (fraction.length > 2) {
    return [null, 'Price per seat must have at most 2 decimal places'];
  }
  const dollarValue = Number.parseInt(dollars, 10);
  const fractionValue = Number.parseInt(fraction.padEnd(2, '0') || '0', 10);
  if (!Number.isSafeInteger(dollarValue) || !Number.isSafeInteger(fractionValue)) {
    return [null, 'Price per seat is too large'];
  }
  const cents = dollarValue * 100 + fractionValue;
  if (!Number.isSafeInteger(cents) || cents > MAX_MONTHLY_CENTS) {
    return [null, 'Price per seat is too large'];
  }
  return [cents, null];
}

export function parseDisplacement(fields: DisplacementFields): ParsedDisplacement {
  const errors: string[] = [];
  if (!isCompetitorId(fields.competitor)) {
    errors.push('Competitor tool must be Miro or Mural');
  }
  const [seats, seatsError] = parseWhole(fields.seats, 'Seats', 1, MAX_SEATS);
  const [monthlyPriceCents, priceError] = parseMonthlyCents(fields.pricePerSeat);
  const [boardsToImport, boardsError] = parseWhole(
    fields.boards,
    'Boards to import',
    0,
    MAX_BOARDS,
  );
  for (const error of [seatsError, priceError, boardsError]) {
    if (error) errors.push(error);
  }
  if (
    errors.length ||
    !isCompetitorId(fields.competitor) ||
    seats === null ||
    monthlyPriceCents === null ||
    boardsToImport === null
  ) {
    return { ok: false, errors };
  }
  try {
    const input: DisplacementInput = {
      competitor: fields.competitor,
      seats,
      monthlyPriceCents,
      boardsToImport,
    };
    return { ok: true, input, result: calculateDisplacement(input) };
  } catch (error) {
    return {
      ok: false,
      errors: [error instanceof Error ? error.message : 'Annual savings could not be calculated'],
    };
  }
}

export type CaseStudyMotion = 'titan-value' | 'whiteboard-displacement';

export interface CaseStudy {
  id: string;
  title: string;
  motion: CaseStudyMotion;
  /** Every story in this repo is a stand-in. None is verified customer evidence. */
  illustrative: true;
  summary: string;
  displacement?: DisplacementInput;
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'close-retries',
    title: 'Close week without hand-run retries',
    motion: 'titan-value',
    illustrative: true,
    summary:
      'Illustrative Titan story. A revenue team stops replaying failed report jobs by hand during close, because a written retry budget makes the queue predictable.',
  },
  {
    id: 'launch-exports',
    title: 'Launch week export incidents drop',
    motion: 'titan-value',
    illustrative: true,
    summary:
      'Illustrative Titan story. On-call can tell an export failure from a tenant timeout, so launch week is spent on one incident instead of three lookalikes.',
  },
  {
    id: 'onboarding-status',
    title: 'Onboarding status matches the backend',
    motion: 'titan-value',
    illustrative: true,
    summary:
      'Illustrative Titan story. Support compares the onboarding panel with the provisioning record, and a stale status stops being the customer’s first impression.',
  },
  {
    id: 'support-replay',
    title: 'Support stops replaying jobs from memory',
    motion: 'titan-value',
    illustrative: true,
    summary:
      'Illustrative Titan story. A written replay checkpoint replaces tribal steps, so a failed backfill has an owner, a batch size, and a stop condition.',
  },
  {
    id: 'quarter-packs',
    title: 'Quarter-end packs from one schedule',
    motion: 'titan-value',
    illustrative: true,
    summary:
      'Illustrative Titan story. Scheduled reporting replaces a shared spreadsheet of who exports what, and the pack goes out when the schedule says it will.',
  },
  {
    id: 'timeout-noise',
    title: 'Timeout noise no longer hides a tenant',
    motion: 'titan-value',
    illustrative: true,
    summary:
      'Illustrative Titan story. Classified timeouts make a single stuck tenant visible. The team fixes that path instead of raising every limit.',
  },
  {
    id: 'export-path',
    title: 'The export path on-call can explain',
    motion: 'titan-value',
    illustrative: true,
    summary:
      'Illustrative Titan story. Auth and export notes match the code, so a new on-call can say which credential failed and which dashboard did not refresh.',
  },
  {
    id: 'dry-run',
    title: 'A dry run before the production replay',
    motion: 'titan-value',
    illustrative: true,
    summary:
      'Illustrative Titan story. A backfill is rehearsed against elapsed time, and a small gap is written down before anyone calls the replay healthy.',
  },
  {
    id: 'launch-handoff',
    title: 'One queue view for launch handoff',
    motion: 'titan-value',
    illustrative: true,
    summary:
      'Illustrative Titan story. Launch review reads queue diagnostics and the readiness checklist together instead of reconstructing the week from chat.',
  },
  {
    id: 'illustrative-miro-displacement',
    title: 'A Miro estate moves onto Whiteboard',
    motion: 'whiteboard-displacement',
    illustrative: true,
    summary:
      'Illustrative whiteboard displacement story, not a customer. A fictional product org pays for 120 Miro Business seats and plans to import 40 boards. Year-1 annual savings use the same formula as the calculator. Replace every input with figures confirmed in discovery.',
    displacement: {
      competitor: 'miro',
      seats: 120,
      monthlyPriceCents: 2000,
      boardsToImport: 40,
    },
  },
];

export function whiteboardDisplacementStudy(): CaseStudy {
  const study = CASE_STUDIES.find((item) => item.motion === 'whiteboard-displacement');
  if (!study?.displacement) {
    throw new Error('ROI toolkit is missing its whiteboard displacement story');
  }
  return study;
}
