export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}
export interface CreateProject {
  name: string;
  description: string;
}
export interface UpdateProject {
  name?: string | undefined;
  description?: string | undefined;
}

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

// A port exists here because both the application and SQL implementation use it.
export interface ProjectRepository {
  create(ownerId: string, input: CreateProject): Promise<Project>;
  list(ownerId: string): Promise<Project[]>;
  get(ownerId: string, id: string): Promise<Project | null>;
  update(ownerId: string, id: string, input: UpdateProject): Promise<Project | null>;
  delete(ownerId: string, id: string): Promise<boolean>;
}

function validateInput(input: UpdateProject): UpdateProject {
  if (input.name !== undefined && (!input.name.trim() || input.name.trim().length > 100)) {
    throw new DomainError('VALIDATION_ERROR', 'Project name must contain 1–100 characters');
  }
  if (input.description !== undefined && input.description.length > 2000) {
    throw new DomainError(
      'VALIDATION_ERROR',
      'Project description must contain at most 2000 characters',
    );
  }
  return { ...input, ...(input.name !== undefined ? { name: input.name.trim() } : {}) };
}

export class ProjectService {
  constructor(private readonly repository: ProjectRepository) {}
  async create(ownerId: string, input: CreateProject): Promise<Project> {
    validateInput(input);
    return this.repository.create(ownerId, { ...input, name: input.name.trim() });
  }
  list(ownerId: string): Promise<Project[]> {
    return this.repository.list(ownerId);
  }
  async get(ownerId: string, id: string): Promise<Project> {
    const project = await this.repository.get(ownerId, id);
    if (!project) throw new DomainError('NOT_FOUND', 'Project not found');
    return project;
  }
  async update(ownerId: string, id: string, input: UpdateProject): Promise<Project> {
    if (input.name === undefined && input.description === undefined)
      throw new DomainError('VALIDATION_ERROR', 'At least one field is required');
    const project = await this.repository.update(ownerId, id, validateInput(input));
    if (!project) throw new DomainError('NOT_FOUND', 'Project not found');
    return project;
  }
  async delete(ownerId: string, id: string): Promise<void> {
    if (!(await this.repository.delete(ownerId, id)))
      throw new DomainError('NOT_FOUND', 'Project not found');
  }
}
