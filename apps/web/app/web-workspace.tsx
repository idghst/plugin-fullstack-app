'use client';
import { useEffect, useState } from 'react';
import { ProjectWorkspace } from '@starter/project-ui';

export function WebWorkspace({ apiBaseUrl }: { apiBaseUrl: string }) {
  const [serviceStatus, setServiceStatus] = useState('Checking service…');
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    let active = true;
    void fetch(new URL('/health', apiBaseUrl), {
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    })
      .then((response) => {
        if (active) setServiceStatus(response.ok ? 'Service online' : 'Service unavailable');
      })
      .catch(() => {
        if (active) setServiceStatus('Service unavailable');
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [apiBaseUrl]);
  return <ProjectWorkspace apiBaseUrl={apiBaseUrl} serviceStatus={serviceStatus} />;
}
