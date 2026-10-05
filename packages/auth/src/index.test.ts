import { expect, it } from 'vitest';
import { createMemoryTokenStore } from './index';

it('keeps token stores isolated and clears both tokens on logout', async () => {
  const first = createMemoryTokenStore();
  const second = createMemoryTokenStore();
  await first.set({ accessToken: 'a', refreshToken: 'r', user: { id: 'u', email: 'a@b.com' } });
  expect(await second.get()).toBeNull();
  await first.clear();
  expect(await first.get()).toBeNull();
});
