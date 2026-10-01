import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import {
  createStickyNote,
  DEFAULT_STICKY_NOTE_COLOR,
  STICKY_NOTE_COLOR_KEYS,
  STICKY_NOTE_COLORS,
  validateStickyNoteText,
  type StickyNote,
  type StickyNoteColor,
} from '../domain/sticky-note';

/** Deterministic-ish lane assignment from note id, so notes spread vertically. */
function laneFromId(id: string, laneCount: number): number {
  const sum = Array.from(id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return sum % laneCount;
}

const LANE_COUNT = 5;
const ANIMATION_DURATION_BASE = 14; // seconds
const ANIMATION_DURATION_SPREAD = 8;

interface FloatingNote extends StickyNote {
  duration: number;
  delay: number;
  lane: number;
}

function toFloating(note: StickyNote, index: number): FloatingNote {
  const lane = laneFromId(note.id, LANE_COUNT);
  // Vary duration slightly per note so they don't all move in lockstep
  const duration = ANIMATION_DURATION_BASE + (index % 4) * (ANIMATION_DURATION_SPREAD / 3);
  const delay = -(lane * 2.5); // negative delay so each lane is mid-flow on mount
  return { ...note, duration, delay, lane };
}

export default function StickyNoteBoard() {
  const [notes, setNotes] = useState<FloatingNote[]>([]);
  const [text, setText] = useState('');
  const [color, setColor] = useState<StickyNoteColor>(DEFAULT_STICKY_NOTE_COLOR);
  const [textError, setTextError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Seed with a few example notes so the board isn't empty on first load
  useEffect(() => {
    const seeds: Array<{ text: string; color: StickyNoteColor }> = [
      { text: 'Ship the feature 🚀', color: 'yellow' },
      { text: 'Review pull request', color: 'sage' },
      { text: 'Design sprint notes', color: 'sky' },
      { text: 'Retro action items', color: 'rose' },
      { text: 'Q4 roadmap ideas', color: 'peach' },
      { text: 'Write release notes', color: 'yellow' },
      { text: 'Sync with the team', color: 'sage' },
    ];
    setNotes(seeds.map((s, i) => toFloating(createStickyNote(s.text, s.color), i)));
  }, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const error = validateStickyNoteText(text);
    if (error) {
      setTextError(error);
      return;
    }
    const note = createStickyNote(text, color);
    setNotes((prev) => [...prev, toFloating(note, prev.length)]);
    setText('');
    setTextError(null);
    inputRef.current?.focus();
  }

  const laneHeightPercent = 100 / LANE_COUNT;

  return (
    <section className="sticky-note-board" aria-label="Whiteboard showcase">
      <div className="sticky-note-board-header">
        <div>
          <h2>Sticky note showcase</h2>
          <p>Add a note and watch it join the board.</p>
        </div>
      </div>

      {/* Animated canvas */}
      <div className="sticky-note-canvas" aria-hidden="true">
        {notes.map((note) => {
          const { bg, text: textColor } = STICKY_NOTE_COLORS[note.color];
          const topPercent = note.lane * laneHeightPercent + laneHeightPercent * 0.1;
          return (
            <div
              key={note.id}
              className="sticky-note-float"
              style={
                {
                  '--sn-bg': bg,
                  '--sn-text': textColor,
                  '--sn-duration': `${note.duration}s`,
                  '--sn-delay': `${note.delay}s`,
                  top: `${topPercent}%`,
                } as CSSProperties
              }
            >
              {note.text}
            </div>
          );
        })}
      </div>

      {/* Creation form */}
      <form className="sticky-note-form" onSubmit={handleSubmit} noValidate>
        <fieldset className="sticky-note-palette" aria-label="Note colour">
          <legend className="field-label" style={{ marginBottom: 0 }}>
            Colour
          </legend>
          <div className="sticky-note-swatches">
            {STICKY_NOTE_COLOR_KEYS.map((key) => {
              const { label, bg } = STICKY_NOTE_COLORS[key];
              return (
                <label key={key} className="swatch-label" title={label}>
                  <input
                    type="radio"
                    name="sticky-note-color"
                    value={key}
                    checked={color === key}
                    onChange={() => setColor(key)}
                    aria-label={label}
                  />
                  <span
                    className={`swatch ${color === key ? 'swatch-selected' : ''}`}
                    style={{ '--swatch-color': bg } as CSSProperties}
                  />
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="sticky-note-input-row">
          <div className="sticky-note-input-wrap">
            <label className="field-label" htmlFor="sticky-note-text">
              Your note
            </label>
            <Textfield
              id="sticky-note-text"
              ref={inputRef}
              value={text}
              onChange={(e) => {
                setText(e.currentTarget.value);
                if (textError) setTextError(null);
              }}
              placeholder="What's on your mind?"
              maxLength={120}
              aria-describedby={textError ? 'sn-text-error' : undefined}
              isInvalid={!!textError}
            />
            {textError && (
              <p id="sn-text-error" role="alert" className="danger-text" style={{ fontSize: 11, marginTop: 5 }}>
                {textError}
              </p>
            )}
          </div>
          <Button type="submit" appearance="primary">
            Add note
          </Button>
        </div>
      </form>
    </section>
  );
}
