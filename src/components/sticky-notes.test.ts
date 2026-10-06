import { describe, it, expect } from 'vitest';
import { STICKY_NOTE_COLOURS } from './StickyNoteColours';
import { getColourByValue, isValidColourValue, createStickyNote } from './sticky-notes';

describe('sticky-notes helpers', () => {
  const defaultColour = STICKY_NOTE_COLOURS[0].value;

  it('getColourByValue returns the matching colour for a palette value', () => {
    const colour = getColourByValue(defaultColour);
    expect(colour).toBeDefined();
    expect(colour?.value).toBe(defaultColour);
  });

  it('getColourByValue returns undefined for a value not in the palette', () => {
    expect(getColourByValue('#000000')).toBeUndefined();
    expect(isValidColourValue('#000000')).toBe(false);
  });

  it('createStickyNote creates a note with the selected colour and trims whitespace', () => {
    const colour = STICKY_NOTE_COLOURS[2].value;
    const note = createStickyNote('  Balance goal  ', colour, () => 0.5);
    expect(note).not.toBeNull();
    expect(note?.text).toBe('Balance goal');
    expect(note?.colour).toBe(colour);
  });

  it('createStickyNote returns null for blank text', () => {
    expect(createStickyNote('', defaultColour)).toBeNull();
    expect(createStickyNote('   ', defaultColour)).toBeNull();
  });

  it('createStickyNote returns null for a colour not in the palette', () => {
    expect(createStickyNote('Valid text', '#000000')).toBeNull();
  });
});
