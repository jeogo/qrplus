import { ZodError, ZodIssue } from 'zod'

export interface NormalizedErrorIssue { path: string; message: string }
export interface NormalizedValidationError {
  success: false
  error: string
  code: 'VALIDATION_ERROR'
  issues: NormalizedErrorIssue[]
}

export function toValidationError(err: unknown): NormalizedValidationError | null {
  if (err instanceof ZodError) {
    return {
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      issues: (err.issues as ZodIssue[]).map((i: ZodIssue) => ({ path: i.path.join('.'), message: i.message }))
    }
  }
  return null
}
