import { z } from 'zod'

// Numeric ID (firestore numeric sequences stored as numbers)
export const idSchema = z.number().int().positive()
export const idParam = z.string().regex(/^\d+$/).transform((v: string) => Number(v))

export const languageSchema = z.enum(['ar','fr','en']).default('ar')
export const currencySchema = z.enum(['USD','EUR','MAD','TND','DZD']).default('DZD')

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
})

export const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{3,32}$/)
export const passwordSchema = z.string().min(6)

export type PaginationInput = z.infer<typeof paginationSchema>
