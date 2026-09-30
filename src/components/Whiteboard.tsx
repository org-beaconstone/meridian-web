import { useState, type FormEvent } from 'react';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import { StickyNote as StickyNoteIcon } from 'lucide-react';
import {
  DEFAULT_STICKY_COLOUR,
  STICKY_COLOURS,
  addStickyNote,
  stickyColour,
  type StickyColourId,
  type StickyNote,
} from '../domain/sticky';

export default function Whiteboard() {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [text, setText] = useState('');
  const [colourId, setColourId] = useState<StickyColourId>(DEFAULT_STICKY_COLOUR);
  const [error, setError] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = addStickyNote(notes, {
      id: crypto.randomUUID(),
      text,
      colourId,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotes(result.notes);
    setText('');
    setError('');
  }

  return (
    <section className="whiteboard" aria-label="Whiteboard">
      <form className="sticky-composer" onSubmit={submit}>
        <label className="field-label" htmlFor="sticky-text">
          Sticky note
        </label>
        <Textfield
          id="sticky-text"
          name="sticky-text"
          value={text}
          maxLength={280}
          placeholder="Jot down an idea"
          onChange={(event) => setText(event.currentTarget.value)}
        />
        <fieldset className="sticky-palette">
          <legend>Colour</legend>
          <div className="sticky-swatches">
            {STICKY_COLOURS.map((colour) => (
              <label key={colour.id} className="sticky-swatch">
                <input
                  type="radio"
                  name="sticky-colour"
                  value={colour.id}
                  checked={colourId === colour.id}
                  onChange={() => setColourId(colour.id)}
                />
                <span
                  className="sticky-chip"
                  style={{ background: colour.hex }}
                  aria-hidden="true"
                />
                <span>{colour.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="danger-text">
            {error}
          </p>
        )}
        <Button type="submit" appearance="primary">
          Add sticky note
        </Button>
      </form>

      {notes.length === 0 ? (
        <div className="empty-state">
          <StickyNoteIcon size={28} />
          <h3>No sticky notes yet</h3>
          <p>Choose a colour and add the first note.</p>
        </div>
      ) : (
        <ul className="sticky-board" aria-label="Sticky notes">
          {notes.map((note) => {
            const colour = stickyColour(note.colourId);
            return (
              <li
                key={note.id}
                className="sticky-note"
                style={{ background: colour.hex }}
                data-colour={note.colourId}
              >
                <small>{colour.label}</small>
                <p>{note.text}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
