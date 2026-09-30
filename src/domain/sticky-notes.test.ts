import { describe, it, expect } from 'vitest';
import {
  STICKY_NOTE_COLOURS,
  DEFAULT_STICKY_NOTE_COLOUR,
  COLOUR_HEX,
  COLOUR_LABELS,
  isStickyNoteColour,
  validateStickyNoteText,
  createStickyNote,
} from './sticky-notes';

describe('sticky-notes', () => {
  describe('STICKY_NOTE_COLOURS palette', () => {
    it('exports exactly 5 colours', () => {
      expect(STICKY_NOTE_COLOURS).toHaveLength(5);
    });

    it('includes yellow, green, blue, pink, and purple', () => {
      for (const colour of ['yellow', 'green', 'blue', 'pink', 'purple'] as const) {
        expect(STICKY_NOTE_COLOURS).toContain(colour);
      }
    });

    it('every colour has a valid 6-digit hex value in COLOUR_HEX', () => {
      for (const colour of STICKY_NOTE_COLOURS) {
        expect(COLOUR_HEX[colour]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });

    it('every colour has a non-empty human-readable label in COLOUR_LABELS', () => {
      for (const colour of STICKY_NOTE_COLOURS) {
        expect(typeof COLOUR_LABELS[colour]).toBe('string');
        expect(COLOUR_LABELS[colour].length).toBeGreaterThan(0);
      }
    });
  });

  describe('DEFAULT_STICKY_NOTE_COLOUR', () => {
    it('is a member of the supported palette', () => {
      expect(STICKY_NOTE_COLOURS).toContain(DEFAULT_STICKY_NOTE_COLOUR);
    });
  });

  describe('isStickyNoteColour', () => {
    it('returns true for each valid colour', () => {
      for (const colour of STICKY_NOTE_COLOURS) {
        expect(isStickyNoteColour(colour)).toBe(true);
      }
    });

    it('returns false for values outside the palette', () => {
      expect(isStickyNoteColour('red')).toBe(false);
      expect(isStickyNoteColour('orange')).toBe(false);
      expect(isStickyNoteColour('')).toBe(false);
      expect(isStickyNoteColour('Yellow')).toBe(false); // case-sensitive
    });
  });

  describe('validateStickyNoteText', () => {
    it('returns null for a valid non-empty string', () => {
      expect(validateStickyNoteText('Stand-up at 10 am')).toBeNull();
    });

    it('returns an error for an empty string', () => {
      expect(validateStickyNoteText('')).toBe('Note text is required');
    });

    it('returns an error for whitespace-only input', () => {
      expect(validateStickyNoteText('   ')).toBe('Note text is required');
    });

    it('returns an error when text exceeds 80 characters', () => {
      const error = validateStickyNoteText('a'.repeat(81));
      expect(error).not.toBeNull();
      expect(error).toContain('80');
    });

    it('returns null for text exactly at the 80-character limit', () => {
      expect(validateStickyNoteText('a'.repeat(80))).toBeNull();
    });
  });

  describe('createStickyNote', () => {
    it('stores the supplied id, trimmed text, and chosen colour', () => {
      const note = createStickyNote('sn-1', '  Buy oat milk  ', 'green');
      expect(note.id).toBe('sn-1');
      expect(note.text).toBe('Buy oat milk');
      expect(note.colour).toBe('green');
    });

    it('applies the selected colour regardless of which palette entry is chosen', () => {
      for (const colour of STICKY_NOTE_COLOURS) {
        const note = createStickyNote('sn-colour', 'test', colour);
        expect(note.colour).toBe(colour);
      }
    });

    it('sets x within the visible 10–90 % range across multiple calls', () => {
      for (let i = 0; i < 30; i++) {
        const note = createStickyNote(`sn-x-${i}`, 'test', 'blue');
        expect(note.x).toBeGreaterThanOrEqual(10);
        expect(note.x).toBeLessThanOrEqual(90);
      }
    });

    it('sets duration within the 15–25 s range across multiple calls', () => {
      for (let i = 0; i < 30; i++) {
        const note = createStickyNote(`sn-d-${i}`, 'test', 'pink');
        expect(note.duration).toBeGreaterThanOrEqual(15);
        expect(note.duration).toBeLessThanOrEqual(25);
      }
    });

    it('returns distinct notes for distinct ids', () => {
      const a = createStickyNote('sn-a', 'Alpha', 'yellow');
      const b = createStickyNote('sn-b', 'Beta', 'purple');
      expect(a.id).not.toBe(b.id);
      expect(a.text).not.toBe(b.text);
      expect(a.colour).not.toBe(b.colour);
    });
  });
});
