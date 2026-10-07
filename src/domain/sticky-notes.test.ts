import { describe, it, expect } from 'vitest';
import {
  STICKY_NOTE_COLOURS,
  DEFAULT_STICKY_NOTE_COLOUR_ID,
  getStickyNoteColour,
  SEED_STICKY_NOTES,
} from './sticky-notes';

describe('sticky-notes', () => {
  it('exports 5 colours with unique ids, one per palette entry', () => {
    expect(STICKY_NOTE_COLOURS).toHaveLength(5);
    const ids = STICKY_NOTE_COLOURS.map((c) => c.id);
    expect(new Set(ids).size).toBe(5);
  });

  it('DEFAULT_STICKY_NOTE_COLOUR_ID matches the first palette entry', () => {
    expect(DEFAULT_STICKY_NOTE_COLOUR_ID).toBe(STICKY_NOTE_COLOURS[0].id);
  });

  it('getStickyNoteColour returns the correct colour object for every valid id', () => {
    for (const colour of STICKY_NOTE_COLOURS) {
      const result = getStickyNoteColour(colour.id);
      expect(result.id).toBe(colour.id);
      expect(result.value).toBe(colour.value);
      expect(result.label).toBe(colour.label);
    }
  });

  it('getStickyNoteColour falls back to the first palette colour for an unknown id', () => {
    const result = getStickyNoteColour('unknown' as any);
    expect(result.id).toBe(STICKY_NOTE_COLOURS[0].id);
    expect(result.value).toBe(STICKY_NOTE_COLOURS[0].value);
  });

  it('SEED_STICKY_NOTES covers each palette colour exactly once', () => {
    const usedColourIds = SEED_STICKY_NOTES.map((n) => n.colourId);
    const paletteIds = STICKY_NOTE_COLOURS.map((c) => c.id);
    expect(usedColourIds.sort()).toEqual([...paletteIds].sort());
  });
});
