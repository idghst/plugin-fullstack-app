import assert from 'node:assert/strict';
import test from 'node:test';
import { productionDesktopConfig } from './prepare-desktop-config.mjs';

const base = {
  app: {
    security: {
      csp: "default-src 'self'; connect-src 'self' http://localhost:4000; object-src 'none'",
    },
  },
};
test('production CSP allows only the selected HTTPS API origin and native IPC', () => {
  const result = productionDesktopConfig(base, 'https://api.example.com:8443/api/v1');
  assert.equal(
    result.app.security.csp,
    "default-src 'self'; connect-src 'self' ipc: http://ipc.localhost https://api.example.com:8443; object-src 'none'",
  );
  assert.equal(base.app.security.csp.includes('localhost:4000'), true);
});
test('production config rejects HTTP and credential-bearing API URLs', () => {
  assert.throws(() => productionDesktopConfig(base, 'http://localhost:4000/api/v1'));
  assert.throws(() => productionDesktopConfig(base, 'https://user:secret@api.example.com/api/v1'));
});
