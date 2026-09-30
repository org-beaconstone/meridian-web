import { describe, it, expect } from 'vitest';
import {
  STICKY_NOTE_COLORS,
  DEFAULT_STICKY_COLOR,
  getColorHex,
  type StickyNoteColor,
} from './stickyNoteData';

describe('StickyNote colour palette', () => {
  it('exports at least 2 colour options each with id, hex and label', () => {
    expect(STICKY_NOTE_COLORS.length).toBeGreaterThanOrEqual(2);
    for (const colour of STICKY_NOTE_COLORS) {
      expect(colour.id).toBeTruthy();
      expect(colour.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(colour.label).toBeTruthy();
    }
  });

  it('all colour ids are unique', () => {
    const ids = STICKY_NOTE_COLORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(STICKY_NOTE_COLORS.length);
  });

  it('getColorHex returns the correct hex for a known colour', () => {
    for (const colour of STICKY_NOTE_COLORS) {
      expect(getColorHex(colour.id)).toBe(colour.hex);
    }
  });

  it('getColorHex returns yellow (#FFE566) as fallback for an unknown colour', () => {
    expect(getColorHex('unknown' as StickyNoteColor)).toBe('#FFE566');
  });

  it('DEFAULT_STICKY_COLOR is included in STICKY_NOTE_COLORS', () => {
    const ids = STICKY_NOTE_COLORS.map((c) => c.id);
    expect(ids).toContain(DEFAULT_STICKY_COLOR);
  });
});
