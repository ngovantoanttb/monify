import { serialize, parse } from 'cookie'
import type { IncomingMessage, ServerResponse } from 'http'

const isProduction = process.env.NODE_ENV === 'production'

/**
 * Gắn cookies phiên xác thực vào response HTTP
 */
export function setAuthCookies(res: ServerResponse, accessToken: string, refreshToken: string) {
  const accessCookie = serialize('access_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60, // 15 mins
  })

  const refreshCookie = serialize('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })

  res.setHeader('Set-Cookie', [accessCookie, refreshCookie])
}

/**
 * Xóa toàn bộ cookies phiên xác thực
 */
export function clearAuthCookies(res: ServerResponse) {
  const accessCookie = serialize('access_token', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  })

  const refreshCookie = serialize('refresh_token', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 0,
    expires: new Date(0),
  })

  res.setHeader('Set-Cookie', [accessCookie, refreshCookie])
}

/**
 * Đọc cookies từ request
 */
export function getCookies(req: IncomingMessage): Record<string, string | undefined> {
  const cookieHeader = req.headers.cookie
  if (!cookieHeader) return {}
  return parse(cookieHeader)
}
