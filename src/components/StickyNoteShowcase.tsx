import { useRef, useState, type CSSProperties, type FormEvent } from 'react';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import { Sparkles } from 'lucide-react';
import {
  createStickyNote,
  DEFAULT_STICKY_NOTE_COLOUR,
  getStickyNoteColour,
  STICKY_NOTE_COLOURS,
  type StickyNote,
  type StickyNoteColourId,
} from '../domain/sticky-note';

interface AnimatedNote extends StickyNote {
  lane: number;
  delay: number;
  duration: number;
  rotation: number;
}

export default function StickyNoteShowcase() {
  const [colour, setColour] = useState<StickyNoteColourId>(DEFAULT_STICKY_NOTE_COLOUR);
  const [text, setText] = useState('');
  const [notes, setNotes] = useState<AnimatedNote[]>([]);
  const [error, setError] = useState('');
  const idCounter = useRef(0);

  const selectedColour = getStickyNoteColour(colour);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) {
      setError('Please enter some text for your sticky note.');
      return;
    }
    setError('');
    idCounter.current += 1;
    const note = createStickyNote(text, colour, `sticky-${idCounter.current}`);
    const animated: AnimatedNote = {
      ...note,
      lane: idCounter.current % 5,
      delay: Math.random() * 2,
      duration: 12 + Math.random() * 8,
      rotation: -8 + Math.random() * 16,
    };
    setNotes((prev) => [...prev.slice(-9), animated]);
    setText('');
  }

  return (
    <section className="sticky-showcase" aria-labelledby="sticky-showcase-heading">
      <div className="sticky-showcase-stage" aria-hidden="true">
        {notes.map((note) => {
          const c = getStickyNoteColour(note.colour);
          return (
            <div
              key={note.id}
              className="sticky-note-float"
              style={
                {
                  '--sn-bg': c.background,
                  '--sn-text': c.text,
                  '--sn-lane': `${(note.lane / 4) * 80 + 5}%`,
                  '--sn-delay': `${note.delay}s`,
                  '--sn-duration': `${note.duration}s`,
                  '--sn-rotation': `${note.rotation}deg`,
                } as CSSProperties
              }
            >
              {note.text}
            </div>
          );
        })}
      </div>

      <div className="sticky-showcase-form">
        <div className="sticky-showcase-header">
          <span className="icon-tile">
            <Sparkles size={18} />
          </span>
          <div>
            <h2 id="sticky-showcase-heading">Add a sticky note</h2>
            <p>Pick a colour and share a thought. Watch it float across the page.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="sticky-preview-row">
            <div
              className="sticky-preview"
              style={
                {
                  '--sn-bg': selectedColour.background,
                  '--sn-text': selectedColour.text,
                } as CSSProperties
              }
              aria-label={`Preview: ${selectedColour.label} sticky note`}
            >
              {text || 'Your note here…'}
            </div>

            <fieldset className="colour-palette" aria-label="Sticky note colour">
              <legend className="field-label">Colour</legend>
              <div className="colour-swatches">
                {STICKY_NOTE_COLOURS.map((option) => (
                  <label key={option.id} className="colour-swatch-label">
                    <input
                      type="radio"
                      name="sticky-colour"
                      value={option.id}
                      checked={colour === option.id}
                      onChange={() => setColour(option.id)}
                      aria-label={option.label}
                    />
                    <span
                      className={`colour-swatch${colour === option.id ? ' selected' : ''}`}
                      style={{ background: option.background }}
                      title={option.label}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <label className="field-label" htmlFor="sticky-text">
            Your note
          </label>
          <Textfield
            id="sticky-text"
            value={text}
            onChange={(e) => {
              setText(e.currentTarget.value);
              if (error) setError('');
            }}
            placeholder="What's on your mind?"
            maxLength={80}
          />
          {error && (
            <p role="alert" className="danger-text" style={{ marginTop: '8px', fontSize: '12px' }}>
              {error}
            </p>
          )}

          <div className="sticky-form-footer">
            <Button type="submit" appearance="primary">
              Add sticky note
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
