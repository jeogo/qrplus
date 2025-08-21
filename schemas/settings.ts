import { z } from 'zod'
import { languageSchema, currencySchema } from './shared'

export const settingsUpdateSchema = z.object({
  restaurant_name: z.string().trim().min(2).max(120).optional(),
  system_active: z.boolean().optional(),
  address: z.string().trim().max(200).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  email: z.string().email().nullable().optional(),
  language: languageSchema.optional(),
  currency: currencySchema.optional(),
  logo_url: z.string().trim().url().max(500).optional(),
}).refine(o => Object.keys(o).length > 0, { message: 'No changes', path: [] })

export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>
