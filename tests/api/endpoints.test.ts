import { describe, it, expect, beforeEach, vi } from 'vitest'
import loginHandler from '../../api/auth/login'
import refreshHandler from '../../api/auth/refresh'
import logoutHandler from '../../api/auth/logout'
import meHandler from '../../api/auth/me'
import { serialize } from 'cookie'
import { signAccessToken } from '../../server/auth/jwt'
import { createSession } from '../../server/auth/session'
import type { IncomingMessage, ServerResponse } from 'http'
import type { UserProfile } from '@shared/types'

const mockDbStore: Record<string, any> = {}

vi.mock('../../server/firebase/admin', () => {
  return {
    hasServiceAccount: true,
    adminDb: {
      ref: (path?: string) => ({
        get: async () => ({
          exists: () => (path ? mockDbStore[path] !== undefined : false),
          val: () => (path ? mockDbStore[path] : mockDbStore),
        }),
        set: async (val: any) => {
          if (path) mockDbStore[path] = val
        },
        update: async (val: any) => {
          if (path) {
            mockDbStore[path] = { ...mockDbStore[path], ...val }
          } else {
            for (const [k, v] of Object.entries(val)) {
              if (k.startsWith('authSessions/') && k.endsWith('/revokedAt')) {
                const sid = k.split('/')[1]
                if (mockDbStore[`authSessions/${sid}`]) {
                  mockDbStore[`authSessions/${sid}`].revokedAt = v
                }
              }
              mockDbStore[k] = v
            }
          }
        },
        orderByChild: (_child: string) => ({
          equalTo: (val: any) => ({
            get: async () => ({
              exists: () => Object.values(mockDbStore).some((v: any) => v?.uid === val),
              forEach: (cb: (child: any) => void) => {
                Object.entries(mockDbStore).forEach(([k, v]: [string, any]) => {
                  if (k.startsWith('authSessions/') && v?.uid === val) {
                    cb({ key: k.replace('authSessions/', ''), val: () => v })
                  }
                })
              },
            }),
          }),
        }),
      }),
    },
    adminAuth: {
      verifyIdToken: async (token: string) => {
        if (token === 'valid_token') {
          return { uid: 'user_new', email: 'new@example.com', name: 'User New' }
        }
        if (token === 'revoked_token') {
          const err: any = new Error('Token revoked')
          err.code = 'auth/id-token-revoked'
          throw err
        }
        if (token === 'locked_token') {
          return { uid: 'user_locked', email: 'locked@example.com', name: 'User Locked' }
        }
        throw new Error('Token verification failed')
      },
      getUser: async (uid: string) => {
        if (uid === 'admin_user') return { uid, customClaims: { role: 'admin' } }
        if (uid === 'error_claims') throw new Error('Auth error')
        return { uid, customClaims: { role: 'member' } }
      },
      revokeRefreshTokens: async () => {},
    },
  }
})

