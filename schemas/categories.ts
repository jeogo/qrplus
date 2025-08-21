import { z } from 'zod'

export const categoriesQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50)
})

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(500).optional(),
  image_url: z.string().trim().url().max(500), // required historically
  active: z.boolean().optional().default(true)
})

export const categoryUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().min(1).max(500).optional(),
  image_url: z.string().trim().url().max(500).optional(),
  active: z.boolean().optional()
}).refine(obj => Object.keys(obj).length > 0, { message: 'No changes', path: [] })

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>
