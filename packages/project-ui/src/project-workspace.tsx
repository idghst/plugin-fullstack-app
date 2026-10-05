'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, createApiClient } from '@starter/api-client';
import { createMemoryTokenStore } from '@starter/auth';
import type { Project, Tokens } from '@starter/contracts';
import { Button, Input, Textarea } from '@starter/ui';

function errorMessage(error: unknown): string {
  if (error instanceof ApiError)
    return `${error.message}${error.requestId ? ` (Reference: ${error.requestId})` : ''}`;
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function DeleteDialog({
  project,
  busy,
  onCancel,
  onConfirm,
  error,
}: {
  project: Project;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  error: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog-card"
      aria-labelledby="delete-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2 id="delete-title">Delete project?</h2>
      <p>“{project.name}” will be permanently deleted. This action cannot be undone.</p>
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button variant="outline" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="destructive" disabled={busy} onClick={onConfirm}>
          {busy ? 'Deleting…' : 'Confirm delete'}
        </Button>
      </div>
    </dialog>
  );
}

export function ProjectWorkspace({
  apiBaseUrl,
  platform = 'Web',
  serviceStatus,
}: {
  apiBaseUrl: string;
  platform?: string;
  serviceStatus?: string;
}) {
  const [client] = useState(() =>
    createApiClient({ baseUrl: apiBaseUrl, tokenStore: createMemoryTokenStore() }),
  );
  const [account, setAccount] = useState<Tokens['user'] | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (failure) {
      setError(errorMessage(failure));
      if (failure instanceof ApiError && failure.status === 401 && account) {
        setAccount(null);
        setProjects([]);
        setEditing(null);
        setName('');
        setDescription('');
        setDeleteTarget(null);
      }
    } finally {
      setBusy(false);
    }
  }
  async function refreshProjects() {
    setProjects((await client.project.list()).items);
  }
  function resetForm() {
    setEditing(null);
    setName('');
    setDescription('');
  }
  function authenticate(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      const tokens = await client.auth[mode]({ email: email.trim(), password });
      setAccount(tokens.user);
      setPassword('');
      setAccount(await client.user.getMe());
      await refreshProjects();
    });
  }
  function saveProject(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      if (editing)
        await client.project.update(editing, {
          name: name.trim(),
          description: description.trim(),
        });
      else await client.project.create({ name: name.trim(), description: description.trim() });
      await refreshProjects();
      resetForm();
      setNotice(editing ? 'Project updated.' : 'Project created.');
    });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ↗
          </span>{' '}
          Project Studio
        </div>
        {account ? (
          <div className="account">
            <span className="account-email">{account.email}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  try {
                    await client.auth.logout();
                  } finally {
                    setAccount(null);
                    setProjects([]);
                    resetForm();
                    setMode('login');
                  }
                })
              }
            >
              Sign out
            </Button>
          </div>
        ) : (
          <span className="topbar-note">A little structure. A lot of possibility.</span>
        )}
      </header>
      {!account ? (
        <main className="auth-layout">
          <div className="hero">
            <span className="eyebrow">Make room for good ideas</span>
            <h1>Your next great project.</h1>
            <p>
              A calm place to organize what you’re building. Keep your projects together and focus
              on the work that matters.
            </p>
            <div className="feature-line">
              <span aria-hidden="true">✓</span>
              <span>One workspace, wherever you work.</span>
            </div>
          </div>
          <section className="panel" aria-label="Authentication">
            <div className="panel-body">
              <div className="auth-tabs">
                <button
                  type="button"
                  aria-pressed={mode === 'login'}
                  disabled={busy}
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                >
                  Log in
                </button>
                <button
                  type="button"
                  aria-pressed={mode === 'register'}
                  disabled={busy}
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                >
                  Sign up
                </button>
              </div>
              <h2 className="auth-title">{mode === 'login' ? 'Welcome back' : 'A fresh start'}</h2>
              <p className="auth-subtitle">
                {mode === 'login'
                  ? 'Sign in to pick up where you left off.'
                  : 'Create your account and start your first project.'}
              </p>
              {error && (
                <p className="error-banner" role="alert">
                  {error}
                </p>
              )}
              <form onSubmit={authenticate}>
                <div className="field">
                  <label htmlFor="auth-email">Email</label>
                  <Input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    disabled={busy}
                  />
                </div>
                <div className="field">
                  <label htmlFor="auth-password">Password</label>
                  <Input
                    id="auth-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder={
                      mode === 'register' ? 'At least 12 characters' : 'Enter your password'
                    }
                    required
                    minLength={mode === 'register' ? 12 : 1}
                    maxLength={128}
                    disabled={busy}
                  />
                  {mode === 'register' && <span className="hint">Use at least 12 characters.</span>}
                </div>
                <Button className="w-full" size="lg" type="submit" disabled={busy}>
                  {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
                </Button>
              </form>
            </div>
          </section>
        </main>
      ) : (
        <main>
          <div className="hero">
            <div>
              <span className="eyebrow">Your workspace</span>
              <h1>Ideas, moving forward.</h1>
              <p>Bring your next steps into focus. Start small, build something good.</p>
            </div>
            <span className="status-pill">
              <span className="status-dot" />
              {projects.length} {projects.length === 1 ? 'project' : 'projects'} in your workspace
            </span>
          </div>
          {error && (
            <p className="error-banner" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
          <div className="workspace-grid">
            <section className="panel" aria-labelledby="projects-heading">
              <div className="panel-heading">
                <h2 id="projects-heading">
                  All projects <span className="count">{projects.length}</span>
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void run(refreshProjects)}
                >
                  Refresh
                </Button>
              </div>
              {busy && projects.length === 0 ? (
                <div className="empty-state" role="status">
                  Loading projects…
                </div>
              ) : projects.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon" aria-hidden="true">
                    ＋
                  </span>
                  <h3>A blank canvas, for now.</h3>
                  <p>Create your first project. Give your idea a name and a place to grow.</p>
                </div>
              ) : (
                <div>
                  {projects.map((project) => (
                    <article className="project-row" key={project.id}>
                      <div className="project-icon" aria-hidden="true">
                        {project.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="project-content">
                        <h3>{project.name}</h3>
                        <p>{project.description || 'No description yet.'}</p>
                        <span className="project-meta">
                          Updated{' '}
                          {new Date(project.updatedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="project-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Edit ${project.name}`}
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              const detail = await client.project.get(project.id);
                              setEditing(detail.id);
                              setName(detail.name);
                              setDescription(detail.description);
                              document.getElementById('project-name')?.focus();
                            })
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Delete ${project.name}`}
                          disabled={busy}
                          onClick={() => {
                            setError('');
                            setDeleteTarget(project);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
            <section className="panel" aria-labelledby="editor-heading">
              <div className="panel-heading">
                <h2 id="editor-heading">{editing ? 'Edit project' : 'Create something new'}</h2>
                <span aria-hidden="true">↗</span>
              </div>
              <div className="panel-body">
                <form onSubmit={saveProject}>
                  <div className="field">
                    <label htmlFor="project-name">Project name</label>
                    <Input
                      id="project-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="A name for your idea"
                      required
                      maxLength={100}
                      disabled={busy}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="project-description">Description</label>
                    <Textarea
                      id="project-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What are you working toward?"
                      maxLength={2000}
                      disabled={busy}
                    />
                    <span className="hint">A few words to give your project direction.</span>
                  </div>
                  <div className="form-actions">
                    <Button type="submit" disabled={busy || !name.trim()}>
                      {busy ? 'Saving…' : editing ? 'Save changes' : 'Create project'}
                    </Button>
                    {editing && (
                      <Button variant="outline" type="button" onClick={resetForm} disabled={busy}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </div>
            </section>
          </div>
        </main>
      )}
      <footer className="footer">
        <span>Built to keep things moving.</span>
        <span>
          {platform}
          {serviceStatus ? ` · ${serviceStatus}` : ''}
        </span>
      </footer>
      {deleteTarget && (
        <DeleteDialog
          project={deleteTarget}
          busy={busy}
          error={error}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() =>
            void run(async () => {
              await client.project.delete(deleteTarget.id);
              await refreshProjects();
              if (editing === deleteTarget.id) resetForm();
              setDeleteTarget(null);
              setNotice('Project deleted.');
            })
          }
        />
      )}
    </div>
  );
}
