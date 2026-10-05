import { expect, it } from 'vitest';
import { apiBaseUrlSchema } from './index';

it('rejects URLs without the versioned API path and unsafe protocols', () => {
  expect(apiBaseUrlSchema.safeParse('http://localhost:4000/api/v1').success).toBe(true);
  expect(apiBaseUrlSchema.safeParse('ftp://localhost/api/v1').success).toBe(false);
  expect(apiBaseUrlSchema.safeParse('http://localhost:4000').success).toBe(false);
});
