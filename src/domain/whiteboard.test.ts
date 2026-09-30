import { describe, expect, it } from 'vitest';
import {
  addStickyNote,
  createInitialWhiteboardState,
  DEFAULT_STICKY_COLOUR,
  removeStickyNote,
} from './whiteboard';

describe('whiteboard sticky note colour', () => {
  it('applies the selected colour to a newly added sticky note', () => {
    const state = createInitialWhiteboardState();
    const next = addStickyNote(state, 'Q3 goals', 'blue', 'note-1', '2026-09-18');
    expect(next.notes).toHaveLength(1);
    expect(next.notes[0].colour).toBe('blue');
    expect(next.notes[0].text).toBe('Q3 goals');
  });

  it('uses the default colour when no colour argument is provided', () => {
    const state = createInitialWhiteboardState();
    const next = addStickyNote(state, 'Remind team', DEFAULT_STICKY_COLOUR, 'note-2', '2026-09-18');
    expect(next.notes[0].colour).toBe(DEFAULT_STICKY_COLOUR);
    expect(DEFAULT_STICKY_COLOUR).toBe('yellow');
  });

  it('preserves each note\'s individual colour when multiple notes are added', () => {
    let state = createInitialWhiteboardState();
    state = addStickyNote(state, 'Note A', 'pink', 'note-a', '2026-09-18');
    state = addStickyNote(state, 'Note B', 'green', 'note-b', '2026-09-18');
    state = addStickyNote(state, 'Note C', 'purple', 'note-c', '2026-09-18');
    expect(state.notes).toHaveLength(3);
    expect(state.notes[0].colour).toBe('pink');
    expect(state.notes[1].colour).toBe('green');
    expect(state.notes[2].colour).toBe('purple');
    // Removing one note does not affect the others
    const trimmed = removeStickyNote(state, 'note-b');
    expect(trimmed.notes).toHaveLength(2);
    expect(trimmed.notes.map((n) => n.colour)).toEqual(['pink', 'purple']);
  });
});
