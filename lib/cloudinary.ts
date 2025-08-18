import crypto from 'crypto'

interface SignOptions {
  folder?: string
  timestamp?: number
  [key: string]: unknown
}

export interface CloudinarySignatureResult {
  timestamp: number
  folder?: string
  signature: string
  apiKey: string
  cloudName: string
}

export function generateCloudinarySignature(opts: SignOptions = {}): CloudinarySignatureResult {
  const apiSecret = process.env.CLOUDINARY_API_SECRET || ''
  const apiKey = process.env.CLOUDINARY_API_KEY || ''
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || ''
  if (!apiSecret || !apiKey || !cloudName) {
    throw new Error('Cloudinary env vars missing')
  }
  const timestamp = opts.timestamp || Math.round(Date.now() / 1000)
  const params: Record<string, string | number | undefined> = { folder: opts.folder as string | undefined, timestamp }
  Object.keys(params).forEach(k => params[k] == null && delete params[k])
  const paramString = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&')
  const signature = crypto.createHash('sha1').update(paramString + apiSecret).digest('hex')
  return { timestamp, folder: typeof params.folder === 'string' ? params.folder : undefined, signature, apiKey, cloudName }
}
