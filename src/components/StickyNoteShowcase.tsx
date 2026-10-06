import { useState, type CSSProperties } from 'react';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import { STICKY_NOTE_COLOURS } from './StickyNoteColours';

export { STICKY_NOTE_COLOURS } from './StickyNoteColours';
export type { StickyNoteColourValue } from './StickyNoteColours';

interface FloatingNote {
  id: string;
  text: string;
  colour: string;
  x: number;
  rotation: number;
  duration: number;
  delay: number;
}

const SEED_NOTES: FloatingNote[] = [
  { id: 'seed-1', text: 'Balance day 🌿', colour: '#FFF59D', x: 6, rotation: -6, duration: 14, delay: 0 },
  { id: 'seed-2', text: 'Pay Maya', colour: '#C8E6C9', x: 26, rotation: 4, duration: 18, delay: 3 },
  { id: 'seed-3', text: 'Budget review', colour: '#FFCCBC', x: 50, rotation: -3, duration: 16, delay: 1.5 },
  { id: 'seed-4', text: 'Savings goal ✓', colour: '#E1BEE7', x: 71, rotation: 7, duration: 13, delay: 5 },
  { id: 'seed-5', text: 'Monthly plan', colour: '#B3E5FC', x: 86, rotation: -5, duration: 17, delay: 2.5 },
];

const MAX_NOTES = 12;

const NOTE_POSITIONS = [18, 38, 62, 82, 10, 45, 70, 30, 56, 77, 22, 90];
const NOTE_ROTATIONS = [-4, 6, -8, 3, -2, 7, -6, 4, -3, 8, -5, 2];
const NOTE_DURATIONS = [15, 19, 13, 17, 21, 14, 18, 12, 16, 20, 11, 22];
const NOTE_DELAYS = [0, 4, 2, 6, 1, 8, 3, 7, 5, 9, 1.5, 6.5];

export default function StickyNoteShowcase() {
  const [notes, setNotes] = useState<FloatingNote[]>(SEED_NOTES);
  const [selectedColour, setSelectedColour] = useState<string>(STICKY_NOTE_COLOURS[0].value);
  const [text, setText] = useState('');
  const [addedCount, setAddedCount] = useState(0);

  function addNote() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const idx = addedCount % NOTE_POSITIONS.length;
    const newNote: FloatingNote = {
      id: `user-note-${Date.now()}`,
      text: trimmed,
      colour: selectedColour,
      x: NOTE_POSITIONS[idx],
      rotation: NOTE_ROTATIONS[idx],
      duration: NOTE_DURATIONS[idx],
      delay: NOTE_DELAYS[idx],
    };
    setNotes((prev) => [...prev, newNote].slice(-MAX_NOTES));
    setAddedCount((c) => c + 1);
    setText('');
  }

  return (
    <section className="sticky-showcase" aria-labelledby="showcase-heading">
      <div className="sticky-showcase-intro">
        <div className="eyebrow">INTERACTIVE SHOWCASE</div>
        <h2 id="showcase-heading">Leave your mark on the day.</h2>
        <p>Pick a colour, add a thought, and watch it flow.</p>
      </div>
      <div className="sticky-showcase-body">
        <div className="sticky-creation-panel">
          <label className="field-label" htmlFor="sticky-text">
            Your note
          </label>
          <Textfield
            id="sticky-text"
            placeholder="e.g. Coffee budget 🎉"
            value={text}
            maxLength={40}
            onChange={(e) => setText(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addNote();
            }}
          />
          <fieldset className="colour-palette-fieldset">
            <legend>Choose a colour</legend>
            <div className="colour-palette">
              {STICKY_NOTE_COLOURS.map((colour) => (
                <label key={colour.value} className="colour-swatch-label" title={colour.name}>
                  <input
                    type="radio"
                    name="sticky-colour"
                    value={colour.value}
                    checked={selectedColour === colour.value}
                    onChange={() => setSelectedColour(colour.value)}
                    aria-label={colour.name}
                  />
                  <span
                    className="colour-swatch"
                    style={{ backgroundColor: colour.value } as CSSProperties}
                    aria-hidden="true"
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <div
            className="sticky-preview"
            style={{ backgroundColor: selectedColour } as CSSProperties}
            aria-label="Note preview"
          >
            <span>{text || 'Your note preview…'}</span>
          </div>
          <Button appearance="primary" onClick={addNote} isDisabled={!text.trim()}>
            Add to the flow
          </Button>
        </div>
        <div className="sticky-flow-area" aria-hidden="true">
          {notes.map((note) => (
            <div
              key={note.id}
              className="floating-sticky-note"
              style={
                {
                  '--note-x': `${note.x}%`,
                  '--note-rotate': `${note.rotation}deg`,
                  '--note-duration': `${note.duration}s`,
                  '--note-delay': `${note.delay}s`,
                  backgroundColor: note.colour,
                } as CSSProperties
              }
              data-testid="floating-sticky-note"
            >
              {note.text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
