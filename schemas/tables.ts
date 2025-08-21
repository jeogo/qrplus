import { z } from 'zod'

export const tableCreateSchema = z.object({
  table_number: z.coerce.number().int().min(1).optional(),
  __host_override: z.string().trim().url().optional()
})

export const tableUpdateSchema = z.object({
  table_number: z.coerce.number().int().min(1)
}).refine(obj => Object.keys(obj).length > 0, { message: 'No changes', path: [] })

export type TableCreateInput = z.infer<typeof tableCreateSchema>
export type TableUpdateInput = z.infer<typeof tableUpdateSchema>
