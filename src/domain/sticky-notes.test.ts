import { describe, it, expect } from 'vitest';
import {
  createStickyNote,
  DEFAULT_STICKY_NOTE_COLOR,
  isValidStickyNoteColor,
  STICKY_NOTE_COLORS,
} from './model';

describe('sticky note colour selection', () => {
  it('applies the default colour when no colour is specified', () => {
    const note = createStickyNote('Hello, world!');
    expect(note.color).toBe(DEFAULT_STICKY_NOTE_COLOR);
  });

  it('preserves the caller-specified colour on the created note', () => {
    const note = createStickyNote('Meeting notes', 'lavender');
    expect(note.color).toBe('lavender');
  });

  it('accepts every colour in the predefined palette', () => {
    for (const { id } of STICKY_NOTE_COLORS) {
      expect(isValidStickyNoteColor(id)).toBe(true);
    }
  });

  it('rejects colours that are not in the palette', () => {
    expect(isValidStickyNoteColor('red')).toBe(false);
    expect(isValidStickyNoteColor('')).toBe(false);
    expect(isValidStickyNoteColor('#FFF4C2')).toBe(false);
  });

  it('palette has unique IDs and each colour has non-empty background and border values', () => {
    const ids = STICKY_NOTE_COLORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const { background, border } of STICKY_NOTE_COLORS) {
      expect(background).toBeTruthy();
      expect(border).toBeTruthy();
    }
  });
});
