// Sticky note domain for Meridian branding whiteboard
// All data is synthetic and local to the browser session

export const STICKY_COLOURS = [
  { id: 'yellow', label: 'Yellow', hex: '#FFF176' },
  { id: 'pink', label: 'Pink', hex: '#F8BBD9' },
  { id: 'green', label: 'Green', hex: '#C8E6C9' },
  { id: 'blue', label: 'Blue', hex: '#BBDEFB' },
  { id: 'purple', label: 'Purple', hex: '#E1BEE7' },
  { id: 'orange', label: 'Orange', hex: '#FFE0B2' },
] as const;

export type StickyColourId = (typeof STICKY_COLOURS)[number]['id'];

export const DEFAULT_STICKY_COLOUR: StickyColourId = 'yellow';

export const STICKY_TEXT_MAX_LENGTH = 200;

export interface StickyNote {
  id: string;
  text: string;
  colourId: StickyColourId;
}

/**
 * Validate sticky note text.
 * Returns null when valid, or an error string.
 */
export function validateStickyText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return 'Note text is required';
  if (trimmed.length > STICKY_TEXT_MAX_LENGTH) {
    return `Note text must be ${STICKY_TEXT_MAX_LENGTH} characters or fewer`;
  }
  return null;
}

/**
 * Look up a colour by id. Returns undefined for unknown ids.
 */
export function getStickyColour(id: StickyColourId) {
  return STICKY_COLOURS.find((c) => c.id === id);
}

/**
 * Create a new sticky note. Validates text; returns null on validation failure.
 */
export function createStickyNote(
  id: string,
  text: string,
  colourId: StickyColourId = DEFAULT_STICKY_COLOUR,
): StickyNote | null {
  if (validateStickyText(text) !== null) return null;
  return { id, text: text.trim(), colourId };
}

/**
 * Add a sticky note to a collection. Returns a new array (immutable).
 */
export function addStickyNote(notes: StickyNote[], note: StickyNote): StickyNote[] {
  return [...notes, note];
}

/**
 * Remove a sticky note by id. Returns a new array (immutable).
 */
export function removeStickyNote(notes: StickyNote[], id: string): StickyNote[] {
  return notes.filter((n) => n.id !== id);
}
