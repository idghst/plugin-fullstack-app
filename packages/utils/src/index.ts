// Request IDs correlate logs; they are not authentication credentials.
export function createRequestId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  );
}
