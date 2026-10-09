import { useState, type CSSProperties } from 'react';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import { Plus } from 'lucide-react';

export const STICKY_COLOURS = [
  { name: 'Yellow', value: '#FFF3A3' },
  { name: 'Sage', value: '#C8E8C4' },
  { name: 'Sky', value: '#C4D8F0' },
  { name: 'Rose', value: '#F0C4D0' },
  { name: 'Lavender', value: '#DDD4F0' },
] as const;

type StickyColour = (typeof STICKY_COLOURS)[number]['value'];

interface StickyNoteItem {
  id: string;
  text: string;
  colour: StickyColour;
  top: number;
  rotation: number;
  speed: number;
  delay: number;
}

export default function StickyNoteShowcase() {
  const [notes, setNotes] = useState<StickyNoteItem[]>([]);
  const [text, setText] = useState('');
  const [colour, setColour] = useState<StickyColour>(STICKY_COLOURS[0].value);

  function handleAdd() {
    if (!text.trim()) return;
    setNotes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text: text.trim(),
        colour,
        top: 8 + Math.random() * 70,
        rotation: (Math.random() - 0.5) * 14,
        speed: 14 + Math.random() * 10,
        delay: -(Math.random() * 8),
      },
    ]);
    setText('');
  }

  return (
    <section className="sticky-showcase" aria-labelledby="showcase-title">
      <div className="sticky-showcase-header">
        <div className="eyebrow" style={{ color: '#a0b09a' }}>
          INTERACTIVE SHOWCASE
        </div>
        <h2 id="showcase-title" style={{ color: '#fff' }}>
          Leave your mark.
        </h2>
        <p style={{ color: '#b0bdb8', fontSize: '13px', marginTop: '8px' }}>
          Pick a colour, write something, and watch it drift across the board.
        </p>
      </div>

      <div className="sticky-board" role="region" aria-label="Sticky note board" aria-live="polite">
        {notes.map((note) => (
          <div
            key={note.id}
            className="sticky-note-chip"
            style={
              {
                '--note-bg': note.colour,
                '--note-top': `${note.top}%`,
                '--note-rotate': `${note.rotation}deg`,
                '--note-speed': `${note.speed}s`,
                '--note-delay': `${note.delay}s`,
              } as CSSProperties
            }
          >
            {note.text}
          </div>
        ))}
      </div>

      <form
        className="sticky-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleAdd();
        }}
      >
        <div className="sticky-form-inner">
          <div
            className="sticky-preview"
            style={{ background: colour }}
            aria-label={`Note preview: ${text || 'empty'}`}
          >
            <span className={text ? '' : 'sticky-placeholder'}>{text || 'Your note…'}</span>
          </div>

          <div className="sticky-controls">
            <fieldset className="colour-fieldset">
              <legend>Note colour</legend>
              <div className="colour-swatches" role="group" aria-label="Choose sticky note colour">
                {STICKY_COLOURS.map((c) => (
                  <label key={c.value} className="colour-swatch-label" title={c.name}>
                    <input
                      type="radio"
                      name="sticky-colour"
                      value={c.value}
                      checked={colour === c.value}
                      onChange={() => setColour(c.value)}
                      aria-label={c.name}
                    />
                    <span
                      className="colour-swatch"
                      style={{ background: c.value }}
                      aria-hidden="true"
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="sticky-input-row">
              <Textfield
                value={text}
                onChange={(e) => setText(e.currentTarget.value)}
                placeholder="Write something..."
                maxLength={80}
                aria-label="Sticky note text"
              />
              <Button type="submit" appearance="primary" isDisabled={!text.trim()}>
                <span className="button-with-icon">
                  <Plus size={16} />
                  Add note
                </span>
              </Button>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
