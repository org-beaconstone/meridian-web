import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STICKY_NOTE_COLOUR,
  MAX_STICKY_NOTE_LENGTH,
  STICKY_NOTE_COLOURS,
  addStickyNote,
  isStickyNoteColourId,
  stickyNoteColour,
} from './sticky-notes';

describe('sticky note colour palette', () => {
  it('offers a small set of brand-compatible colours', () => {
    expect(STICKY_NOTE_COLOURS.map((colour) => colour.id)).toEqual([
      'gold',
      'sage',
      'sky',
      'blush',
      'lilac',
    ]);
    expect(new Set(STICKY_NOTE_COLOURS.map((colour) => colour.id)).size).toBe(
      STICKY_NOTE_COLOURS.length,
    );
    for (const colour of STICKY_NOTE_COLOURS) {
      expect(colour.label.trim()).not.toBe('');
      expect(colour.background).toMatch(/^#[0-9A-F]{6}$/);
      expect(colour.ink).toMatch(/^#[0-9A-F]{6}$/);
      expect(colour.background).not.toBe(colour.ink);
    }
    expect(DEFAULT_STICKY_NOTE_COLOUR).toBe('gold');
    expect(isStickyNoteColourId(DEFAULT_STICKY_NOTE_COLOUR)).toBe(true);
  });

  it('stores the colour chosen from the palette', () => {
    const result = addStickyNote([], {
      id: 'note-1',
      text: '  Review the launch plan  ',
      colourId: 'sky',
    });

    expect(result).toEqual({
      ok: true,
      notes: [{ id: 'note-1', text: 'Review the launch plan', colourId: 'sky' }],
    });
    expect(stickyNoteColour('sky')).toEqual({
      id: 'sky',
      label: 'Sky',
      background: '#D2E3F1',
      ink: '#163044',
    });
  });

  it('keeps a separate colour on each sticky note', () => {
    const first = addStickyNote([], { id: 'a', text: 'Idea', colourId: 'gold' });
    if (!first.ok) throw new Error(first.error);
    const second = addStickyNote(first.notes, {
      id: 'b',
      text: 'Follow up',
      colourId: 'blush',
    });

    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.notes.map((note) => note.colourId)).toEqual(['gold', 'blush']);
  });

  it('rejects a colour that is not on the palette', () => {
    expect(addStickyNote([], { id: 'note-2', text: 'Call the branch', colourId: 'navy' })).toEqual({
      ok: false,
      error: 'Choose a colour from the palette',
    });
    expect(isStickyNoteColourId('#F3E3A4')).toBe(false);
    expect(isStickyNoteColourId('')).toBe(false);
  });

  it('rejects an empty note and text that is too long', () => {
    expect(addStickyNote([], { id: 'note-3', text: '   ', colourId: 'sage' })).toEqual({
      ok: false,
      error: 'Write something on the sticky note',
    });
    expect(
      addStickyNote([], {
        id: 'note-4',
        text: 'a'.repeat(MAX_STICKY_NOTE_LENGTH + 1),
        colourId: 'lilac',
      }),
    ).toEqual({
      ok: false,
      error: `Keep the sticky note to ${MAX_STICKY_NOTE_LENGTH} characters or fewer`,
    });
  });

  it('rejects a missing or duplicate id', () => {
    expect(addStickyNote([], { id: ' ', text: 'Hello', colourId: 'gold' })).toEqual({
      ok: false,
      error: 'Sticky note id is required',
    });
    const created = addStickyNote([], { id: 'same', text: 'Hello', colourId: 'sage' });
    if (!created.ok) throw new Error(created.error);
    expect(addStickyNote(created.notes, { id: 'same', text: 'Again', colourId: 'sky' })).toEqual({
      ok: false,
      error: 'Sticky note already exists',
    });
  });
});
