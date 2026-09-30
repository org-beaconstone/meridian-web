// Pure domain logic for the sticky note showcase feature.
// No React dependencies – safe to import in any environment.

export type StickyNoteColour = 'yellow' | 'coral' | 'mint' | 'sky' | 'lavender';

export interface StickyNoteColourDef {
  id: StickyNoteColour;
  /** CSS hex background colour */
  bg: string;
  /** CSS hex foreground (text) colour */
  fg: string;
  /** Human-readable label used for aria-label and UI copy */
  label: string;
}

export const STICKY_NOTE_COLOURS: StickyNoteColourDef[] = [
  { id: 'yellow',   bg: '#fef3a7', fg: '#5c540a', label: 'Yellow'   },
  { id: 'coral',    bg: '#ffd6cc', fg: '#6b2616', label: 'Coral'    },
  { id: 'mint',     bg: '#d1f2d3', fg: '#1a5c22', label: 'Mint'     },
  { id: 'sky',      bg: '#d0e4f7', fg: '#173e66', label: 'Sky'      },
  { id: 'lavender', bg: '#e8d5f5', fg: '#3f1a66', label: 'Lavender' },
];

export const DEFAULT_COLOUR: StickyNoteColour = 'yellow';

export interface StickyNoteItem {
  id: string;
  text: string;
  colour: StickyNoteColour;
  /** 0–4 horizontal lane controlling the note's vertical offset in the canvas */
  lane: number;
  /** CSS animation-delay in seconds, staggered by lane */
  delay: number;
}

/** Returns true when `colour` matches a palette entry id. */
export function isValidColour(colour: string): colour is StickyNoteColour {
  return STICKY_NOTE_COLOURS.some((c) => c.id === colour);
}

/** Returns the colour definition for `colour`. Assumes `isValidColour` was checked. */
export function getColourDef(colour: StickyNoteColour): StickyNoteColourDef {
  return STICKY_NOTE_COLOURS.find((c) => c.id === colour)!;
}

/**
 * Validates a sticky note's text content.
 * Returns an error string when invalid, or `null` when valid.
 */
export function validateNoteText(text: string): string | null {
  if (!text.trim()) return 'Note text is required';
  if (text.trim().length > 120) return 'Note text must be 120 characters or fewer';
  return null;
}

/**
 * Creates a new StickyNoteItem from validated inputs.
 * `index` is the total number of notes already on the canvas and is used
 * to distribute notes evenly across the 5 animation lanes.
 */
export function buildNote(
  text: string,
  colour: StickyNoteColour,
  index: number,
): StickyNoteItem {
  return {
    id: crypto.randomUUID(),
    text: text.trim(),
    colour,
    lane: index % 5,
    delay: (index % 5) * 1.5,
  };
}
