// Sticky notes on the Meridian whiteboard. Colour choice is validated here, apart from the UI.

export const STICKY_COLOURS = [
  { id: 'sun', label: 'Sun', hex: '#F6E7A1' },
  { id: 'leaf', label: 'Leaf', hex: '#C9E4C5' },
  { id: 'sky', label: 'Sky', hex: '#C5DDF0' },
  { id: 'blossom', label: 'Blossom', hex: '#F6D0D4' },
  { id: 'lilac', label: 'Lilac', hex: '#DDD4F0' },
] as const;

export type StickyColourId = (typeof STICKY_COLOURS)[number]['id'];

export interface StickyNote {
  id: string;
  text: string;
  colourId: StickyColourId;
}

export const DEFAULT_STICKY_COLOUR: StickyColourId = 'sun';

const MAX_STICKY_TEXT = 280;

export function isStickyColourId(value: string): value is StickyColourId {
  return STICKY_COLOURS.some((colour) => colour.id === value);
}

export function stickyColour(id: StickyColourId): (typeof STICKY_COLOURS)[number] {
  const colour = STICKY_COLOURS.find((item) => item.id === id);
  if (!colour) throw new Error(`Unknown sticky colour: ${id}`);
  return colour;
}

export type AddStickyResult = { ok: true; notes: StickyNote[] } | { ok: false; error: string };

export function addStickyNote(
  notes: readonly StickyNote[],
  input: { id: string; text: string; colourId: string },
): AddStickyResult {
  const text = input.text.trim();
  if (!text) return { ok: false, error: 'Write something on the sticky note' };
  if (text.length > MAX_STICKY_TEXT) {
    return { ok: false, error: 'Keep the sticky note to 280 characters or fewer' };
  }
  if (!input.id.trim()) return { ok: false, error: 'Sticky note id is required' };
  if (notes.some((note) => note.id === input.id)) {
    return { ok: false, error: 'Sticky note already exists' };
  }
  if (!isStickyColourId(input.colourId)) {
    return { ok: false, error: 'Choose a colour from the palette' };
  }
  return { ok: true, notes: [...notes, { id: input.id, text, colourId: input.colourId }] };
}
