import { describe, expect, it } from 'vitest';
import { createProjectSchema, updateProjectSchema, loginSchema } from './index';

describe('shared contract validation', () => {
  it('normalizes names and rejects blank names', () => {
    expect(createProjectSchema.parse({ name: '  License service  ' })).toEqual({
      name: 'License service',
      description: '',
    });
    expect(createProjectSchema.safeParse({ name: '   ' }).success).toBe(false);
  });
  it('rejects empty patches and unknown fields', () => {
    expect(updateProjectSchema.safeParse({}).success).toBe(false);
    expect(createProjectSchema.safeParse({ name: 'Safe', ownerId: 'another-user' }).success).toBe(
      false,
    );
  });
  it('requires a strong minimum length for local passwords', () => {
    expect(loginSchema.safeParse({ email: 'dev@example.com', password: 'short' }).success).toBe(
      false,
    );
  });
});
