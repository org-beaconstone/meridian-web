import { useState, type CSSProperties, type FormEvent } from 'react';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import {
  DEFAULT_STICKY_NOTE_COLOUR,
  MAX_STICKY_NOTE_LENGTH,
  STICKY_NOTE_COLOURS,
  addStickyNote,
  stickyNoteColour,
  type StickyNote,
  type StickyNoteColourId,
} from '../domain/sticky-notes';

const MAX_VISIBLE_NOTES = 8;

const SEED_NOTES: StickyNote[] = [
  { id: 'seed-market', text: 'Saturday market, rain or shine', colourId: 'gold' },
  { id: 'seed-call', text: 'Call Mum after lunch', colourId: 'sage' },
  { id: 'seed-trip', text: 'The trip fund can wait a week', colourId: 'sky' },
];

function noteVars(colourId: StickyNoteColourId, index = 0): CSSProperties {
  const colour = stickyNoteColour(colourId);
  const tilts = [-2.5, 2, -1.5, 3, -3];
  return {
    '--note-bg': colour.background,
    '--note-ink': colour.ink,
    '--note-lane': String(index % 3),
    '--note-delay': `${-index * 4.5}s`,
    '--note-duration': `${18 + (index % 3) * 3}s`,
    '--note-tilt': `${tilts[index % tilts.length]}deg`,
  } as CSSProperties;
}

export default function StickyNoteShowcase() {
  const [notes, setNotes] = useState<StickyNote[]>(SEED_NOTES);
  const [text, setText] = useState('');
  const [colourId, setColourId] = useState<StickyNoteColourId>(DEFAULT_STICKY_NOTE_COLOUR);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const colour = stickyNoteColour(colourId);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = addStickyNote(notes, {
      id: crypto.randomUUID(),
      text,
      colourId,
    });
    if (!result.ok) {
      setError(result.error);
      setStatus('');
      return;
    }
    setNotes(result.notes.slice(-MAX_VISIBLE_NOTES));
    setText('');
    setError('');
    setStatus(`${colour.label} sticky note added`);
  }

  return (
    <section className="sticky-showcase panel" aria-labelledby="sticky-showcase-heading">
      <div className="sticky-showcase-layout">
        <form className="sticky-composer" onSubmit={submit} noValidate>
          <div className="section-heading">
            <div>
              <h2 id="sticky-showcase-heading">Notes that wander</h2>
              <p>Choose a colour, write a thought, and let it drift across the page.</p>
            </div>
          </div>
          <p className="sticky-preview-label" id="sticky-preview-label">
            Preview
          </p>
          <div
            className="sticky-note sticky-preview"
            data-testid="sticky-preview"
            data-colour={colourId}
            style={noteVars(colourId)}
            aria-labelledby="sticky-preview-label"
          >
            <p>{text.trim() || 'Your note appears here'}</p>
          </div>
          <fieldset className="sticky-palette">
            <legend className="field-label">Colour</legend>
            <div className="sticky-swatches">
              {STICKY_NOTE_COLOURS.map((option) => (
                <label key={option.id} className="sticky-swatch">
                  <input
                    type="radio"
                    name="sticky-colour"
                    value={option.id}
                    checked={colourId === option.id}
                    onChange={() => {
                      setColourId(option.id);
                      setStatus('');
                    }}
                  />
                  <span
                    className="sticky-chip"
                    style={{ background: option.background }}
                    aria-hidden="true"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="field-label" htmlFor="sticky-text">
            Note
          </label>
          <div className="sticky-text">
            <Textfield
              id="sticky-text"
              name="sticky-text"
              value={text}
              maxLength={MAX_STICKY_NOTE_LENGTH}
              placeholder="Jot down a thought"
              onChange={(event) => {
                setText(event.currentTarget.value);
                if (error) setError('');
              }}
            />
          </div>
          {error && (
            <p role="alert" className="danger-text">
              {error}
            </p>
          )}
          <p role="status" className="sr-only">
            {status}
          </p>
          <div className="sticky-submit">
            <Button type="submit" appearance="primary">
              Add sticky note
            </Button>
          </div>
        </form>
        <div className="sticky-stage">
          <ul className="sticky-stage-list" aria-label="Sticky notes">
            {notes.map((note, index) => (
              <li
                key={note.id}
                className="sticky-note sticky-flow"
                data-testid="sticky-note"
                data-colour={note.colourId}
                style={noteVars(note.colourId, index)}
              >
                <p>{note.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
