import { useState, useEffect } from 'react';
import Button from '@atlaskit/button/new';
import { Plus, Trash2 } from 'lucide-react';

type StickyColour =
  | '#FEF08A'
  | '#FDA4AF'
  | '#93C5FD'
  | '#86EFAC'
  | '#C4B5FD'
  | '#FED7AA';

const STICKY_COLOURS: { value: StickyColour; label: string }[] = [
  { value: '#FEF08A', label: 'Yellow' },
  { value: '#FDA4AF', label: 'Pink' },
  { value: '#93C5FD', label: 'Blue' },
  { value: '#86EFAC', label: 'Green' },
  { value: '#C4B5FD', label: 'Purple' },
  { value: '#FED7AA', label: 'Orange' },
];

const DEFAULT_COLOUR: StickyColour = '#FEF08A';
const STORAGE_KEY = 'meridian_whiteboard';

interface StickyNote {
  id: string;
  text: string;
  colour: StickyColour;
  createdAt: string;
}

function loadNotes(): StickyNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as StickyNote[];
  } catch {
    return [];
  }
}

function saveNotes(notes: StickyNote[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // storage unavailable — session only
  }
}

export default function Whiteboard() {
  const [notes, setNotes] = useState<StickyNote[]>(() => loadNotes());
  const [adding, setAdding] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [draftColour, setDraftColour] = useState<StickyColour>(DEFAULT_COLOUR);

  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  function handleAdd() {
    const text = draftText.trim();
    if (!text) return;
    const note: StickyNote = {
      id: crypto.randomUUID(),
      text,
      colour: draftColour,
      createdAt: new Date().toISOString(),
    };
    setNotes((prev) => [...prev, note]);
    setDraftText('');
    setDraftColour(DEFAULT_COLOUR);
    setAdding(false);
  }

  function handleCancel() {
    setDraftText('');
    setDraftColour(DEFAULT_COLOUR);
    setAdding(false);
  }

  function handleRemove(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div className="whiteboard">
      {adding ? (
        <div className="sticky-form panel" aria-label="New sticky note">
          <h2 className="sticky-form-title">New sticky note</h2>
          <fieldset className="colour-palette-fieldset">
            <legend>Choose a colour</legend>
            <div className="colour-palette" role="group" aria-label="Note colour">
              {STICKY_COLOURS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`colour-swatch${draftColour === value ? ' selected' : ''}`}
                  style={{ background: value }}
                  onClick={() => setDraftColour(value)}
                  aria-label={label}
                  aria-pressed={draftColour === value}
                />
              ))}
            </div>
          </fieldset>
          <label className="field-label" htmlFor="sticky-text">
            Note text
          </label>
          <textarea
            id="sticky-text"
            className="sticky-textarea"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="Write your note here…"
            rows={4}
            maxLength={500}
            autoFocus
          />
          <div className="sticky-form-actions">
            <Button onClick={handleCancel}>Cancel</Button>
            <Button appearance="primary" onClick={handleAdd} isDisabled={!draftText.trim()}>
              Add note
            </Button>
          </div>
        </div>
      ) : (
        <button className="sticky-add-btn" onClick={() => setAdding(true)} aria-label="Add sticky note">
          <Plus size={20} aria-hidden="true" />
          Add a note
        </button>
      )}

      {notes.length === 0 && !adding ? (
        <div className="whiteboard-empty">
          <p>Your board is clear. Add a sticky note to get started.</p>
        </div>
      ) : (
        <div className="sticky-grid" aria-label="Sticky notes">
          {notes.map((note) => (
            <article
              key={note.id}
              className="sticky-note"
              style={{ '--sticky-colour': note.colour } as React.CSSProperties}
              aria-label={`Sticky note: ${note.text}`}
            >
              <p className="sticky-note-text">{note.text}</p>
              <button
                className="sticky-remove-btn"
                onClick={() => handleRemove(note.id)}
                aria-label="Remove sticky note"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
