import { z } from 'zod';

export const API_PREFIX = '/api/v1';
export const apiBaseUrlSchema = z.url().refine((value) => {
  const url = new URL(value);
  return (
    ['http:', 'https:'].includes(url.protocol) &&
    url.pathname.replace(/\/$/, '') === API_PREFIX &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash
  );
}, 'API URL must use HTTP(S) and end with /api/v1');
