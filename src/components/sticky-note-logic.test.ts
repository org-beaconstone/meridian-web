import { describe, it, expect } from 'vitest';
import {
  STICKY_NOTE_COLOURS,
  DEFAULT_COLOUR,
  isValidColour,
  getColourDef,
  validateNoteText,
  buildNote,
} from './sticky-note-logic';

describe('sticky-note-logic', () => {
  describe('STICKY_NOTE_COLOURS', () => {
    it('defines exactly 5 palette colours', () => {
      expect(STICKY_NOTE_COLOURS).toHaveLength(5);
    });

    it('includes yellow, coral, mint, sky and lavender', () => {
      const ids = STICKY_NOTE_COLOURS.map((c) => c.id);
      expect(ids).toContain('yellow');
      expect(ids).toContain('coral');
      expect(ids).toContain('mint');
      expect(ids).toContain('sky');
      expect(ids).toContain('lavender');
    });

    it('every colour has a non-empty accessible label', () => {
      for (const colour of STICKY_NOTE_COLOURS) {
        expect(colour.label.length).toBeGreaterThan(0);
      }
    });

    it('every colour carries valid hex bg and fg values', () => {
      for (const colour of STICKY_NOTE_COLOURS) {
        expect(colour.bg).toMatch(/^#[0-9a-f]{6}$/i);
        expect(colour.fg).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });
  });

  describe('isValidColour', () => {
    it('returns true for every palette colour id', () => {
      for (const { id } of STICKY_NOTE_COLOURS) {
        expect(isValidColour(id)).toBe(true);
      }
    });

    it('returns false for an unrecognised colour string', () => {
      expect(isValidColour('purple')).toBe(false);
      expect(isValidColour('red')).toBe(false);
    });

    it('returns false for an empty string', () => {
      expect(isValidColour('')).toBe(false);
    });
  });

  describe('DEFAULT_COLOUR', () => {
    it('DEFAULT_COLOUR is itself a valid palette colour', () => {
      expect(isValidColour(DEFAULT_COLOUR)).toBe(true);
    });
  });

  describe('getColourDef', () => {
    it('returns the definition whose id matches the requested colour', () => {
      for (const { id } of STICKY_NOTE_COLOURS) {
        const def = getColourDef(id);
        expect(def.id).toBe(id);
      }
    });
  });

  describe('validateNoteText', () => {
    it('returns null for valid non-empty text', () => {
      expect(validateNoteText('Great idea!')).toBeNull();
    });

    it('returns an error for an empty string', () => {
      expect(validateNoteText('')).not.toBeNull();
    });

    it('returns an error for whitespace-only text', () => {
      expect(validateNoteText('   ')).not.toBeNull();
    });

    it('returns an error when text exceeds 120 characters', () => {
      expect(validateNoteText('x'.repeat(121))).not.toBeNull();
    });

    it('accepts text at exactly 120 characters', () => {
      expect(validateNoteText('x'.repeat(120))).toBeNull();
    });
  });

  describe('buildNote', () => {
    it('preserves the selected colour on the created note', () => {
      const note = buildNote('Hello', 'coral', 0);
      expect(note.colour).toBe('coral');
    });

    it('trims leading and trailing whitespace from the note text', () => {
      const note = buildNote('  tidy  ', 'mint', 0);
      expect(note.text).toBe('tidy');
    });

    it('generates distinct ids for notes created in sequence', () => {
      const a = buildNote('A', 'yellow', 0);
      const b = buildNote('B', 'yellow', 1);
      expect(a.id).not.toBe(b.id);
    });

    it('notes built with different colours carry their respective colours', () => {
      const n1 = buildNote('Note', 'yellow', 0);
      const n2 = buildNote('Note', 'lavender', 1);
      expect(n1.colour).not.toBe(n2.colour);
    });

    it('distributes notes evenly across 5 animation lanes', () => {
      const lanes = Array.from({ length: 5 }, (_, i) => buildNote('n', 'sky', i));
      expect(lanes.map((n) => n.lane)).toEqual([0, 1, 2, 3, 4]);
    });

    it('wraps lane assignment back to 0 after the 5th note', () => {
      const note = buildNote('wrap', 'coral', 5);
      expect(note.lane).toBe(0);
    });
  });
});
