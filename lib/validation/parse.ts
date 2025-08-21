import { z, ZodTypeAny } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { toValidationError } from './errors'

export interface ParseResult<T> { data: T | null; response: NextResponse | null }
export async function parseJsonBody<TSchema extends ZodTypeAny>(req: NextRequest, schema: TSchema): Promise<ParseResult<z.infer<TSchema>>> {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return { data: null, response: NextResponse.json({ success: false, error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 }) }
  }
  const result = schema.safeParse(json)
  if (!result.success) {
    const norm = toValidationError(result.error)
    return { data: null, response: NextResponse.json(norm, { status: 400 }) }
  }
  return { data: result.data, response: null }
}
