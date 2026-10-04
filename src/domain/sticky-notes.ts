// Sticky notes for the marketing showcase. Colour choice is validated here, apart from the UI.

export const STICKY_NOTE_COLOURS = [
  { id: 'gold', label: 'Gold', background: '#F3E3A4', ink: '#3D3112' },
  { id: 'sage', label: 'Sage', background: '#D5E6D0', ink: '#1C3A24' },
  { id: 'sky', label: 'Sky', background: '#D2E3F1', ink: '#163044' },
  { id: 'blush', label: 'Blush', background: '#F6D5CF', ink: '#4A241C' },
  { id: 'lilac', label: 'Lilac', background: '#E3D6EF', ink: '#322048' },
] as const;

export type StickyNoteColourId = (typeof STICKY_NOTE_COLOURS)[number]['id'];

export interface StickyNoteColour {
  id: StickyNoteColourId;
  label: string;
  background: string;
  ink: string;
}

export interface StickyNote {
  id: string;
  text: string;
  colourId: StickyNoteColourId;
}

export const DEFAULT_STICKY_NOTE_COLOUR: StickyNoteColourId = 'gold';

export const MAX_STICKY_NOTE_LENGTH = 80;

export function isStickyNoteColourId(value: string): value is StickyNoteColourId {
  return STICKY_NOTE_COLOURS.some((colour) => colour.id === value);
}

export function stickyNoteColour(id: StickyNoteColourId): StickyNoteColour {
  const colour = STICKY_NOTE_COLOURS.find((item) => item.id === id);
  if (!colour) throw new Error(`Unknown sticky note colour: ${id}`);
  return colour;
}

export type AddStickyNoteResult = { ok: true; notes: StickyNote[] } | { ok: false; error: string };

export function addStickyNote(
  notes: readonly StickyNote[],
  input: { id: string; text: string; colourId: string },
): AddStickyNoteResult {
  const text = input.text.trim();
  if (!text) return { ok: false, error: 'Write something on the sticky note' };
  if (text.length > MAX_STICKY_NOTE_LENGTH) {
    return {
      ok: false,
      error: `Keep the sticky note to ${MAX_STICKY_NOTE_LENGTH} characters or fewer`,
    };
  }
  if (!input.id.trim()) return { ok: false, error: 'Sticky note id is required' };
  if (notes.some((note) => note.id === input.id)) {
    return { ok: false, error: 'Sticky note already exists' };
  }
  if (!isStickyNoteColourId(input.colourId)) {
    return { ok: false, error: 'Choose a colour from the palette' };
  }
  return {
    ok: true,
    notes: [...notes, { id: input.id, text, colourId: input.colourId }],
  };
}
