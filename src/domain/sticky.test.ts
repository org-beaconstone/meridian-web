import { describe, expect, it } from 'vitest';
import { STICKY_COLOURS, addStickyNote, stickyColour } from './sticky';

describe('sticky note colour palette', () => {
  it('stores the colour chosen from the palette', () => {
    const result = addStickyNote([], {
      id: 'note-1',
      text: 'Review the launch plan',
      colourId: 'sky',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.notes).toEqual([
      { id: 'note-1', text: 'Review the launch plan', colourId: 'sky' },
    ]);
    expect(stickyColour('sky')).toEqual({ id: 'sky', label: 'Sky', hex: '#C5DDF0' });
  });

  it('rejects a colour that is not on the palette', () => {
    const result = addStickyNote([], {
      id: 'note-2',
      text: 'Call the branch',
      colourId: 'navy',
    });

    expect(result).toEqual({ ok: false, error: 'Choose a colour from the palette' });
  });

  it('keeps a separate colour on each sticky note', () => {
    const first = addStickyNote([], { id: 'a', text: 'Idea', colourId: 'sun' });
    if (!first.ok) throw new Error(first.error);
    const second = addStickyNote(first.notes, {
      id: 'b',
      text: 'Follow up',
      colourId: 'blossom',
    });

    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.notes.map((note) => note.colourId)).toEqual(['sun', 'blossom']);
    expect(STICKY_COLOURS.map((colour) => colour.id)).toEqual([
      'sun',
      'leaf',
      'sky',
      'blossom',
      'lilac',
    ]);
  });
});
