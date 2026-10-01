// Sticky note domain model for the Meridian marketing showcase

export type StickyNoteColourId = 'yellow' | 'blue' | 'green' | 'pink' | 'orange';

export interface StickyNoteColourOption {
  id: StickyNoteColourId;
  label: string;
  background: string;
  text: string;
}

export const STICKY_NOTE_COLOURS: StickyNoteColourOption[] = [
  { id: 'yellow', label: 'Yellow', background: '#FFF176', text: '#4A4200' },
  { id: 'blue', label: 'Blue', background: '#B3E5FC', text: '#0D3B52' },
  { id: 'green', label: 'Green', background: '#C8E6C9', text: '#1B5E20' },
  { id: 'pink', label: 'Pink', background: '#F8BBD9', text: '#5D1A38' },
  { id: 'orange', label: 'Orange', background: '#FFE0B2', text: '#4A2700' },
];

export const DEFAULT_STICKY_NOTE_COLOUR: StickyNoteColourId = 'yellow';

export interface StickyNote {
  id: string;
  text: string;
  colour: StickyNoteColourId;
}

export function getStickyNoteColour(id: StickyNoteColourId): StickyNoteColourOption {
  const colour = STICKY_NOTE_COLOURS.find((c) => c.id === id);
  if (!colour) throw new Error(`Unknown sticky note colour: ${id}`);
  return colour;
}

export function createStickyNote(text: string, colour: StickyNoteColourId, id: string): StickyNote {
  if (!text.trim()) throw new Error('Sticky note text is required');
  return { id, text: text.trim(), colour };
}