function createMockReqRes(options: {
  method?: string
  body?: any
  headers?: Record<string, string>
  url?: string
  rawBody?: string
}) {
  let statusCode = 200
  let responseData = ''
  const responseHeaders: Record<string, any> = {}

  const req = {
    method: options.method || 'GET',
    headers: options.headers || {},
    url: options.url || '/',
    on: (event: string, cb: (data?: any) => void) => {
      if (event === 'data') {
        if (options.rawBody !== undefined) {
          cb(options.rawBody)
        } else if (options.body !== undefined) {
          cb(typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
        }
      }
      if (event === 'end') {
        cb()
      }
    },
  } as unknown as IncomingMessage

  const res = {
    set statusCode(code: number) {
      statusCode = code
    },
    get statusCode() {
      return statusCode
    },
    setHeader: (name: string, value: any) => {
      responseHeaders[name] = value
    },
    end: (chunk?: string) => {
      if (chunk) responseData = chunk
    },
  } as unknown as ServerResponse

  return {
    req,
    res,
    getStatusCode: () => statusCode,
    getData: () => (responseData ? JSON.parse(responseData) : null),
    getHeaders: () => responseHeaders,
  }
}

describe('Auth API Endpoints Full Scenarios', () => {
  beforeEach(() => {
    for (const key in mockDbStore) {
      delete mockDbStore[key]
    }
  })

  describe('POST /api/auth/login', () => {
    it('chặn method không phải POST', async () => {
      const { req, res, getStatusCode, getData } = createMockReqRes({ method: 'GET' })
      await loginHandler(req, res)
      expect(getStatusCode()).toBe(405)
      expect(getData().code).toBe('METHOD_NOT_ALLOWED')
    })

    it('chặn khi Origin không hợp lệ trong production', async () => {
      const prevEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      const { req, res, getStatusCode } = createMockReqRes({
        method: 'POST',
        headers: { origin: 'https://attacker.com' },
      })
      await loginHandler(req, res)
      expect(getStatusCode()).toBe(403)
      process.env.NODE_ENV = prevEnv
    })

    it('xử lý khi body chứa JSON không hợp lệ', async () => {
      const { req, res, getStatusCode, getData } = createMockReqRes({
        method: 'POST',
        rawBody: 'invalid-json-string',
        headers: { origin: 'http://localhost:3000' },
      })
      await loginHandler(req, res)
      expect(getStatusCode()).toBe(400)
      expect(getData().code).toBe('BAD_REQUEST')
    })

    it('chặn khi thiếu idToken', async () => {
      const { req, res, getStatusCode, getData } = createMockReqRes({
        method: 'POST',
        body: {},
        headers: { origin: 'http://localhost:3000' },
      })
      await loginHandler(req, res)
      expect(getStatusCode()).toBe(400)
      expect(getData().code).toBe('BAD_REQUEST')
    })

    it('xử lý khi ID token bị thu hồi (auth/id-token-revoked)', async () => {
      const { req, res, getStatusCode, getData } = createMockReqRes({
        method: 'POST',
        body: { idToken: 'revoked_token' },
        headers: { origin: 'http://localhost:3000' },
      })
      await loginHandler(req, res)
      expect(getStatusCode()).toBe(401)
      expect(getData().code).toBe('TOKEN_REVOKED')
    })

    it('đăng nhập lần đầu tạo hồ sơ, seed 4 ví và set cookies', async () => {
      const { req, res, getStatusCode, getData, getHeaders } = createMockReqRes({
        method: 'POST',
        body: { idToken: 'valid_token' },
        headers: { origin: 'http://localhost:3000' },
      })
      await loginHandler(req, res)

      expect(getStatusCode()).toBe(200)
      const data = getData()
      expect(data.status).toBe('success')
      expect(data.data.user.email).toBe('new@example.com')
      expect(data.data.user.role).toBe('member')

      const setCookie = getHeaders()['Set-Cookie']
      expect(Array.isArray(setCookie)).toBe(true)
      expect(setCookie.some((c: string) => c.includes('access_token='))).toBe(true)
      expect(setCookie.some((c: string) => c.includes('refresh_token='))).toBe(true)

      expect(mockDbStore['financial/user_new/accounts/acc_1']).toBeDefined()
      expect(mockDbStore['financial/user_new/accounts/acc_2']).toBeDefined()
      expect(mockDbStore['financial/user_new/accounts/acc_3']).toBeDefined()
      expect(mockDbStore['financial/user_new/accounts/acc_4']).toBeDefined()
    })

    it('từ chối đăng nhập khi tài khoản bị khóa (locked)', async () => {
      mockDbStore['users/user_locked'] = {
        uid: 'user_locked',
        email: 'locked@example.com',
        displayName: 'Locked User',
        status: 'locked',
        role: 'member',
      }

      const { req, res, getStatusCode, getData } = createMockReqRes({
        method: 'POST',
        body: { idToken: 'locked_token' },
        headers: { origin: 'http://localhost:3000' },
      })

      await loginHandler(req, res)

      expect(getStatusCode()).toBe(403)
      const data = getData()
      expect(data.code).toBe('ACCOUNT_LOCKED')
    })
  })

  describe('POST & GET /api/auth/refresh', () => {
    it('chặn method không hợp lệ (ví dụ DELETE)', async () => {
      const { req, res, getStatusCode } = createMockReqRes({ method: 'DELETE' })
      await refreshHandler(req, res)
      expect(getStatusCode()).toBe(405)
    })

    it('chặn khi Origin không hợp lệ trong POST', async () => {
      const prevEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      const { req, res, getStatusCode } = createMockReqRes({
        method: 'POST',
        headers: { origin: 'https://bad-origin.com' },
      })
      await refreshHandler(req, res)
      expect(getStatusCode()).toBe(403)
      process.env.NODE_ENV = prevEnv
    })

    it('trả về 401 khi thiếu refresh token trong cookie', async () => {
      const { req, res, getStatusCode, getData } = createMockReqRes({
        method: 'POST',
        headers: { origin: 'http://localhost:3000' },
      })
      await refreshHandler(req, res)
      expect(getStatusCode()).toBe(401)
      expect(getData().code).toBe('MISSING_REFRESH_TOKEN')
    })

    it('trả về 401 khi token format sai hoặc phiên không tồn tại', async () => {
      const { req, res, getStatusCode } = createMockReqRes({
        method: 'POST',
        headers: {
          cookie: serialize('refresh_token', 'invalid_format'),
          origin: 'http://localhost:3000',
        },
      })
      await refreshHandler(req, res)
      expect(getStatusCode()).toBe(401)
    })

    it('làm mới token thành công qua POST và xoay vòng refresh token', async () => {
      const { req: loginReq, res: loginRes, getHeaders: getLoginHeaders } = createMockReqRes({
        method: 'POST',
        body: { idToken: 'valid_token' },
        headers: { origin: 'http://localhost:3000' },
      })
      await loginHandler(loginReq, loginRes)

      const cookies = getLoginHeaders()['Set-Cookie'] as string[]
      const refreshCookie = cookies.find((c) => c.includes('refresh_token='))!
      const refreshTokenVal = refreshCookie.split(';')[0].replace('refresh_token=', '')

      const { req: refreshReq, res: refreshRes, getStatusCode, getData, getHeaders } = createMockReqRes({
        method: 'POST',
        headers: {
          cookie: serialize('refresh_token', refreshTokenVal),
          origin: 'http://localhost:3000',
        },
      })

      await refreshHandler(refreshReq, refreshRes)

      expect(getStatusCode()).toBe(200)
      const data = getData()
      expect(data.status).toBe('success')

      const newCookies = getHeaders()['Set-Cookie'] as string[]
      expect(newCookies.some((c) => c.includes('access_token='))).toBe(true)
      expect(newCookies.some((c) => c.includes('refresh_token='))).toBe(true)
    })

    it('GET /api/auth/refresh thực hiện chuyển hướng 302 về next url', async () => {
      const { req: loginReq, res: loginRes, getHeaders: getLoginHeaders } = createMockReqRes({
        method: 'POST',
        body: { idToken: 'valid_token' },
        headers: { origin: 'http://localhost:3000' },
      })
      await loginHandler(loginReq, loginRes)

      const cookies = getLoginHeaders()['Set-Cookie'] as string[]
      const refreshCookie = cookies.find((c) => c.includes('refresh_token='))!
      const refreshTokenVal = refreshCookie.split(';')[0].replace('refresh_token=', '')

      const { req, res, getStatusCode, getHeaders } = createMockReqRes({
        method: 'GET',
        url: '/api/auth/refresh?next=/dashboard',
        headers: {
          cookie: serialize('refresh_token', refreshTokenVal),
        },
      })

      await refreshHandler(req, res)

      expect(getStatusCode()).toBe(302)
      expect(getHeaders()['Location']).toBe('/dashboard')
    })

    it('xử lý khi auth.getUser ném lỗi trong refresh', async () => {
      mockDbStore['users/error_claims'] = { uid: 'error_claims', status: 'active', role: 'member' }
      const sErr = await createSession('error_claims')
      const { req, res, getStatusCode } = createMockReqRes({
        method: 'POST',
        headers: {
          cookie: serialize('refresh_token', sErr.refreshToken),
          origin: 'http://localhost:3000',
        },
      })
      await refreshHandler(req, res)
      expect(getStatusCode()).toBe(200)
    })

    it('chặn refresh khi user bị xóa hoặc bị khóa', async () => {
      const { refreshToken } = await createSession('user_deleted')
      const { req, res, getStatusCode, getData } = createMockReqRes({
        method: 'POST',
        headers: {
          cookie: serialize('refresh_token', refreshToken),
          origin: 'http://localhost:3000',
        },
      })

      await refreshHandler(req, res)
      expect(getStatusCode()).toBe(404)
      expect(getData().code).toBe('USER_NOT_FOUND')

      // Kiểm tra user bị khóa
      mockDbStore['users/user_locked_refresh'] = { uid: 'user_locked_refresh', status: 'locked' }
      const sLocked = await createSession('user_locked_refresh')
      const { req: req2, res: res2, getStatusCode: getStatusCode2, getData: getData2 } = createMockReqRes({
        method: 'POST',
        headers: {
          cookie: serialize('refresh_token', sLocked.refreshToken),
          origin: 'http://localhost:3000',
        },
      })
      await refreshHandler(req2, res2)
      expect(getStatusCode2()).toBe(403)
      expect(getData2().code).toBe('ACCOUNT_LOCKED')
    })
  })

  describe('POST /api/auth/logout', () => {
    it('chặn method không phải POST', async () => {
      const { req, res, getStatusCode } = createMockReqRes({ method: 'GET' })
      await logoutHandler(req, res)
      expect(getStatusCode()).toBe(405)
    })

    it('chặn khi Origin không hợp lệ trong production', async () => {
      const prevEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      const { req, res, getStatusCode } = createMockReqRes({
        method: 'POST',
        headers: { origin: 'https://malicious.com' },
      })
      await logoutHandler(req, res)
      expect(getStatusCode()).toBe(403)
      process.env.NODE_ENV = prevEnv
    })

    it('xử lý khi body chứa JSON lỗi trong logout', async () => {
      const { req, res, getStatusCode } = createMockReqRes({
        method: 'POST',
        rawBody: 'invalid-json',
        headers: { origin: 'http://localhost:3000' },
      })
      await logoutHandler(req, res)
      expect(getStatusCode()).toBe(200)
    })

    it('đăng xuất đơn thiết bị thu hồi phiên hiện tại và xóa cookies', async () => {
      const token = await signAccessToken({ uid: 'user_123', sid: 'session_out', role: 'member' })
      mockDbStore['authSessions/session_out'] = { uid: 'user_123', createdAt: 1, lastUsedAt: 1, expiresAt: Date.now() + 10000 }

      const { req, res, getStatusCode, getHeaders } = createMockReqRes({
        method: 'POST',
        headers: {
          cookie: serialize('access_token', token),
          origin: 'http://localhost:3000',
        },
      })

      await logoutHandler(req, res)

      expect(getStatusCode()).toBe(200)
      expect(mockDbStore['authSessions/session_out'].revokedAt).toBeDefined()

      const cookies = getHeaders()['Set-Cookie'] as string[]
      expect(cookies.some((c) => c.includes('access_token=;') || c.includes('Max-Age=0'))).toBe(true)
    })

    it('đăng xuất khi chỉ có refresh token mà không có access token', async () => {
      const sRef = await createSession('user_refresh_only')
      const { req, res, getStatusCode } = createMockReqRes({
        method: 'POST',
        headers: {
          cookie: serialize('refresh_token', sRef.refreshToken),
          origin: 'http://localhost:3000',
        },
      })

      await logoutHandler(req, res)
      expect(getStatusCode()).toBe(200)
      expect(mockDbStore[`authSessions/${sRef.sid}`].revokedAt).toBeDefined()
    })

    it('đăng xuất mọi thiết bị (all=true) thu hồi toàn bộ phiên của người dùng', async () => {
      const token = await signAccessToken({ uid: 'user_multi', sid: 'sess_1', role: 'member' })
      mockDbStore['authSessions/sess_1'] = { uid: 'user_multi', createdAt: 1, lastUsedAt: 1, expiresAt: Date.now() + 10000 }
      mockDbStore['authSessions/sess_2'] = { uid: 'user_multi', createdAt: 1, lastUsedAt: 1, expiresAt: Date.now() + 10000 }

      const { req, res, getStatusCode } = createMockReqRes({
        method: 'POST',
        body: { all: true },
        headers: {
          cookie: serialize('access_token', token),
          origin: 'http://localhost:3000',
        },
      })

      await logoutHandler(req, res)
      expect(getStatusCode()).toBe(200)
      expect(mockDbStore['authSessions/sess_1'].revokedAt).toBeDefined()
      expect(mockDbStore['authSessions/sess_2'].revokedAt).toBeDefined()
    })
  })

  describe('GET /api/auth/me', () => {
    it('chặn method không phải GET', async () => {
      const { req, res, getStatusCode } = createMockReqRes({ method: 'POST' })
      await meHandler(req, res)
      expect(getStatusCode()).toBe(405)
    })

    it('trả về 401 khi chưa đăng nhập', async () => {
      const { req, res, getStatusCode } = createMockReqRes({ method: 'GET' })
      await meHandler(req, res)
      expect(getStatusCode()).toBe(401)
    })

    it('trả về hồ sơ người dùng đang đăng nhập', async () => {
      const userProfile: UserProfile = {
        uid: 'user_me',
        email: 'me@example.com',
        displayName: 'Tôi Là Ai',
        role: 'member',
        status: 'active',
        createdAt: 1,
        updatedAt: 1,
      }
      mockDbStore['users/user_me'] = userProfile
      mockDbStore['authSessions/session_me'] = { uid: 'user_me', createdAt: 1, lastUsedAt: 1, expiresAt: Date.now() + 10000 }

      const token = await signAccessToken({ uid: 'user_me', sid: 'session_me', role: 'member' })

      const { req, res, getStatusCode, getData } = createMockReqRes({
        method: 'GET',
        headers: {
          cookie: serialize('access_token', token),
        },
      })

      await meHandler(req, res)

      expect(getStatusCode()).toBe(200)
      const data = getData()
      expect(data.data.user.email).toBe('me@example.com')
      expect(data.data.user.displayName).toBe('Tôi Là Ai')
    })
  })
})
