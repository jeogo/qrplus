import { z } from 'zod'
import { passwordSchema, usernameSchema, languageSchema } from './shared'

export const loginSchema = z.object({
  identifier: z.string().trim().min(1), // email or username
  password: passwordSchema,
})

export const registerSchema = z.object({
  username: usernameSchema,
  restaurant_name: z.string().trim().min(2).max(80),
  email: z.string().email().optional(),
  password: passwordSchema,
  language: languageSchema.optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
