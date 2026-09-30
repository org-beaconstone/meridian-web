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
  usdInputFromCents,
  whiteboardDisplacementStudy,
} from './roi';

describe('whiteboard displacement ROI', () => {
  it('prefills Miro and Mural Business list prices in USD cents', () => {
    expect(COMPETITOR_DEFAULTS.miro.monthlyPriceCents).toBe(2000);
    expect(COMPETITOR_DEFAULTS.mural.monthlyPriceCents).toBe(1799);
    expect(usdInputFromCents(2000)).toBe('20.00');
    expect(usdInputFromCents(1799)).toBe('17.99');
    expect(BATTLE_CARD_CITATION.name).toMatch(/battle card ticket/i);
    expect(BATTLE_CARD_CITATION.readable).toBe(false);
  });

  it('outputs year-1 annual savings from seats, price, and boards', () => {
    const result = calculateDisplacement({
      competitor: 'miro',
      seats: 120,
      monthlyPriceCents: 2000,
      boardsToImport: 40,
    });
    expect(result.annualSubscriptionCents).toBe(120 * 2000 * 12);
    expect(result.importCostCents).toBe(40 * IMPORT_COST_PER_BOARD_CENTS);
    expect(result.annualSavingsCents).toBe(2_880_000 - 100_000);
    expect(result.recurringSavingsCents).toBe(2_880_000);
    expect(formatUsd(result.annualSavingsCents)).toBe('$27,800.00');
  });

  it('changes savings when the competitor default price changes', () => {
    const mural = calculateDisplacement({
      competitor: 'mural',
      seats: 100,
      monthlyPriceCents: COMPETITOR_DEFAULTS.mural.monthlyPriceCents,
      boardsToImport: 0,
    });
    expect(mural.annualSavingsCents).toBe(100 * 1799 * 12);
    expect(formatUsd(mural.annualSavingsCents)).toBe('$21,588.00');
  });

  it('rejects a third competitor and unsafe counts', () => {
    const parsed = parseDisplacement({
      competitor: 'figjam',
      seats: '0',
      pricePerSeat: '1.999',
      boards: '-1',
    });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errors).toEqual(
        expect.arrayContaining([
          'Competitor tool must be Miro or Mural',
          'Seats must be at least 1',
          'Price per seat must have at most 2 decimal places',
          'Boards to import must be a whole number',
        ]),
      );
    }
  });

  it('parses a discovered price without using floating point', () => {
    const parsed = parseDisplacement({
      competitor: 'miro',
      seats: '10',
      pricePerSeat: '8.00',
      boards: '0',
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.input.monthlyPriceCents).toBe(800);
      expect(parsed.result.annualSavingsCents).toBe(96_000);
    }
  });

  it('keeps ten illustrative case studies, one a whiteboard displacement', () => {
    expect(CASE_STUDIES).toHaveLength(10);
    expect(CASE_STUDIES.every((study) => study.illustrative)).toBe(true);
    const displacement = CASE_STUDIES.filter((study) => study.motion === 'whiteboard-displacement');
    expect(displacement).toHaveLength(1);
    const study = whiteboardDisplacementStudy();
    const result = calculateDisplacement(study.displacement!);
    expect(result.annualSavingsCents).toBe(2_780_000);
    expect(PUBLISHED_LIST_PRICES.filter((price) => price.isDefault)).toHaveLength(2);
  });
});
