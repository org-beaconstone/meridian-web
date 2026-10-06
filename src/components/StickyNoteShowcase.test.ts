import { describe, it, expect } from 'vitest';
import { STICKY_NOTE_COLOURS } from './StickyNoteColours';

describe('STICKY_NOTE_COLOURS', () => {
  it('provides 5 colour entries', () => {
    expect(STICKY_NOTE_COLOURS).toHaveLength(5);
  });

  it('every colour value is a valid 6-digit hex string', () => {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    for (const colour of STICKY_NOTE_COLOURS) {
      expect(colour.value, `${colour.name} should be a valid hex`).toMatch(hexPattern);
    }
  });

  it('default colour (first entry) is Sunshine yellow', () => {
    expect(STICKY_NOTE_COLOURS[0].name).toBe('Sunshine');
    expect(STICKY_NOTE_COLOURS[0].value).toBe('#FFF59D');
  });

  it('all colour names are unique', () => {
    const names = STICKY_NOTE_COLOURS.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
