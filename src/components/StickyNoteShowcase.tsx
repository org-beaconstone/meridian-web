import { useState, type CSSProperties } from 'react';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import { MessageSquare, Plus } from 'lucide-react';
import {
  STICKY_NOTE_COLORS,
  createStickyNote,
  getStickyNoteColorOption,
  type StickyNote,
  type StickyNoteColor,
} from '../domain/sticky-notes';

const MAX_VISIBLE = 8;

// Deterministic layout values derived from slot index
const NOTE_TRACKS = [10, 32, 54, 76];
const NOTE_ROTATIONS = [-3, 2, -1.5, 3, -2.5, 1, -2, 2.5];
const NOTE_DURATIONS = [18, 15, 20, 16, 22];

export default function StickyNoteShowcase() {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [text, setText] = useState('');
  const [color, setColor] = useState<StickyNoteColor>('yellow');
  const [error, setError] = useState('');

  const visibleNotes = notes.slice(-MAX_VISIBLE);
  const previewColorOption = getStickyNoteColorOption(color);

  function handleAdd() {
    const note = createStickyNote(text, color);
    if (!note) {
      setError('Please enter a message for your sticky note.');
      return;
    }
    setNotes((prev) => [...prev, note]);
    setText('');
    setError('');
  }

  return (
    <section className="panel showcase-panel" aria-labelledby="showcase-heading">
      <div className="showcase-inner">
        <div
          className="showcase-stage"
          data-testid="showcase-stage"
          aria-label="Sticky notes showcase"
          role="img"
        >
          {visibleNotes.length === 0 ? (
            <div className="showcase-stage-empty">
              <MessageSquare size={26} aria-hidden="true" />
              <p>Your notes will float here</p>
            </div>
          ) : (
            visibleNotes.map((note, i) => {
              const c = getStickyNoteColorOption(note.color);
              return (
                <div
                  key={note.id}
                  className="sticky-note"
                  data-testid="sticky-note"
                  data-color={note.color}
                  style={
                    {
                      '--note-bg': c.background,
                      '--note-border': c.border,
                      '--note-top': `${NOTE_TRACKS[i % NOTE_TRACKS.length]}%`,
                      '--note-rotate': `${NOTE_ROTATIONS[i % NOTE_ROTATIONS.length]}deg`,
                      '--note-duration': `${NOTE_DURATIONS[i % NOTE_DURATIONS.length]}s`,
                    } as CSSProperties
                  }
                  aria-label={note.text}
                >
                  {note.text}
                </div>
              );
            })
          )}
        </div>

        <div className="showcase-form">
          <div>
            <h2 id="showcase-heading">Leave a sticky note</h2>
            <p>Pick a colour and share a thought. Watch it drift across the page.</p>
          </div>

          <fieldset className="color-palette-fieldset">
            <legend className="field-label">Colour</legend>
            <div className="color-swatches" role="group" aria-label="Sticky note colour">
              {STICKY_NOTE_COLORS.map((c) => (
                <label
                  key={c.id}
                  className={`color-swatch-label ${color === c.id ? 'selected' : ''}`}
                  title={c.label}
                >
                  <input
                    type="radio"
                    name="note-color"
                    value={c.id}
                    checked={color === c.id}
                    onChange={() => setColor(c.id)}
                    className="sr-only"
                    aria-label={c.label}
                  />
                  <span
                    className="swatch-circle"
                    style={{ background: c.background, borderColor: c.border }}
                    aria-hidden="true"
                  />
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label className="field-label" htmlFor="note-text">
              Message
            </label>
            <Textfield
              id="note-text"
              value={text}
              onChange={(e) => {
                setText(e.currentTarget.value);
                if (error) setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
              }}
              placeholder="What's on your mind?"
              maxLength={80}
            />
            {error && (
              <p role="alert" className="danger-text showcase-error">
                {error}
              </p>
            )}
          </div>

          <div
            className="note-preview"
            data-testid="note-preview"
            data-color={color}
            style={
              {
                '--note-bg': previewColorOption.background,
                '--note-border': previewColorOption.border,
              } as CSSProperties
            }
            aria-hidden="true"
          >
            <span>{text || 'Your note preview'}</span>
          </div>

          <Button appearance="primary" onClick={handleAdd}>
            <span className="button-with-icon">
              <Plus size={15} aria-hidden="true" />
              Add note
            </span>
          </Button>
        </div>
      </div>
    </section>
  );
}
