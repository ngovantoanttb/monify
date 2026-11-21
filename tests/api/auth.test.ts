import { describe, it, expect, beforeEach, vi } from 'vitest'
import { signAccessToken, verifyAccessToken } from '../../server/auth/jwt'
import { hashSecret, createSession, rotateSession, revokeSession, revokeAllUserSessions } from '../../server/auth/session'
import { requireUser, requireAdmin } from '../../server/auth/guards'
import { validateOrigin } from '../../server/auth/origin'
import { serialize } from 'cookie'
import type { IncomingMessage, ServerResponse } from 'http'
import type { UserProfile } from '@shared/types'
import { SignJWT } from 'jose'

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
        if (token === 'valid_id_token') {
          return { uid: 'user_123', email: 'test@example.com', name: 'Nguyễn Văn A' }
        }
        if (token === 'locked_id_token') {
          return { uid: 'user_locked', email: 'locked@example.com', name: 'Người Bị Khóa' }
        }
        throw new Error('Invalid ID token')
      },
      getUser: async (uid: string) => ({
        uid,
        customClaims: uid === 'admin_123' ? { role: 'admin' } : { role: 'member' },
      }),
      revokeRefreshTokens: async () => {},
    },
  }
})

describe('Server Auth & JWT Unit Tests', () => {
  beforeEach(() => {
    for (const key in mockDbStore) {
      delete mockDbStore[key]
    }
  })

  describe('JWT Access Token Signing and Verification', () => {
    it('ký và xác thực access token hợp lệ', async () => {
      const token = await signAccessToken({
        uid: 'user_123',
        sid: 'session_abc',
        role: 'member',
      })

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')

      const payload = await verifyAccessToken(token)
      expect(payload).not.toBeNull()
      expect(payload?.sub).toBe('user_123')
      expect(payload?.sid).toBe('session_abc')
      expect(payload?.role).toBe('member')
      expect(payload?.iss).toBe('monify-auth')
      expect(payload?.aud).toBe('monify-app')
    })

    it('từ chối token giả mạo hoặc sai chữ ký', async () => {
      const token = await signAccessToken({
        uid: 'user_123',
        sid: 'session_abc',
        role: 'member',
      })

      const tamperedToken = token.slice(0, -5) + 'xxxxx'
      const payload = await verifyAccessToken(tamperedToken)
      expect(payload).toBeNull()
    })

    it('từ chối token thiếu các claim bắt buộc (sub, sid, role)', async () => {
      const secret = new TextEncoder().encode(process.env.AUTH_JWT_SECRET || 'dev-super-secret-jwt-key-must-be-at-least-32-chars-long!!')
      const incompleteToken = await new SignJWT({})
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer('monify-auth')
        .setAudience('monify-app')
        .sign(secret)

      const payload = await verifyAccessToken(incompleteToken)
      expect(payload).toBeNull()
    })
  })

  describe('Session Management & Rotation', () => {
    it('tạo phiên mới và lưu vào cơ sở dữ liệu', async () => {
      const { sid, refreshToken } = await createSession('user_123', 'Test Browser')

      expect(sid).toBeDefined()
      expect(refreshToken).toBeDefined()
      expect(refreshToken.startsWith(`${sid}.`)).toBe(true)

      const storedSession = mockDbStore[`authSessions/${sid}`]
      expect(storedSession).toBeDefined()
      expect(storedSession.uid).toBe('user_123')
      expect(storedSession.userAgent).toBe('Test Browser')
      expect(storedSession.refreshTokenHash).toBe(hashSecret(refreshToken.split('.')[1]))
    })

    it('từ chối khi định dạng token không đúng 2 phần', async () => {
      const res = await rotateSession('invalid_token_no_dot')
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error).toBe('INVALID_TOKEN_FORMAT')
      }
    })

    it('từ chối khi phiên không tồn tại trong DB', async () => {
      const res = await rotateSession('nonexistent_sid.some_secret')
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error).toBe('SESSION_NOT_FOUND')
      }
    })

    it('từ chối khi phiên đã quá hạn tuyệt đối 7 ngày', async () => {
      const { sid, refreshToken } = await createSession('user_123')
      // Đặt expiresAt trong quá khứ
      mockDbStore[`authSessions/${sid}`].expiresAt = Date.now() - 1000

      const res = await rotateSession(refreshToken)
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error).toBe('SESSION_EXPIRED')
      }
    })

    it('xoay vòng phiên thành công và cấp secret mới, giữ nguyên expiresAt', async () => {
      const { sid, refreshToken } = await createSession('user_123')
      const originalExpiresAt = mockDbStore[`authSessions/${sid}`].expiresAt

      const result = await rotateSession(refreshToken)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.sid).toBe(sid)
        expect(result.uid).toBe('user_123')
        expect(result.newRefreshToken).not.toBe(refreshToken)

        const updatedSession = mockDbStore[`authSessions/${sid}`]
        expect(updatedSession.expiresAt).toBe(originalExpiresAt)
        expect(updatedSession.refreshTokenHash).toBe(hashSecret(result.newRefreshToken.split('.')[1]))
      }
    })

    it('phát hiện dùng lại token cũ (Token Reuse Detection) và thu hồi phiên lập tức', async () => {
      const { sid, refreshToken: oldRefreshToken } = await createSession('user_123')

      // Lần 1: Xoay vòng hợp lệ
      const firstRotation = await rotateSession(oldRefreshToken)
      expect(firstRotation.success).toBe(true)

      // Lần 2: Cố tình dùng lại oldRefreshToken -> Kẻ gian hoặc rò rỉ token
      const reuseAttempt = await rotateSession(oldRefreshToken)
      expect(reuseAttempt.success).toBe(false)
      if (!reuseAttempt.success) {
        expect(reuseAttempt.error).toBe('TOKEN_REUSE_DETECTED')
      }

      // Xác minh phiên đã bị thu hồi (revokedAt)
      const session = mockDbStore[`authSessions/${sid}`]
      expect(session.revokedAt).toBeDefined()
    })

    it('từ chối phiên đã bị thu hồi trước đó', async () => {
      const { sid, refreshToken } = await createSession('user_123')
      await revokeSession(sid)

      const result = await rotateSession(refreshToken)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('SESSION_REVOKED')
      }
    })

    it('thu hồi tất cả phiên của một người dùng', async () => {
      const s1 = await createSession('user_123')
      const s2 = await createSession('user_123')
      const sOther = await createSession('user_456')

      await revokeAllUserSessions('user_123')

      expect(mockDbStore[`authSessions/${s1.sid}`].revokedAt).toBeDefined()
      expect(mockDbStore[`authSessions/${s2.sid}`].revokedAt).toBeDefined()
      expect(mockDbStore[`authSessions/${sOther.sid}`]?.revokedAt).toBeUndefined()
    })
  })

  describe('Auth Guards: requireUser & requireAdmin', () => {
    it('cho phép user hợp lệ truy cập', async () => {
      const userProfile: UserProfile = {
        uid: 'user_123',
        email: 'test@example.com',
        displayName: 'Nguyễn Văn A',
        role: 'member',
        status: 'active',
        createdAt: 1,
        updatedAt: 1,
      }
      mockDbStore['users/user_123'] = userProfile
      mockDbStore['authSessions/sid_123'] = { uid: 'user_123', createdAt: 1, lastUsedAt: 1, expiresAt: Date.now() + 10000 }

      const token = await signAccessToken({ uid: 'user_123', sid: 'sid_123', role: 'member' })

      const req = {
        headers: {
          cookie: serialize('access_token', token),
        },
      } as unknown as IncomingMessage

      const res = {
        setHeader: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse

      const authUser = await requireUser(req, res)
      expect(authUser).not.toBeNull()
      expect(authUser?.uid).toBe('user_123')
      expect(authUser?.role).toBe('member')
    })

    it('chặn khi session không tồn tại trong authSessions', async () => {
      const token = await signAccessToken({ uid: 'user_123', sid: 'sid_missing', role: 'member' })
      const req = {
        headers: { cookie: serialize('access_token', token) },
      } as unknown as IncomingMessage

      let statusCode = 0
      const res = {
        set statusCode(code: number) {
          statusCode = code
        },
        setHeader: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse

      const authUser = await requireUser(req, res)
      expect(authUser).toBeNull()
      expect(statusCode).toBe(401)
    })

    it('chặn khi profile người dùng không tồn tại trong users', async () => {
      const token = await signAccessToken({ uid: 'user_ghost', sid: 'sid_ghost', role: 'member' })
      mockDbStore['authSessions/sid_ghost'] = { uid: 'user_ghost', createdAt: 1, lastUsedAt: 1, expiresAt: Date.now() + 10000 }

      const req = {
        headers: { cookie: serialize('access_token', token) },
      } as unknown as IncomingMessage

      let statusCode = 0
      const res = {
        set statusCode(code: number) {
          statusCode = code
        },
        setHeader: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse

      const authUser = await requireUser(req, res)
      expect(authUser).toBeNull()
      expect(statusCode).toBe(404)
    })

    it('chặn truy cập khi thiếu token hoặc token sai', async () => {
      const req = { headers: {} } as unknown as IncomingMessage
      let statusCode = 0
      const res = {
        set statusCode(code: number) {
          statusCode = code
        },
        setHeader: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse

      const authUser = await requireUser(req, res)
      expect(authUser).toBeNull()
      expect(statusCode).toBe(401)
    })

    it('chặn truy cập khi tài khoản có status locked', async () => {
      const lockedProfile: UserProfile = {
        uid: 'user_locked',
        email: 'locked@example.com',
        displayName: 'Bị khóa',
        role: 'member',
        status: 'locked',
        createdAt: 1,
        updatedAt: 1,
      }
      mockDbStore['users/user_locked'] = lockedProfile
      mockDbStore['authSessions/sid_locked'] = { uid: 'user_locked', createdAt: 1, lastUsedAt: 1, expiresAt: Date.now() + 10000 }

      const token = await signAccessToken({ uid: 'user_locked', sid: 'sid_locked', role: 'member' })

      const req = {
        headers: {
          cookie: serialize('access_token', token),
        },
      } as unknown as IncomingMessage

      let statusCode = 0
      const res = {
        set statusCode(code: number) {
          statusCode = code
        },
        setHeader: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse

      const authUser = await requireUser(req, res)
      expect(authUser).toBeNull()
      expect(statusCode).toBe(403)
    })

    it('requireAdmin chặn Member và chỉ cho phép Admin', async () => {
      const memberProfile: UserProfile = {
        uid: 'user_123',
        email: 'member@example.com',
        displayName: 'Member',
        role: 'member',
        status: 'active',
        createdAt: 1,
        updatedAt: 1,
      }
      mockDbStore['users/user_123'] = memberProfile
      mockDbStore['authSessions/sid_member'] = { uid: 'user_123', createdAt: 1, lastUsedAt: 1, expiresAt: Date.now() + 10000 }

      const memberToken = await signAccessToken({ uid: 'user_123', sid: 'sid_member', role: 'member' })

      const reqMember = {
        headers: { cookie: serialize('access_token', memberToken) },
      } as unknown as IncomingMessage

      let statusCode = 0
      const res = {
        set statusCode(code: number) {
          statusCode = code
        },
        setHeader: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse

      const resultMember = await requireAdmin(reqMember, res)
      expect(resultMember).toBeNull()
      expect(statusCode).toBe(403)

      // Thử với Admin
      const adminProfile: UserProfile = {
        uid: 'admin_123',
        email: 'admin@example.com',
        displayName: 'Admin User',
        role: 'admin',
        status: 'active',
        createdAt: 1,
        updatedAt: 1,
      }
      mockDbStore['users/admin_123'] = adminProfile
      mockDbStore['authSessions/sid_admin'] = { uid: 'admin_123', createdAt: 1, lastUsedAt: 1, expiresAt: Date.now() + 10000 }

      const adminToken = await signAccessToken({ uid: 'admin_123', sid: 'sid_admin', role: 'admin' })
      const reqAdmin = {
        headers: { cookie: serialize('access_token', adminToken) },
      } as unknown as IncomingMessage

      const resultAdmin = await requireAdmin(reqAdmin, res)
      expect(resultAdmin).not.toBeNull()
      expect(resultAdmin?.role).toBe('admin')
    })
  })

  describe('validateOrigin CSRF Check', () => {
    it('cho phép GET request mà không cần Origin', () => {
      const req = { method: 'GET', headers: {} } as unknown as IncomingMessage
      const res = { setHeader: vi.fn(), end: vi.fn() } as unknown as ServerResponse
      expect(validateOrigin(req, res)).toBe(true)
    })

    it('cho phép POST khi Origin khớp', () => {
      const req = {
        method: 'POST',
        headers: { origin: 'http://localhost:3000' },
      } as unknown as IncomingMessage
      const res = { setHeader: vi.fn(), end: vi.fn() } as unknown as ServerResponse
      expect(validateOrigin(req, res)).toBe(true)
    })

    it('chặn POST khi Origin thiếu trong môi trường production', () => {
      const prevEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const req = {
        method: 'POST',
        headers: {},
      } as unknown as IncomingMessage

      let statusCode = 0
      const res = {
        set statusCode(code: number) {
          statusCode = code
        },
        setHeader: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse

      const valid = validateOrigin(req, res)
      expect(valid).toBe(false)
      expect(statusCode).toBe(403)

      process.env.NODE_ENV = prevEnv
    })

    it('chặn POST khi Origin không hợp lệ hoặc sai định dạng', () => {
      const prevEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const req = {
        method: 'POST',
        headers: { origin: 'https://malicious-site.com' },
      } as unknown as IncomingMessage

      let statusCode = 0
      const res = {
        set statusCode(code: number) {
          statusCode = code
        },
        setHeader: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse

      const valid = validateOrigin(req, res)
      expect(valid).toBe(false)
      expect(statusCode).toBe(403)

      // Test origin URL hỏng
      const reqMalformed = {
        method: 'POST',
        headers: { origin: 'not-a-valid-url' },
      } as unknown as IncomingMessage

      const validMalformed = validateOrigin(reqMalformed, res)
      expect(validMalformed).toBe(false)

      process.env.NODE_ENV = prevEnv
    })
  })
})
