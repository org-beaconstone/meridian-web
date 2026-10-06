export const STICKY_NOTE_COLOURS = [
  { name: 'Sunshine', value: '#FFF59D' },
  { name: 'Mint', value: '#C8E6C9' },
  { name: 'Peach', value: '#FFCCBC' },
  { name: 'Lavender', value: '#E1BEE7' },
  { name: 'Sky', value: '#B3E5FC' },
] as const;

export type StickyNoteColourValue = (typeof STICKY_NOTE_COLOURS)[number]['value'];
