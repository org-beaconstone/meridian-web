import { describe, it, expect } from 'vitest';
import {
  createStickyNote,
  DEFAULT_STICKY_NOTE_COLOR,
  isStickyNoteColor,
  MAX_STICKY_NOTE_LENGTH,
  STICKY_NOTE_COLOR_KEYS,
  STICKY_NOTE_COLORS,
  validateStickyNoteText,
} from './sticky-note';

describe('sticky-note', () => {
  describe('STICKY_NOTE_COLORS', () => {
    it('exposes all five predefined brand-compatible colours', () => {
      expect(STICKY_NOTE_COLOR_KEYS).toHaveLength(5);
      for (const key of STICKY_NOTE_COLOR_KEYS) {
        const def = STICKY_NOTE_COLORS[key];
        expect(def.label).toBeTruthy();
        expect(def.bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(def.text).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });

    it('default colour is yellow and present in the palette', () => {
      expect(DEFAULT_STICKY_NOTE_COLOR).toBe('yellow');
      expect(STICKY_NOTE_COLORS[DEFAULT_STICKY_NOTE_COLOR]).toBeDefined();
    });
  });

  describe('isStickyNoteColor', () => {
    it('accepts every key in STICKY_NOTE_COLORS', () => {
      for (const key of STICKY_NOTE_COLOR_KEYS) {
        expect(isStickyNoteColor(key)).toBe(true);
      }
    });

    it('rejects unknown strings, numbers, and null', () => {
      expect(isStickyNoteColor('purple')).toBe(false);
      expect(isStickyNoteColor(42)).toBe(false);
      expect(isStickyNoteColor(null)).toBe(false);
    });
  });

  describe('validateStickyNoteText', () => {
    it('returns null for valid non-empty text', () => {
      expect(validateStickyNoteText('Hello, world!')).toBeNull();
    });

    it('returns an error message for empty or whitespace-only text', () => {
      expect(validateStickyNoteText('')).toBe('Note text is required');
      expect(validateStickyNoteText('   ')).toBe('Note text is required');
    });

    it(`returns an error for text exceeding ${MAX_STICKY_NOTE_LENGTH} characters`, () => {
      const tooLong = 'x'.repeat(MAX_STICKY_NOTE_LENGTH + 1);
      const error = validateStickyNoteText(tooLong);
      expect(error).toContain(`${MAX_STICKY_NOTE_LENGTH}`);
    });

    it(`accepts text at exactly the ${MAX_STICKY_NOTE_LENGTH}-character limit`, () => {
      expect(validateStickyNoteText('x'.repeat(MAX_STICKY_NOTE_LENGTH))).toBeNull();
    });
  });

  describe('createStickyNote', () => {
    it('creates a note with the specified colour', () => {
      const note = createStickyNote('Pick up milk', 'rose');
      expect(note.color).toBe('rose');
      expect(note.text).toBe('Pick up milk');
      expect(note.id).toBeTruthy();
    });

    it('trims leading and trailing whitespace from the text', () => {
      const note = createStickyNote('  spaced  ', 'sky');
      expect(note.text).toBe('spaced');
    });

    it('assigns unique ids to distinct notes', () => {
      const a = createStickyNote('A', 'yellow');
      const b = createStickyNote('B', 'yellow');
      expect(a.id).not.toBe(b.id);
    });
  });
});
