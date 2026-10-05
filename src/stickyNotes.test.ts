import { describe, expect, it } from 'vitest';
import { DEFAULT_COLOUR_ID, STICKY_COLOURS } from './stickyNotes';

describe('sticky note colours', () => {
  it('palette has at least one colour', () => {
    expect(STICKY_COLOURS.length).toBeGreaterThan(0);
  });

  it('every colour has a valid hex value and non-empty id, label and textColour', () => {
    for (const colour of STICKY_COLOURS) {
      expect(colour.id).toBeTruthy();
      expect(colour.label).toBeTruthy();
      expect(colour.value).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(colour.textColour).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('default colour id matches a palette entry', () => {
    expect(STICKY_COLOURS.some((c) => c.id === DEFAULT_COLOUR_ID)).toBe(true);
  });
});
