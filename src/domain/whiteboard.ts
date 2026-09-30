// Whiteboard domain model for Meridian demo
// Fictional data only - no real content stored externally

export type StickyColour = 'yellow' | 'pink' | 'blue' | 'green' | 'purple';

export interface StickyColourOption {
  id: StickyColour;
  label: string;
  hex: string;
  border: string;
}

export const STICKY_COLOURS: StickyColourOption[] = [
  { id: 'yellow', label: 'Yellow', hex: '#FFF3B0', border: '#E8D44D' },
  { id: 'pink', label: 'Pink', hex: '#FFD6E0', border: '#F4A5B8' },
  { id: 'blue', label: 'Blue', hex: '#C8E6FA', border: '#7BBDE0' },
  { id: 'green', label: 'Green', hex: '#C8F0D4', border: '#6FCC8A' },
  { id: 'purple', label: 'Purple', hex: '#E8D5F5', border: '#BC8EE0' },
];

export const DEFAULT_STICKY_COLOUR: StickyColour = 'yellow';

export interface StickyNote {
  id: string;
  text: string;
  colour: StickyColour;
  createdAt: string; // ISO date string
}

export interface WhiteboardState {
  notes: StickyNote[];
}

export function createInitialWhiteboardState(): WhiteboardState {
  return { notes: [] };
}

/**
 * Add a sticky note to the whiteboard.
 * Colour defaults to DEFAULT_STICKY_COLOUR if not provided.
 * Returns a new WhiteboardState (immutable update).
 */
export function addStickyNote(
  state: WhiteboardState,
  text: string,
  colour: StickyColour = DEFAULT_STICKY_COLOUR,
  id: string,
  createdAt: string,
): WhiteboardState {
  const note: StickyNote = {
    id,
    text: text.trim(),
    colour,
    createdAt,
  };
  return { ...state, notes: [...state.notes, note] };
}

/**
 * Remove a sticky note from the whiteboard by id.
 * Returns a new WhiteboardState (immutable update).
 */
export function removeStickyNote(state: WhiteboardState, id: string): WhiteboardState {
  return { ...state, notes: state.notes.filter((n) => n.id !== id) };
}

/**
 * Look up a colour option by id. Falls back to yellow.
 */
export function getStickyColour(id: StickyColour): StickyColourOption {
  return STICKY_COLOURS.find((c) => c.id === id) ?? STICKY_COLOURS[0];
}
