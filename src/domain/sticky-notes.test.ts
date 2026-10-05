import { describe, it, expect } from 'vitest';
import {
  STICKY_NOTE_COLORS,
  createStickyNote,
  isValidColor,
  getStickyNoteColorOption,
} from './sticky-notes';

describe('sticky-notes', () => {
  it('STICKY_NOTE_COLORS defines 5 distinct colour options', () => {
    expect(STICKY_NOTE_COLORS).toHaveLength(5);
    const ids = STICKY_NOTE_COLORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(5);
    // Each option has a non-empty label and valid CSS colour strings
    for (const option of STICKY_NOTE_COLORS) {
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.background).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(option.border).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('isValidColor accepts every palette colour and rejects unknown strings', () => {
    for (const { id } of STICKY_NOTE_COLORS) {
      expect(isValidColor(id)).toBe(true);
    }
    expect(isValidColor('red')).toBe(false);
    expect(isValidColor('')).toBe(false);
    expect(isValidColor('Purple')).toBe(false);
    expect(isValidColor('Yellow')).toBe(false); // case-sensitive
  });

  it('createStickyNote returns a note with the correct colour and whitespace-trimmed text', () => {
    const note = createStickyNote('  Hello world  ', 'yellow');
    expect(note).not.toBeNull();
    expect(note!.text).toBe('Hello world');
    expect(note!.color).toBe('yellow');
    expect(typeof note!.id).toBe('string');
    expect(note!.id.length).toBeGreaterThan(0);
    expect(typeof note!.createdAt).toBe('number');
  });

  it('createStickyNote returns null for blank or whitespace-only text', () => {
    expect(createStickyNote('', 'yellow')).toBeNull();
    expect(createStickyNote('   ', 'green')).toBeNull();
    expect(createStickyNote('\t\n', 'blue')).toBeNull();
  });

  it('getStickyNoteColorOption returns the matching option for every valid colour', () => {
    for (const expected of STICKY_NOTE_COLORS) {
      const result = getStickyNoteColorOption(expected.id);
      expect(result).toEqual(expected);
    }
  });
});
