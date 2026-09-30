// Sticky note domain logic for the interactive whiteboard showcase

export type StickyNoteColour = 'yellow' | 'green' | 'blue' | 'pink' | 'purple';

export const STICKY_NOTE_COLOURS: readonly StickyNoteColour[] = [
  'yellow',
  'green',
  'blue',
  'pink',
  'purple',
];

export const DEFAULT_STICKY_NOTE_COLOUR: StickyNoteColour = 'yellow';

export const COLOUR_HEX: Record<StickyNoteColour, string> = {
  yellow: '#FFE066',
  green: '#B8E994',
  blue: '#A3C4F3',
  pink: '#FFB3C6',
  purple: '#C5A3FF',
};

export const COLOUR_LABELS: Record<StickyNoteColour, string> = {
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
  pink: 'Pink',
  purple: 'Purple',
};

export interface StickyNoteItem {
  id: string;
  text: string;
  colour: StickyNoteColour;
  /** Starting horizontal position as a percentage (10–90). */
  x: number;
  /** Float animation duration in seconds (15–25). */
  duration: number;
  /** Animation delay in seconds. */
  delay: number;
}

export function isStickyNoteColour(value: string): value is StickyNoteColour {
  return (STICKY_NOTE_COLOURS as readonly string[]).includes(value);
}

/**
 * Validate sticky note text.
 * Returns an error message string, or null when the text is valid.
 */
export function validateStickyNoteText(text: string): string | null {
  if (!text.trim()) return 'Note text is required';
  if (text.trim().length > 80) return 'Note text must be 80 characters or fewer';
  return null;
}

/**
 * Construct a new StickyNoteItem with randomised animation properties.
 */
export function createStickyNote(
  id: string,
  text: string,
  colour: StickyNoteColour,
): StickyNoteItem {
  return {
    id,
    text: text.trim(),
    colour,
    x: Math.random() * 80 + 10, // 10–90 % to keep the note visible
    duration: Math.random() * 10 + 15, // 15–25 s
    delay: 0,
  };
}
