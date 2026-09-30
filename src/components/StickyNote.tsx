import { type CSSProperties } from 'react';
import { type StickyNoteItem, getColourDef } from './sticky-note-logic';

/** Renders a single animated sticky note inside the canvas. */
export function StickyNoteCard({ note }: { note: StickyNoteItem }) {
  const def = getColourDef(note.colour);
  const tilts = [-4, 3, -2, 5, -3];
  const tilt = tilts[note.lane] ?? 0;

  return (
    <div
      className="sticky-note-card"
      style={
        {
          '--note-bg': def.bg,
          '--note-fg': def.fg,
          '--note-lane': note.lane,
          '--note-tilt': `${tilt}deg`,
          animationDelay: `${note.delay}s`,
        } as CSSProperties
      }
    >
      {note.text}
    </div>
  );
}
