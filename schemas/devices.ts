import { z } from 'zod'

export const deviceRegisterSchema = z.object({
  token: z.string().trim().min(10).max(512),
  role: z.string().trim().min(3).max(32).optional(),
  lang: z.enum(['ar','fr']).optional()
})

export const deviceUnregisterSchema = z.object({
  token: z.string().trim().min(10).max(512)
})

export type DeviceRegisterInput = z.infer<typeof deviceRegisterSchema>
export type DeviceUnregisterInput = z.infer<typeof deviceUnregisterSchema>
