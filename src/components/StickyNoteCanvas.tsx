import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import Button from '@atlaskit/button/new';
import {
  STICKY_NOTE_COLOURS,
  DEFAULT_COLOUR,
  type StickyNoteColour,
  type StickyNoteItem,
  getColourDef,
  validateNoteText,
  buildNote,
} from './sticky-note-logic';
import { StickyNoteCard } from './StickyNote';

const SEED_NOTES: StickyNoteItem[] = [
  buildNote('New card styles 🎨', 'yellow', 0),
  buildNote('Real-time sync ⚡', 'sky', 1),
  buildNote('Export to PDF', 'mint', 2),
  buildNote('Smart grouping', 'coral', 3),
  buildNote('Auto-layout ✨', 'lavender', 4),
];

/** Interactive sticky note showcase for the Meridian marketing page. */
export default function StickyNoteCanvas() {
  const [notes, setNotes] = useState<StickyNoteItem[]>(SEED_NOTES);
  const [text, setText] = useState('');
  const [colour, setColour] = useState<StickyNoteColour>(DEFAULT_COLOUR);
  const [error, setError] = useState<string | null>(null);

  const colourDef = getColourDef(colour);

  function addNote() {
    const err = validateNoteText(text);
    if (err) {
      setError(err);
      return;
    }
    setNotes((prev) => [...prev, buildNote(text, colour, prev.length)]);
    setText('');
    setError(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') addNote();
  }

  return (
    <section className="sticky-note-showcase" aria-labelledby="showcase-heading">
      <div className="sticky-note-showcase-header">
        <div>
          <div className="eyebrow">WHITEBOARD FEATURES</div>
          <h2 id="showcase-heading">Ideas that stick.</h2>
          <p>Try the latest Meridian Whiteboard experience. Add a note and watch it flow.</p>
        </div>
      </div>

      <div className="sticky-note-layout">
        {/* Floating canvas — decorative animation, hidden from assistive technology */}
        <div className="sticky-note-canvas" aria-hidden="true">
          {notes.map((note) => (
            <StickyNoteCard key={note.id} note={note} />
          ))}
        </div>

        {/* Creation form */}
        <div className="sticky-note-form">
          <div className="sticky-note-preview-wrap">
            <div
              className="sticky-note-preview"
              data-testid="sticky-note-preview"
              style={
                { '--note-bg': colourDef.bg, '--note-fg': colourDef.fg } as CSSProperties
              }
              aria-hidden="true"
            >
              {text.trim() || 'Your note…'}
            </div>
          </div>

          <div
            className="sticky-note-palette"
            role="group"
            aria-label="Choose sticky note colour"
            data-testid="colour-palette"
          >
            {STICKY_NOTE_COLOURS.map((c) => (
              <button
                key={c.id}
                className={`palette-swatch colour-swatch${colour === c.id ? ' selected' : ''}`}
                style={{ background: c.bg } as CSSProperties}
                aria-label={c.label}
                title={c.label}
                aria-pressed={colour === c.id}
                onClick={() => setColour(c.id)}
                type="button"
              />
            ))}
          </div>

          <label className="field-label" htmlFor="sticky-note-text">
            Note text
          </label>
          <input
            id="sticky-note-text"
            className="sticky-note-input"
            type="text"
            value={text}
            maxLength={120}
            placeholder="Type your idea…"
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            aria-describedby={error ? 'sticky-note-error' : undefined}
          />
          {error && (
            <p id="sticky-note-error" role="alert" className="sticky-note-error">
              {error}
            </p>
          )}

          <div className="sticky-note-form-footer">
            <Button appearance="primary" onClick={addNote}>
              Add note
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
