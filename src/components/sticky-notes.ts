/**
 * Helpers that build on StickyNoteColours.ts:
 * look-ups and a createStickyNote factory for testable note creation logic.
 */
import { STICKY_NOTE_COLOURS, type StickyNoteColourValue } from './StickyNoteColours';

export interface StickyNoteEntry {
  id: string;
  text: string;
  colour: StickyNoteColourValue;
  x: number;
  rotation: number;
  duration: number;
  delay: number;
}

/** Return the colour object whose value matches, or undefined. */
export function getColourByValue(
  value: string,
): (typeof STICKY_NOTE_COLOURS)[number] | undefined {
  return STICKY_NOTE_COLOURS.find((c) => c.value === value);
}

/** True when the value is present in the palette. */
export function isValidColourValue(value: string): value is StickyNoteColourValue {
  return STICKY_NOTE_COLOURS.some((c) => c.value === value);
}

/**
 * Build a new sticky-note entry ready for the flow area.
 * Returns null when text is blank or colour is not in the palette.
 * The `rand` parameter is injectable for deterministic testing.
 */
export function createStickyNote(
  text: string,
  colour: string,
  rand: () => number = Math.random,
): StickyNoteEntry | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (!isValidColourValue(colour)) return null;
  return {
    id: `note-${Date.now()}-${Math.floor(rand() * 1e6)}`,
    text: trimmed,
    colour,
    x: Math.floor(rand() * 80),
    rotation: Math.floor(rand() * 13) - 6,
    duration: 12 + Math.floor(rand() * 8),
    delay: Math.floor(rand() * 8),
  };
}
