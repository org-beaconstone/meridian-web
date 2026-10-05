import type { CSSProperties } from 'react';
import type { StickyColour } from '../stickyNotes';

interface Props {
  text: string;
  colour: StickyColour;
  animIndex: number;
}

export default function StickyNote({ text, colour, animIndex }: Props) {
  const duration = 3 + (animIndex % 4) * 0.6;
  const delay = (animIndex * 0.8) % 2.5;
  const rotate = animIndex % 2 === 0 ? -1.5 : 1.5;

  return (
    <div
      className="sticky-note"
      data-colour={colour.id}
      style={
        {
          '--sticky-bg': colour.value,
          '--sticky-text': colour.textColour,
          '--sticky-rotate': `${rotate}deg`,
          animationDuration: `${duration}s`,
          animationDelay: `-${delay}s`,
        } as CSSProperties
      }
    >
      {text}
    </div>
  );
}
