import { describe, expect, it } from 'vitest';
import { ProjectService, type ProjectRepository, type Project } from './index';

const record: Project = {
  id: 'p1',
  name: 'Starter',
  description: '',
  createdAt: '2026-10-06T00:00:00.000Z',
  updatedAt: '2026-10-06T00:00:00.000Z',
};
const repo: ProjectRepository = {
  create: async (_owner, input) => ({ ...record, ...input }),
  list: async () => [record],
  get: async () => null,
  update: async () => null,
  delete: async () => false,
};

describe('Project business rules', () => {
  it('fails missing records with a stable domain error', async () => {
    await expect(new ProjectService(repo).get('owner', 'missing')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
  it('passes ownership to the repository for every operation', async () => {
    const owners: string[] = [];
    const service = new ProjectService({
      ...repo,
      list: async (owner) => {
        owners.push(owner);
        return [record];
      },
    });
    expect(await service.list('alice')).toEqual([record]);
    expect(owners).toEqual(['alice']);
  });
  it('rejects blank domain names independently of HTTP validation', async () => {
    await expect(
      new ProjectService(repo).create('alice', { name: ' ', description: '' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});
