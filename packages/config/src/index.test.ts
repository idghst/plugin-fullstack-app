import { expect, it } from 'vitest';
import { apiBaseUrlSchema, productionApiBaseUrlSchema } from './index';

it('rejects URLs without the versioned API path and unsafe protocols', () => {
  expect(apiBaseUrlSchema.safeParse('http://localhost:4000/api/v1').success).toBe(true);
  expect(apiBaseUrlSchema.safeParse('ftp://localhost/api/v1').success).toBe(false);
  expect(apiBaseUrlSchema.safeParse('http://localhost:4000').success).toBe(false);
});

it('requires HTTPS in production and rejects credential or path confusion', () => {
  expect(productionApiBaseUrlSchema.safeParse('https://api.example.com/api/v1').success).toBe(true);
  for (const value of [
    'http://localhost:4000/api/v1',
    'http://api.example.com/api/v1',
    'https://user:password@api.example.com/api/v1',
    'https://api.example.com/other/api/v1',
    'https://api.example.com/api/v1?key=secret',
    'https://api.example.com/api/v1#fragment',
  ]) {
    expect(productionApiBaseUrlSchema.safeParse(value).success).toBe(false);
  }
});
