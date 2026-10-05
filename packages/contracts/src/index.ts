import { z } from 'zod';

const nameSchema = z.string().trim().min(1).max(100);
const descriptionSchema = z.string().max(2000);
export const projectSchema = z.strictObject({
  id: z.uuid(),
  name: nameSchema,
  description: descriptionSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const createProjectSchema = z.strictObject({
  name: nameSchema,
  description: descriptionSchema.default(''),
});
export const updateProjectSchema = z
  .strictObject({ name: nameSchema.optional(), description: descriptionSchema.optional() })
  .refine((input) => Object.keys(input).length > 0, 'At least one field is required');
export const projectListSchema = z.strictObject({ items: z.array(projectSchema) });
export const userSchema = z.strictObject({ id: z.uuid(), email: z.email() });
export const loginSchema = z.strictObject({
  email: z
    .email()
    .max(254)
    .transform((email) => email.toLowerCase()),
  password: z.string().min(12).max(128),
});
export const registerSchema = loginSchema;
export const tokensSchema = z.strictObject({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  user: userSchema,
});
export const refreshSchema = z.strictObject({ refreshToken: z.string().min(1).max(512) });
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string(),
  details: z.unknown().optional(),
});
export type Project = z.infer<typeof projectSchema>;
export type CreateProject = z.infer<typeof createProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
export type User = z.infer<typeof userSchema>;
export type Tokens = z.infer<typeof tokensSchema>;
export type Login = z.infer<typeof loginSchema>;
export type Register = z.infer<typeof registerSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;
