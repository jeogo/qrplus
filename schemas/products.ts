import { z } from 'zod'
import { idSchema } from './shared'

// Query params for listing products (reserved for future pagination/filter refactor)
export const productsQuerySchema = z.object({
  category_id: z.string().regex(/^\d+$/).transform(v => Number(v)).optional(),
  q: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(300).default(60)
})

export const productCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category_id: idSchema,
  price: z.coerce.number().min(0).max(1_000_000),
  description: z.string().trim().min(1).max(500).optional(),
  image_url: z.string().trim().url().max(500).optional(),
  available: z.boolean().optional().default(true)
})

export const productUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  price: z.coerce.number().min(0).max(1_000_000).optional(),
  description: z.string().trim().min(1).max(500).optional(),
  image_url: z.string().trim().url().max(500).optional(),
  available: z.boolean().optional(),
  category_id: idSchema.optional()
}).refine(obj => Object.keys(obj).length > 0, { message: 'No changes', path: [] })

export type ProductCreateInput = z.infer<typeof productCreateSchema>
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>
