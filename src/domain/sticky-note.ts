export type StickyNoteColor = 'yellow' | 'sage' | 'sky' | 'rose' | 'peach';

export interface StickyNoteColorDef {
  label: string;
  bg: string;
  text: string;
}

export const STICKY_NOTE_COLORS: Record<StickyNoteColor, StickyNoteColorDef> = {
  yellow: { label: 'Yellow', bg: '#FEF08A', text: '#713F12' },
  sage: { label: 'Sage', bg: '#C6DCC0', text: '#1E3D1A' },
  sky: { label: 'Sky', bg: '#BAE6FD', text: '#0C4A6E' },
  rose: { label: 'Rose', bg: '#FBCFE8', text: '#831843' },
  peach: { label: 'Peach', bg: '#FED7AA', text: '#7C2D12' },
};

export const STICKY_NOTE_COLOR_KEYS = Object.keys(STICKY_NOTE_COLORS) as StickyNoteColor[];

export const DEFAULT_STICKY_NOTE_COLOR: StickyNoteColor = 'yellow';

export const MAX_STICKY_NOTE_LENGTH = 120;

export interface StickyNote {
  id: string;
  text: string;
  color: StickyNoteColor;
}

export function isStickyNoteColor(value: unknown): value is StickyNoteColor {
  return typeof value === 'string' && value in STICKY_NOTE_COLORS;
}

export function validateStickyNoteText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return 'Note text is required';
  if (trimmed.length > MAX_STICKY_NOTE_LENGTH)
    return `Note must be ${MAX_STICKY_NOTE_LENGTH} characters or fewer`;
  return null;
}

export function createStickyNote(text: string, color: StickyNoteColor): StickyNote {
  return { id: crypto.randomUUID(), text: text.trim(), color };
}
