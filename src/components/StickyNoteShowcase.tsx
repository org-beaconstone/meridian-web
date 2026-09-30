import { useState, useId, type CSSProperties } from 'react';
import { Plus, StickyNote } from 'lucide-react';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import {
  STICKY_NOTE_COLOURS,
  COLOUR_HEX,
  COLOUR_LABELS,
  DEFAULT_STICKY_NOTE_COLOUR,
  validateStickyNoteText,
  createStickyNote,
  type StickyNoteColour,
  type StickyNoteItem,
} from '../domain/sticky-notes';

export type { StickyNoteColour, StickyNoteItem };

function FloatingNote({ note }: { note: StickyNoteItem }) {
  return (
    <div
      className="sticky-note-float"
      style={
        {
          '--note-colour': COLOUR_HEX[note.colour],
          '--note-x': `${note.x}%`,
          '--note-duration': `${note.duration}s`,
          '--note-delay': `${note.delay}s`,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      {note.text}
    </div>
  );
}

interface Props {
  notes: StickyNoteItem[];
  onAdd: (item: StickyNoteItem) => void;
}

export default function StickyNoteShowcase({ notes, onAdd }: Props) {
  const [text, setText] = useState('');
  const [colour, setColour] = useState<StickyNoteColour>(DEFAULT_STICKY_NOTE_COLOUR);
  const [textError, setTextError] = useState('');
  const groupId = useId();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const error = validateStickyNoteText(text);
    if (error) {
      setTextError(error);
      return;
    }
    onAdd(createStickyNote(crypto.randomUUID(), text, colour));
    setText('');
    setTextError('');
  }

  return (
    <section className="sticky-note-showcase" aria-label="Interactive sticky note showcase">
      {/* Floating animation stage */}
      <div className="sticky-note-stage" aria-hidden="true">
        {notes.map((note) => (
          <FloatingNote key={note.id} note={note} />
        ))}
      </div>

      {/* Creator panel */}
      <div className="sticky-note-creator panel">
        <div className="section-heading">
          <div>
            <h2>Add a sticky note</h2>
            <p>Pick a colour, write your note, and watch it flow.</p>
          </div>
          <span className="icon-tile">
            <StickyNote size={18} />
          </span>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Colour palette */}
          <div
            role="group"
            aria-labelledby={`${groupId}-colour-label`}
            className="colour-palette-group"
          >
            <span id={`${groupId}-colour-label`} className="field-label">
              Colour
            </span>
            <div className="colour-palette" data-testid="colour-palette">
              {STICKY_NOTE_COLOURS.map((c) => (
                <label
                  key={c}
                  className={`colour-swatch${colour === c ? ' selected' : ''}`}
                  title={COLOUR_LABELS[c]}
                >
                  <input
                    type="radio"
                    name="sticky-colour"
                    value={c}
                    checked={colour === c}
                    onChange={() => setColour(c)}
                    aria-label={COLOUR_LABELS[c]}
                  />
                  <span
                    className="swatch-dot"
                    style={{ background: COLOUR_HEX[c] }}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Text input */}
          <label className="field-label" htmlFor="sticky-note-text">
            Note
          </label>
          <Textfield
            id="sticky-note-text"
            value={text}
            onChange={(e) => {
              setText(e.currentTarget.value);
              setTextError('');
            }}
            placeholder="What's on your mind?"
            maxLength={80}
          />
          {textError && (
            <p role="alert" className="danger-text sticky-note-error">
              {textError}
            </p>
          )}

          {/* Live preview */}
          <div
            className="sticky-note-preview"
            style={{ '--note-colour': COLOUR_HEX[colour] } as CSSProperties}
            aria-label={`Sticky note preview: ${text || 'empty'}`}
            data-testid="sticky-note-preview"
          >
            {text || <span className="preview-placeholder">Your note preview</span>}
          </div>

          <Button type="submit" appearance="primary">
            <span className="button-with-icon">
              <Plus size={16} />
              Add note
            </span>
          </Button>
        </form>
      </div>
    </section>
  );
}
