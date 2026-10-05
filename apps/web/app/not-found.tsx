import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="app-shell">
      <div className="empty-state">
        <h1>Page not found.</h1>
        <p>Let’s get you back to your projects.</p>
        <Link className="inline-block mt-6 underline" href="/">
          Back to workspace
        </Link>
      </div>
    </main>
  );
}
