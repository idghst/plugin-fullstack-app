'use client';
import { Button } from '@starter/ui';
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="app-shell">
      <div className="empty-state">
        <h1>Something went wrong.</h1>
        <p>The workspace could not load. Please try again.</p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
