import type { IncomingMessage, ServerResponse } from 'http'

const APP_URL = process.env.APP_URL || 'http://localhost:3000'

/**
 * Kiểm tra header Origin cho các phương thức thay đổi dữ liệu (POST, PATCH, DELETE, PUT)
 * Ngăn chặn tấn công CSRF
 */
export function validateOrigin(req: IncomingMessage, res: ServerResponse): boolean {
  try {
    const method = req.method?.toUpperCase() || ''
    if (!['POST', 'PATCH', 'DELETE', 'PUT'].includes(method)) {
      return true
    }

    const origin = (req.headers.origin as string) || (req.headers.referer as string)
    if (!origin) {
      if (process.env.NODE_ENV === 'test') return true
      sendError(res, 403, 'ORIGIN_REQUIRED', 'Yêu cầu header Origin hợp lệ')
      return false
    }

    let originUrl = ''
    try {
      originUrl = new URL(origin).origin
    } catch {
      sendError(res, 403, 'INVALID_ORIGIN', 'Định dạng Origin không hợp lệ')
      return false
    }

    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host
    const proto = (req.headers['x-forwarded-proto'] as string) || (host?.includes('localhost') ? 'http' : 'https')
    const currentOrigin = host ? `${proto}://${host}` : ''

    let expectedUrl = ''
    try {
      const target = APP_URL.startsWith('http') ? APP_URL : `https://${APP_URL}`
      expectedUrl = new URL(target).origin
    } catch {
      expectedUrl = ''
    }

    const isMatchHost = Boolean(currentOrigin && originUrl === currentOrigin)
    const isVercel = originUrl.endsWith('.vercel.app')
    const isAppUrl = Boolean(expectedUrl && originUrl === expectedUrl)
    const isLocal = originUrl.includes('localhost') || originUrl.includes('127.0.0.1')

    if (isMatchHost || isVercel || isAppUrl || isLocal) {
      return true
    }

    sendError(res, 403, 'INVALID_ORIGIN', 'Origin không khớp với địa chỉ ứng dụng')
    return false
  } catch (err: any) {
    sendError(res, 500, 'ORIGIN_ERROR', err?.message || 'Lỗi kiểm tra Origin')
    return false
  }
}

export function sendError(res: ServerResponse, statusCode: number, code: string, message: string) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(
    JSON.stringify({
      status: 'error',
      code,
      message,
    })
  )
}

export function sendSuccess<T>(res: ServerResponse, data: T, statusCode: number = 200) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(
    JSON.stringify({
      status: 'success',
      data,
    })
  )
}

export function sendJson<T>(res: ServerResponse, statusCode: number, data: T) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

export async function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'))
      } catch {
        resolve({})
      }
    })
  })
}
