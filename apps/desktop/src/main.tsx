import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { ProjectWorkspace } from '@starter/project-ui';
import '@starter/project-ui/styles.css';
import { LocalNote } from './local-note';

function App() {
  const [platform, setPlatform] = useState('Desktop preview');
  useEffect(() => {
    if (isTauri())
      void invoke<string>('platform_name')
        .then((name) => setPlatform(`Desktop · ${name}`))
        .catch(() => setPlatform('Desktop'));
  }, []);
  return (
    <>
      <ProjectWorkspace apiBaseUrl={import.meta.env.VITE_API_BASE_URL} platform={platform} />
      {isTauri() && <LocalNote />}
    </>
  );
}
const root = document.getElementById('root');
if (!root) throw new Error('Application root is missing');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
