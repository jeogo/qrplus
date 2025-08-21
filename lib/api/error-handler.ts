import { AppError } from '@/lib/errors'
import { routeErrorCounter } from '@/lib/observability/metrics'

export interface ErrorBody { success:false; error:{ code:string; message:string } }

// Central error normalization used by all API routes.
export function toErrorResponse(err: unknown, route?: string): { status:number; body: ErrorBody } {
  let status = 500; let code = 'SERVER_ERROR'; let message = 'Server error'
  if (err instanceof AppError){
    status = err.status; code = err.code; message = normalizeMessage(err)
  } else if (isHttpLike(err)) {
    status = typeof err.status === 'number'? err.status: 500
    code = typeof err.code === 'string'? err.code: 'SERVER_ERROR'
    message = mapStatusMessage(status, err.message)
  }
  if (route){
    try { routeErrorCounter.inc({ route, code }) } catch {}
  }
  return { status, body: { success:false, error:{ code, message } } }
}

function isHttpLike(e: any): e is { status?:number; code?:string; message?:string } {
  return e && typeof e === 'object'
}

function mapStatusMessage(status:number, base?:string){
  if (status === 401) return 'Unauthenticated'
  if (status === 403) return 'Forbidden'
  if (status >= 500) return 'Server error'
  return base || 'Error'
}

function normalizeMessage(e: AppError){
  if (e.status === 401) return 'Unauthenticated'
  if (e.status === 403) return 'Forbidden'
  if (e.status >= 500) return 'Server error'
  return e.message
}

// Assertion helper to shorten guard clauses.
export function assert(condition: any, code='BAD_REQUEST', message='Bad request', status=400){
  if(!condition) throw new AppError(message, status, code)
}
