import { type CSSProperties, useRef, useState } from 'react';
import Button from '@atlaskit/button/new';
import {
  createStickyNote,
  DEFAULT_STICKY_NOTE_COLOR,
  STICKY_NOTE_COLORS,
  type StickyNote,
  type StickyNoteColor,
} from '../domain/model';

// Each floating note carries its own layout/animation constants.
interface FloatingNote extends StickyNote {
  left: number; // percent
  rotate: number; // deg
  drift: number; // px horizontal drift over the animation
  duration: number; // seconds
  delay: number; // seconds
}

const MAX_NOTES = 12;

function pickRandom(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function makeFloating(note: StickyNote): FloatingNote {
  return {
    ...note,
    left: pickRandom(4, 80),
    rotate: pickRandom(-8, 8),
    drift: pickRandom(-30, 30),
    duration: pickRandom(7, 13),
    delay: 0,
  };
}

function colorDef(color: StickyNoteColor) {
  return STICKY_NOTE_COLORS.find((c) => c.id === color)!;
}

export default function StickyNoteShowcase() {
  const [notes, setNotes] = useState<FloatingNote[]>([]);
  const [text, setText] = useState('');
  const [color, setColor] = useState<StickyNoteColor>(DEFAULT_STICKY_NOTE_COLOR);
  const inputRef = useRef<HTMLInputElement>(null);

  function addNote() {
    const trimmed = text.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    const note = makeFloating(createStickyNote(trimmed, color));
    setNotes((prev) => [note, ...prev].slice(0, MAX_NOTES));
    setText('');
    inputRef.current?.focus();
  }

  return (
    <section className="sticky-note-section" aria-labelledby="sticky-note-heading">
      <div className="sticky-note-header">
        <div>
          <h2 id="sticky-note-heading">Leave a note.</h2>
          <p>Add a thought to the board. Watch it drift.</p>
        </div>
      </div>

      {/* Animated canvas */}
      <div className="sticky-note-canvas" aria-live="polite" aria-label="Floating sticky notes">
        {notes.map((note) => {
          const def = colorDef(note.color);
          return (
            <div
              key={note.id}
              className="sticky-note-float"
              aria-label={`Sticky note: ${note.text}`}
              style={
                {
                  left: `${note.left}%`,
                  '--note-rotate': `${note.rotate}deg`,
                  '--note-drift': `${note.drift}px`,
                  '--note-duration': `${note.duration}s`,
                  '--note-bg': def.background,
                  '--note-border': def.border,
                } as CSSProperties
              }
            >
              <span>{note.text}</span>
            </div>
          );
        })}
      </div>

      {/* Creation form */}
      <form
        className="sticky-note-form"
        onSubmit={(e) => {
          e.preventDefault();
          addNote();
        }}
      >
        <fieldset className="sticky-note-palette" aria-label="Choose a note colour">
          <legend className="field-label">Colour</legend>
          <div className="palette-swatches">
            {STICKY_NOTE_COLORS.map((def) => (
              <label key={def.id} className="palette-swatch-label" title={def.label}>
                <input
                  type="radio"
                  name="sticky-note-color"
                  value={def.id}
                  checked={color === def.id}
                  onChange={() => setColor(def.id)}
                  aria-label={def.label}
                />
                <span
                  className="palette-swatch"
                  style={{ background: def.background, borderColor: def.border }}
                />
              </label>
            ))}
          </div>
        </fieldset>

        <div className="sticky-note-input-row">
          <label className="field-label" htmlFor="sticky-note-text">
            Your note
          </label>
          <input
            id="sticky-note-text"
            ref={inputRef}
            className="sticky-note-input"
            type="text"
            value={text}
            maxLength={80}
            placeholder="Write something…"
            onChange={(e) => setText(e.currentTarget.value)}
            style={{ '--preview-bg': colorDef(color).background } as CSSProperties}
          />
        </div>

        <Button type="submit" appearance="primary">
          Add note
        </Button>
      </form>
    </section>
  );
}
