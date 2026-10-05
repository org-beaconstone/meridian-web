export type StickyColour = {
  id: string;
  label: string;
  value: string;
  textColour: string;
};

export const STICKY_COLOURS: StickyColour[] = [
  { id: 'yellow', label: 'Yellow', value: '#F7E97A', textColour: '#3A3200' },
  { id: 'green', label: 'Green', value: '#B8F0C8', textColour: '#1A3D25' },
  { id: 'blue', label: 'Blue', value: '#B8D9F0', textColour: '#0F2740' },
  { id: 'pink', label: 'Pink', value: '#F5C0BD', textColour: '#3D1A18' },
  { id: 'lavender', label: 'Lavender', value: '#D4C0F5', textColour: '#28183D' },
];

export const DEFAULT_COLOUR_ID = 'yellow';
