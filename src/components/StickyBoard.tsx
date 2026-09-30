import { useState } from 'react';
import { StickyNote as StickyNoteIcon, X } from 'lucide-react';
import {
  STICKY_COLOURS,
  DEFAULT_STICKY_COLOUR,
  STICKY_TEXT_MAX_LENGTH,
  type StickyColourId,
  type StickyNote,
  addStickyNote,
  createStickyNote,
  removeStickyNote,
  validateStickyText,
} from '../domain/sticky';

export default function StickyBoard() {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [text, setText] = useState('');
  const [selectedColour, setSelectedColour] = useState<StickyColourId>(DEFAULT_STICKY_COLOUR);
  const [error, setError] = useState('');

  function handleAdd() {
    const validationError = validateStickyText(text);
    if (validationError) {
      setError(validationError);
      return;
    }
    const note = createStickyNote(crypto.randomUUID(), text, selectedColour);
    if (!note) return;
    setNotes((prev) => addStickyNote(prev, note));
    setText('');
    setError('');
  }

  function handleRemove(id: string) {
    setNotes((prev) => removeStickyNote(prev, id));
  }

  return (
    <section className="panel sticky-board" aria-labelledby="sticky-board-title">
      <div className="section-heading">
        <div>
          <h2 id="sticky-board-title">
            <span className="button-with-icon">
              <StickyNoteIcon size={17} aria-hidden="true" />
              Sticky board
            </span>
          </h2>
          <p>Pin quick thoughts to your workspace.</p>
        </div>
      </div>

      <div className="sticky-compose">
        <div>
          <label className="field-label" htmlFor="sticky-text">
            Note
          </label>
          <textarea
            id="sticky-text"
            className="sticky-textarea"
            value={text}
            maxLength={STICKY_TEXT_MAX_LENGTH}
            placeholder="What's on your mind?"
            rows={3}
            onChange={(event) => {
              setText(event.currentTarget.value);
              setError('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) handleAdd();
            }}
            aria-describedby={error ? 'sticky-error' : undefined}
          />
          {error && (
            <p id="sticky-error" role="alert" className="danger-text sticky-error">
              {error}
            </p>
          )}
        </div>

        <div>
          <fieldset className="sticky-palette">
            <legend className="field-label">Colour</legend>
            <div className="sticky-palette-swatches">
              {STICKY_COLOURS.map((colour) => (
                <label
                  key={colour.id}
                  className={`sticky-swatch${selectedColour === colour.id ? ' selected' : ''}`}
                  title={colour.label}
                >
                  <input
                    type="radio"
                    name="sticky-colour"
                    value={colour.id}
                    checked={selectedColour === colour.id}
                    onChange={() => setSelectedColour(colour.id)}
                  />
                  <span
                    className="sticky-swatch-dot"
                    style={{ background: colour.hex }}
                    aria-hidden="true"
                  />
                  <span className="sr-only">{colour.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <button
          className="sticky-add-btn"
          onClick={handleAdd}
          aria-label="Add sticky note"
        >
          Add note
        </button>
      </div>

      {notes.length > 0 && (
        <div className="sticky-notes" role="list" aria-label="Sticky notes">
          {notes.map((note) => {
            const colour = STICKY_COLOURS.find((c) => c.id === note.colourId);
            return (
              <div
                key={note.id}
                className="sticky-note"
                role="listitem"
                style={{ background: colour?.hex ?? '#FFF176' }}
              >
                <p className="sticky-note-text">{note.text}</p>
                <button
                  className="sticky-remove"
                  onClick={() => handleRemove(note.id)}
                  aria-label="Remove sticky note"
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
