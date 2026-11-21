import type { IncomingMessage, ServerResponse } from 'http'
import { getCookies, clearAuthCookies } from '../../server/auth/cookie'
import { revokeSession, revokeAllUserSessions } from '../../server/auth/session'
import { verifyAccessToken } from '../../server/auth/jwt'
import { adminAuth } from '../../server/firebase/admin'
import { validateOrigin, sendError, sendSuccess } from '../../server/auth/origin'

async function parseBody(req: IncomingMessage): Promise<any> {
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

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (req.method !== 'POST') {
      return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Chỉ chấp nhận phương thức POST')
    }

    if (!validateOrigin(req, res)) {
      return
    }

    // Luôn dọn sạch cookies xác thực trên mọi yêu cầu đăng xuất hợp lệ
    clearAuthCookies(res)

    const cookies = getCookies(req)
    const accessToken = cookies.access_token
    const refreshToken = cookies.refresh_token
    const body = await parseBody(req)

    let sid: string | undefined

    if (accessToken) {
      const payload = await verifyAccessToken(accessToken)
      if (payload?.sid) {
        sid = payload.sid
      }
      if (body?.all === true && payload?.sub) {
        await revokeAllUserSessions(payload.sub)
        try {
          await adminAuth.revokeRefreshTokens(payload.sub)
        } catch {
          // Bỏ qua lỗi nếu không thu hồi được trên auth
        }
      }
    }

    if (!sid && refreshToken) {
      sid = refreshToken.split('.')[0]
    }

    if (sid && body?.all !== true) {
      await revokeSession(sid)
    }
  } catch (err) {
    console.warn('[Logout API] Session revocation error:', err)
  }

  return sendSuccess(res, { message: 'Đăng xuất thành công' })
}
