import { ProjectWorkspace } from '@starter/project-ui';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const baseUrl = process.env.API_BASE_URL!;
  let serviceStatus = 'Service unavailable';
  try {
    const response = await fetch(new URL('/health', baseUrl), {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) serviceStatus = 'Service online';
  } catch {
    /* The workspace remains available to retry when the service returns. */
  }
  return (
    <ProjectWorkspace
      apiBaseUrl={process.env.NEXT_PUBLIC_API_BASE_URL!}
      serviceStatus={serviceStatus}
    />
  );
}
