import { describe, it, expect } from 'vitest';
import {
  STICKY_COLOURS,
  DEFAULT_STICKY_COLOUR,
  STICKY_TEXT_MAX_LENGTH,
  validateStickyText,
  getStickyColour,
  createStickyNote,
  addStickyNote,
  removeStickyNote,
} from './sticky';

describe('sticky notes', () => {
  describe('validateStickyText', () => {
    it('returns null for valid text', () => {
      expect(validateStickyText('Finish the quarterly report')).toBeNull();
    });

    it('returns an error for empty text', () => {
      expect(validateStickyText('')).not.toBeNull();
      expect(validateStickyText('   ')).not.toBeNull();
    });

    it('returns an error when text exceeds the maximum length', () => {
      const overLimit = 'x'.repeat(STICKY_TEXT_MAX_LENGTH + 1);
      const error = validateStickyText(overLimit);
      expect(error).not.toBeNull();
      expect(error).toContain(`${STICKY_TEXT_MAX_LENGTH}`);
    });

    it('accepts text exactly at the maximum length', () => {
      const atLimit = 'x'.repeat(STICKY_TEXT_MAX_LENGTH);
      expect(validateStickyText(atLimit)).toBeNull();
    });
  });

  describe('getStickyColour', () => {
    it('returns colour info for a known colour id', () => {
      const colour = getStickyColour('yellow');
      expect(colour).toBeDefined();
      expect(colour?.id).toBe('yellow');
      expect(colour?.hex).toBeTruthy();
      expect(colour?.label).toBeTruthy();
    });
  });

  describe('createStickyNote', () => {
    it('creates a sticky note with the specified colour', () => {
      const note = createStickyNote('note-1', 'Buy oat milk', 'pink');
      expect(note).not.toBeNull();
      expect(note?.id).toBe('note-1');
      expect(note?.text).toBe('Buy oat milk');
      expect(note?.colourId).toBe('pink');
    });

    it('defaults to the default colour when none is specified', () => {
      const note = createStickyNote('note-2', 'Review pull request');
      expect(note?.colourId).toBe(DEFAULT_STICKY_COLOUR);
    });

    it('trims surrounding whitespace from the text', () => {
      const note = createStickyNote('note-3', '  call dentist  ');
      expect(note?.text).toBe('call dentist');
    });

    it('returns null for empty text', () => {
      expect(createStickyNote('note-4', '')).toBeNull();
      expect(createStickyNote('note-5', '   ')).toBeNull();
    });

    it('returns null when text exceeds the maximum length', () => {
      const overLimit = 'x'.repeat(STICKY_TEXT_MAX_LENGTH + 1);
      expect(createStickyNote('note-6', overLimit)).toBeNull();
    });
  });

  describe('addStickyNote', () => {
    it('appends a note to the collection without mutating the original', () => {
      const original = [{ id: 'a', text: 'First', colourId: 'yellow' as const }];
      const note = { id: 'b', text: 'Second', colourId: 'blue' as const };
      const result = addStickyNote(original, note);
      expect(result).toHaveLength(2);
      expect(result[1]).toEqual(note);
      expect(original).toHaveLength(1); // original unchanged
    });
  });

  describe('removeStickyNote', () => {
    it('removes a note by id without mutating the original', () => {
      const notes = [
        { id: 'a', text: 'Keep this', colourId: 'green' as const },
        { id: 'b', text: 'Remove this', colourId: 'orange' as const },
      ];
      const result = removeStickyNote(notes, 'b');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a');
      expect(notes).toHaveLength(2); // original unchanged
    });

    it('returns the same collection when the id is not found', () => {
      const notes = [{ id: 'a', text: 'Only note', colourId: 'purple' as const }];
      const result = removeStickyNote(notes, 'non-existent');
      expect(result).toHaveLength(1);
    });
  });

  describe('STICKY_COLOURS constant', () => {
    it('every colour entry has a non-empty hex value', () => {
      STICKY_COLOURS.forEach((colour) => {
        expect(colour.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });
});
