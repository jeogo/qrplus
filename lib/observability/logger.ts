import { randomUUID } from 'crypto'

export interface LogFields {
  msg: string
  level?: 'debug'|'info'|'warn'|'error'
  requestId?: string
  userId?: string|number
  role?: string
  accountId?: string|number
  orderId?: string|number
  span?: string
  durationMs?: number
  [k: string]: unknown
}

function base(fields: Omit<LogFields,'msg'> & { msg: string }) {
  const { level = 'info', msg, ...rest } = fields
  const line = { t: new Date().toISOString(), level, msg, ...rest }
  // eslint-disable-next-line no-console
  if (level === 'error') console.error(JSON.stringify(line))
  else if (level === 'warn') console.warn(JSON.stringify(line))
  else if (level === 'debug') console.debug(JSON.stringify(line))
  else console.log(JSON.stringify(line))
}

type In = { msg: string } & Partial<Omit<LogFields,'msg'|'level'>>
export const logger = {
  info: (f: In) => base({ ...f, level: 'info' }),
  warn: (f: In) => base({ ...f, level: 'warn' }),
  error: (f: In & { err?: unknown }) => {
    const { err, ...rest } = f
    base({ ...rest, level: 'error', err: serializeErr(err) })
  },
  debug: (f: In) => base({ ...f, level: 'debug' }),
  requestId: () => randomUUID(),
}

function serializeErr(err: unknown) {
  if (!err) return undefined
  if (err instanceof Error) return { name: err.name, message: err.message, stack: err.stack }
  return err
}
