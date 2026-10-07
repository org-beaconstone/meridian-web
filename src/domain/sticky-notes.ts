// Sticky note colour palette and domain types for the marketing showcase.
// All colours are brand-compatible pastels — no unrestricted colour picker.

export const STICKY_NOTE_COLOURS = [
  { id: 'yellow', label: 'Yellow', value: '#FFF9C4' },
  { id: 'pink', label: 'Pink', value: '#FECDD3' },
  { id: 'mint', label: 'Mint', value: '#BBF7D0' },
  { id: 'sky', label: 'Sky', value: '#BAE6FD' },
  { id: 'peach', label: 'Peach', value: '#FED7AA' },
] as const;

export type StickyNoteColourId = (typeof STICKY_NOTE_COLOURS)[number]['id'];

export const DEFAULT_STICKY_NOTE_COLOUR_ID: StickyNoteColourId = 'yellow';

export interface StickyNoteEntry {
  id: string;
  text: string;
  colourId: StickyNoteColourId;
}

/** Return the colour object for a given id; falls back to the first colour for unknown ids. */
export function getStickyNoteColour(
  id: StickyNoteColourId,
): (typeof STICKY_NOTE_COLOURS)[number] {
  return STICKY_NOTE_COLOURS.find((c) => c.id === id) ?? STICKY_NOTE_COLOURS[0];
}

/** Pre-seeded notes shown on first load, one per palette colour. */
export const SEED_STICKY_NOTES: StickyNoteEntry[] = [
  { id: 'seed-1', text: 'Clarity is everything.', colourId: 'yellow' },
  { id: 'seed-2', text: 'Big plans, small steps.', colourId: 'pink' },
  { id: 'seed-3', text: 'Balance = freedom.', colourId: 'mint' },
  { id: 'seed-4', text: 'Keep it simple.', colourId: 'sky' },
  { id: 'seed-5', text: 'Make room for what matters.', colourId: 'peach' },
];
