export type StickyNoteColor = 'yellow' | 'mint' | 'sky' | 'lavender' | 'peach';

export interface StickyNoteColorOption {
  id: StickyNoteColor;
  hex: string;
  label: string;
}

export const STICKY_NOTE_COLORS: StickyNoteColorOption[] = [
  { id: 'yellow', hex: '#FFE566', label: 'Sunshine yellow' },
  { id: 'mint', hex: '#C3EED4', label: 'Mint green' },
  { id: 'sky', hex: '#C2DCFF', label: 'Sky blue' },
  { id: 'lavender', hex: '#E0D0F5', label: 'Lavender' },
  { id: 'peach', hex: '#FFD4B8', label: 'Peach' },
];

export const DEFAULT_STICKY_COLOR: StickyNoteColor = 'yellow';

export function getColorHex(color: StickyNoteColor): string {
  return STICKY_NOTE_COLORS.find((c) => c.id === color)?.hex ?? '#FFE566';
}

export interface StickyNoteData {
  id: string;
  text: string;
  color: StickyNoteColor;
}

// Deterministic layout so notes spread across the board area
export const STICKY_POSITIONS = [
  { top: '8%', left: '4%' },
  { top: '12%', left: '52%' },
  { top: '44%', left: '22%' },
  { top: '28%', left: '74%' },
  { top: '62%', left: '8%' },
  { top: '58%', left: '58%' },
  { top: '76%', left: '38%' },
  { top: '4%', left: '80%' },
];
export const STICKY_ROTATIONS = [-4, 3, -2, 5, -3, 2, -5, 4];
export const STICKY_DELAYS = ['0s', '0.4s', '0.8s', '1.2s', '1.6s', '0.2s', '0.6s', '1.0s'];
