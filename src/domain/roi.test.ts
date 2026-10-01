import { describe, expect, it } from 'vitest';
import {
  BATTLE_CARD_CITATION,
  CASE_STUDIES,
  COMPETITOR_DEFAULTS,
  IMPORT_COST_PER_BOARD_CENTS,
  PUBLISHED_LIST_PRICES,
  calculateDisplacement,
  formatUsd,
  parseDisplacement,
  whiteboardDisplacementStudy,
} from './roi';

describe('whiteboard displacement', () => {
  it('calculates year-1 savings for 120 Miro seats and 40 boards', () => {
    const result = calculateDisplacement({
      competitor: 'miro',
      seats: 120,
      monthlyPriceCents: 2000,
      boardsToImport: 40,
    });

    expect(result.annualSubscriptionCents).toBe(120 * 2000 * 12);
    expect(result.importCostCents).toBe(40 * IMPORT_COST_PER_BOARD_CENTS);
    expect(result.annualSavingsCents).toBe(2_780_000);
    expect(formatUsd(result.annualSavingsCents)).toBe('$27,800.00');
    expect(result.recurringSavingsCents).toBe(2_880_000);
    expect(result.recurringSavingsCents).toBe(result.annualSavingsCents + result.importCostCents);
  });

  it('drops the import cost after year 1', () => {
    const result = calculateDisplacement({
      competitor: 'mural',
      seats: 100,
      monthlyPriceCents: COMPETITOR_DEFAULTS.mural.monthlyPriceCents,
      boardsToImport: 0,
    });

    expect(result.importCostCents).toBe(0);
    expect(result.annualSavingsCents).toBe(2_158_800);
    expect(result.recurringSavingsCents).toBe(result.annualSavingsCents);
    expect(formatUsd(result.annualSavingsCents)).toBe('$21,588.00');
  });

  it('keeps money in integer cents, including a price of $17.99', () => {
    const parsed = parseDisplacement({
      competitor: 'mural',
      seats: '3',
      pricePerSeat: '17.99',
      boards: '1',
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.input.monthlyPriceCents).toBe(1799);
    expect(parsed.result.annualSubscriptionCents).toBe(3 * 1799 * 12);
    expect(parsed.result.importCostCents).toBe(2500);
    expect(Number.isInteger(parsed.result.annualSavingsCents)).toBe(true);
  });

  it('rejects incomplete or unsafe discovery inputs', () => {
    const invalid = (fields: Parameters<typeof parseDisplacement>[0]) => {
      const parsed = parseDisplacement(fields);
      expect(parsed.ok).toBe(false);
      return parsed.ok ? [] : parsed.errors;
    };

    expect(
      invalid({ competitor: 'figjam', seats: '10', pricePerSeat: '20', boards: '1' }).join(' '),
    ).toMatch(/Miro or Mural/);
    expect(
      invalid({ competitor: 'miro', seats: '0', pricePerSeat: '20.00', boards: '0' }),
    ).toContain('Seats must be at least 1');
    expect(
      invalid({ competitor: 'miro', seats: '10', pricePerSeat: '20.', boards: '0' }),
    ).toContain('Price per seat must be a valid amount');
    expect(
      invalid({ competitor: 'miro', seats: '10', pricePerSeat: '1.999', boards: '0' }),
    ).toContain('Price per seat must be a valid amount');
    expect(invalid({ competitor: 'miro', seats: '10', pricePerSeat: '-5', boards: '2' })).toContain(
      'Price per seat cannot contain a sign or exponent',
    );
    expect(invalid({ competitor: 'miro', seats: '4', pricePerSeat: '20', boards: '-1' })).toContain(
      'Boards to import must be a whole number',
    );
  });

  it('cites published Business list prices because the battle card ticket is unreadable', () => {
    expect(BATTLE_CARD_CITATION.readable).toBe(false);
    expect(BATTLE_CARD_CITATION.name).toMatch(/battle card/i);
    expect(COMPETITOR_DEFAULTS.miro.monthlyPriceCents).toBe(2000);
    expect(COMPETITOR_DEFAULTS.mural.monthlyPriceCents).toBe(1799);
    expect(COMPETITOR_DEFAULTS.miro.retrievedOn).toBe('2026-10-01');
    const defaults = PUBLISHED_LIST_PRICES.filter((price) => price.isDefault);
    expect(defaults.map((price) => price.monthlyPriceCents)).toEqual([2000, 1799]);
    expect(defaults.every((price) => price.sourceUrl.startsWith('https://'))).toBe(true);
  });

  it('includes one illustrative whiteboard displacement story among ten', () => {
    expect(CASE_STUDIES).toHaveLength(10);
    expect(CASE_STUDIES.every((study) => study.illustrative)).toBe(true);
    const displacement = CASE_STUDIES.filter((study) => study.motion === 'whiteboard-displacement');
    expect(displacement).toHaveLength(1);
    const study = whiteboardDisplacementStudy();
    const savings = calculateDisplacement(study.displacement!);
    expect(formatUsd(savings.annualSavingsCents)).toBe('$27,800.00');
    expect(study.summary.toLowerCase()).toContain('illustrative');
  });
});
