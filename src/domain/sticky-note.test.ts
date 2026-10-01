import { describe, it, expect } from 'vitest';
import {
  STICKY_NOTE_COLOURS,
  DEFAULT_STICKY_NOTE_COLOUR,
  createStickyNote,
  getStickyNoteColour,
  type StickyNoteColourId,
} from './sticky-note';

describe('sticky-note', () => {
  describe('STICKY_NOTE_COLOURS palette', () => {
    it('contains all five expected colour IDs', () => {
      const ids = STICKY_NOTE_COLOURS.map((c) => c.id);
      expect(ids).toContain('yellow');
      expect(ids).toContain('blue');
      expect(ids).toContain('green');
      expect(ids).toContain('pink');
      expect(ids).toContain('orange');
      expect(ids).toHaveLength(5);
    });

    it('default colour is present in the palette', () => {
      const ids = STICKY_NOTE_COLOURS.map((c) => c.id);
      expect(ids).toContain(DEFAULT_STICKY_NOTE_COLOUR);
    });

    it('every colour option has a valid hex background and text', () => {
      const hexPattern = /^#[0-9A-Fa-f]{6}$/;
      STICKY_NOTE_COLOURS.forEach((colour) => {
        expect(colour.background).toMatch(hexPattern);
        expect(colour.text).toMatch(hexPattern);
        expect(colour.label).toBeTruthy();
      });
    });
  });

  describe('createStickyNote', () => {
    it('returns a note with the chosen colour', () => {
      const colours: StickyNoteColourId[] = ['yellow', 'blue', 'green', 'pink', 'orange'];
      colours.forEach((colour) => {
        const note = createStickyNote('Hello', colour, `id-${colour}`);
        expect(note.colour).toBe(colour);
        expect(note.text).toBe('Hello');
        expect(note.id).toBe(`id-${colour}`);
      });
    });

    it('trims whitespace from the note text', () => {
      const note = createStickyNote('  great idea  ', 'yellow', 'note-1');
      expect(note.text).toBe('great idea');
    });

    it('throws when text is empty or whitespace-only', () => {
      expect(() => createStickyNote('', 'yellow', 'note-1')).toThrow('text is required');
      expect(() => createStickyNote('   ', 'blue', 'note-2')).toThrow('text is required');
    });
  });

  describe('getStickyNoteColour', () => {
    it('returns the colour option for each valid ID', () => {
      STICKY_NOTE_COLOURS.forEach((expected) => {
        const result = getStickyNoteColour(expected.id);
        expect(result).toEqual(expected);
      });
    });

    it('throws for an unknown colour ID', () => {
      expect(() => getStickyNoteColour('purple' as StickyNoteColourId)).toThrow(
        'Unknown sticky note colour',
      );
    });
  });
});
