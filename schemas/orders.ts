import { z } from 'zod'
import { idSchema } from './shared'

export const orderItemInputSchema = z.object({
  product_id: idSchema,
  quantity: z.coerce.number().int().min(1).max(999)
})

export const orderCreateSchema = z.object({
  table_id: idSchema,
  items: z.array(orderItemInputSchema).min(1).max(200)
})

export const orderStatusUpdateSchema = z.object({
  status: z.string().min(2).max(32)
})

export const orderDetailsBatchSchema = z.object({
  ids: z.array(idSchema).min(1).max(100)
})

export type OrderCreateInput = z.infer<typeof orderCreateSchema>
export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>
export type OrderDetailsBatchInput = z.infer<typeof orderDetailsBatchSchema>
