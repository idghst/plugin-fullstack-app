import { useState } from 'react';
import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { Button, Textarea } from '@starter/ui';

const file = 'desktop-note.txt';
const options = { baseDir: BaseDirectory.AppData };

// Static relative paths plus the native AppData capability prevent arbitrary file access.
export function LocalNote() {
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setStatus('');
    try {
      await action();
    } catch {
      setStatus('The note could not be accessed. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <aside className="app-shell">
      <section className="panel" aria-labelledby="desktop-note-heading">
        <div className="panel-heading">
          <h2 id="desktop-note-heading">Desktop note</h2>
          <span className="hint">Saved only on this device</span>
        </div>
        <div className="panel-body">
          <div className="field">
            <label htmlFor="desktop-note">A little reminder</label>
            <Textarea
              id="desktop-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={10000}
              disabled={busy}
              placeholder="Something to come back to…"
            />
          </div>
          <div className="form-actions">
            <Button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await mkdir('.', { ...options, recursive: true });
                  await writeTextFile(file, note, options);
                  setStatus('Note saved on this device.');
                })
              }
            >
              Save note
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (await exists(file, options)) {
                    setNote(await readTextFile(file, options));
                    setStatus('Saved note loaded.');
                  } else setStatus('No saved note yet.');
                })
              }
            >
              Load note
            </Button>
          </div>
          {status && (
            <p className="hint mt-3" role="status">
              {status}
            </p>
          )}
        </div>
      </section>
    </aside>
  );
}
