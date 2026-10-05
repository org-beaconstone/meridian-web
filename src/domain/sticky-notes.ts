// Sticky note domain logic for the Meridian marketing showcase
// All data is synthetic - no user credentials or financial details involved

export type StickyNoteColor = 'yellow' | 'green' | 'blue' | 'pink' | 'lavender';

export interface StickyNoteColorOption {
  id: StickyNoteColor;
  label: string;
  background: string;
  border: string;
}

/** Predefined brand-compatible sticky note colours. */
export const STICKY_NOTE_COLORS: StickyNoteColorOption[] = [
  { id: 'yellow', label: 'Sunny yellow', background: '#FFF4A3', border: '#C9A822' },
  { id: 'green', label: 'Soft green', background: '#C8E6C9', border: '#5A9862' },
  { id: 'blue', label: 'Sky blue', background: '#B3D9FF', border: '#4A8DC4' },
  { id: 'pink', label: 'Blossom pink', background: '#FFD6E0', border: '#C4637C' },
  { id: 'lavender', label: 'Light lavender', background: '#E8D5FF', border: '#8855C0' },
];

export interface StickyNote {
  id: string;
  text: string;
  color: StickyNoteColor;
  createdAt: number;
}

export function isValidColor(color: string): color is StickyNoteColor {
  return STICKY_NOTE_COLORS.some((c) => c.id === color);
}

/**
 * Create a sticky note.
 * Returns null when text is blank or the colour is not in the palette.
 */
export function createStickyNote(text: string, color: StickyNoteColor): StickyNote | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (!isValidColor(color)) return null;
  return {
    id: crypto.randomUUID(),
    text: trimmed,
    color,
    createdAt: Date.now(),
  };
}

export function getStickyNoteColorOption(color: StickyNoteColor): StickyNoteColorOption {
  return STICKY_NOTE_COLORS.find((c) => c.id === color)!;
}
