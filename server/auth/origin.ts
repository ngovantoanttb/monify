import type { IncomingMessage, ServerResponse } from 'http'

const APP_URL = process.env.APP_URL || 'http://localhost:3000'

/**
 * Kiểm tra header Origin cho các phương thức thay đổi dữ liệu (POST, PATCH, DELETE, PUT)
 * Ngăn chặn tấn công CSRF
 */
export function validateOrigin(req: IncomingMessage, res: ServerResponse): boolean {
  const method = req.method?.toUpperCase() || ''
  if (!['POST', 'PATCH', 'DELETE', 'PUT'].includes(method)) {
    return true
  }

  const origin = req.headers.origin || req.headers.referer
  if (!origin) {
    // Nếu request không có origin hoặc referer khi đổi dữ liệu
    // Cho phép trong môi trường test/development nếu cấu hình cho phép
    if (process.env.NODE_ENV === 'test') return true
    sendError(res, 403, 'ORIGIN_REQUIRED', 'Yêu cầu header Origin hợp lệ')
    return false
  }

  try {
    const originUrl = new URL(origin).origin
    const expectedUrl = new URL(APP_URL).origin

    // Cho phép localhost trong môi trường dev/staging
    const isLocal = originUrl.includes('localhost') || originUrl.includes('127.0.0.1')
    if (originUrl === expectedUrl || (process.env.NODE_ENV !== 'production' && isLocal)) {
      return true
    }

    sendError(res, 403, 'INVALID_ORIGIN', 'Origin không khớp với địa chỉ ứng dụng')
    return false
  } catch {
    sendError(res, 403, 'INVALID_ORIGIN', 'Định dạng Origin không hợp lệ')
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
