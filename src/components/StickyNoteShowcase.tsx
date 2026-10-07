import { useState, type CSSProperties } from 'react';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import {
  STICKY_NOTE_COLOURS,
  DEFAULT_STICKY_NOTE_COLOUR_ID,
  getStickyNoteColour,
  SEED_STICKY_NOTES,
  type StickyNoteColourId,
  type StickyNoteEntry,
} from '../domain/sticky-notes';

function StickyNoteCard({ note, index }: { note: StickyNoteEntry; index: number }) {
  const colour = getStickyNoteColour(note.colourId);
  const rotate = (((index * 7) % 14) - 7).toFixed(1);
  const delay = ((index * 0.5) % 2).toFixed(1);
  return (
    <div
      className="sticky-note-card"
      style={
        {
          '--note-colour': colour.value,
          '--note-rotate': `${rotate}deg`,
          '--note-delay': `${delay}s`,
        } as CSSProperties
      }
    >
      <p>{note.text}</p>
    </div>
  );
}

export default function StickyNoteShowcase() {
  const [notes, setNotes] = useState<StickyNoteEntry[]>(SEED_STICKY_NOTES);
  const [text, setText] = useState('');
  const [selectedColour, setSelectedColour] = useState<StickyNoteColourId>(
    DEFAULT_STICKY_NOTE_COLOUR_ID,
  );

  function addNote() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setNotes([{ id: crypto.randomUUID(), text: trimmed, colourId: selectedColour }, ...notes]);
    setText('');
  }

  const previewColour = getStickyNoteColour(selectedColour);

  return (
    <section className="sticky-showcase" aria-labelledby="sticky-showcase-title">
      <div className="sticky-showcase-header">
        <div>
          <h2 id="sticky-showcase-title">Leave your mark</h2>
          <p>Pick a colour, write a note, and watch it join the flow.</p>
        </div>
      </div>

      <div className="sticky-notes-flow" aria-label="Sticky notes" data-testid="sticky-notes-flow">
        {notes.map((note, index) => (
          <StickyNoteCard key={note.id} note={note} index={index} />
        ))}
      </div>

      <div className="sticky-note-composer">
        <div
          className="sticky-note-preview"
          style={{ '--note-colour': previewColour.value } as CSSProperties}
          aria-hidden="true"
          data-testid="sticky-note-preview"
        >
          <p>{text || 'Your note…'}</p>
        </div>

        <div className="sticky-note-form">
          <div>
            <label className="field-label" htmlFor="sticky-text">
              Your message
            </label>
            <Textfield
              id="sticky-text"
              value={text}
              onChange={(e) => setText(e.currentTarget.value)}
              placeholder="Write something…"
              maxLength={80}
            />
          </div>

          <div>
            <span className="field-label" id="colour-palette-label">
              Note colour
            </span>
            <div
              className="colour-palette"
              role="group"
              aria-labelledby="colour-palette-label"
              data-testid="colour-palette"
            >
              {STICKY_NOTE_COLOURS.map((colour) => (
                <button
                  key={colour.id}
                  type="button"
                  className={`colour-swatch${selectedColour === colour.id ? ' selected' : ''}`}
                  style={{ '--swatch-colour': colour.value } as CSSProperties}
                  aria-label={colour.label}
                  aria-pressed={selectedColour === colour.id}
                  onClick={() => setSelectedColour(colour.id)}
                />
              ))}
            </div>
          </div>

          <div>
            <Button appearance="primary" onClick={addNote} isDisabled={!text.trim()}>
              Add note
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
