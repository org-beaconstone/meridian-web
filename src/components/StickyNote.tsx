import type { CSSProperties } from 'react';
import {
  getColorHex,
  STICKY_POSITIONS,
  STICKY_ROTATIONS,
  STICKY_DELAYS,
  type StickyNoteData,
} from './stickyNoteData';

export function StickyNote({ note, index }: { note: StickyNoteData; index: number }) {
  const pos = STICKY_POSITIONS[index % STICKY_POSITIONS.length];
  const rotation = STICKY_ROTATIONS[index % STICKY_ROTATIONS.length];
  const delay = STICKY_DELAYS[index % STICKY_DELAYS.length];

  const style = {
    '--sticky-color': getColorHex(note.color),
    '--sticky-rotation': `${rotation}deg`,
    '--sticky-delay': delay,
    top: pos.top,
    left: pos.left,
  } as CSSProperties;

  return (
    <div className="sticky-note" style={style} data-color={note.color}>
      {note.text}
    </div>
  );
}
