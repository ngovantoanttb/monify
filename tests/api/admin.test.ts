import { describe, it, expect, beforeEach, vi } from 'vitest'
import usersListHandler from '../../api/admin/users/index'
import userStatusHandler from '../../api/admin/users/[uid]/status'
import userRoleHandler from '../../api/admin/users/[uid]/role'
import adminStatsHandler from '../../api/admin/stats'
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
          exists: () => {
            if (!path) return Object.keys(mockDbStore).length > 0
            if (mockDbStore[path] !== undefined) return true
            return Object.keys(mockDbStore).some((k) => k.startsWith(path + '/'))
          },
          val: () => (path ? mockDbStore[path] : mockDbStore),
          forEach: (cb: (child: any) => void) => {
            if (!path) {
              Object.entries(mockDbStore).forEach(([k, v]) => cb({ key: k, val: () => v }))
              return
            }
            const prefix = path + '/'
            Object.entries(mockDbStore).forEach(([k, v]) => {
              if (k.startsWith(prefix)) {
                const subKey = k.substring(prefix.length)
                if (!subKey.includes('/')) {
                  cb({ key: subKey, val: () => v })
                }
              }
            })
          },
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
        push: () => {
          const newKey = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
          return {
            key: newKey,
            set: async (val: any) => {
              mockDbStore[`adminAuditLogs/${newKey}`] = val
            },
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
      setCustomUserClaims: vi.fn().mockResolvedValue(undefined),
    },
  }
})

function createMockReqRes(options: {
  method?: string
  url?: string
  headers?: Record<string, string>
  body?: any
  query?: Record<string, string>
}): { req: IncomingMessage; res: ServerResponse; getResult: () => { statusCode: number; data: any } } {
  let statusCode = 200
  let responseData = ''

  const req = {
    method: options.method || 'GET',
    url: options.url || '/',
    headers: options.headers || {},
    query: options.query,
    on: (event: string, callback: any) => {
      if (event === 'data' && options.body) {
        callback(typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
      }
      if (event === 'end') {
        callback()
      }
      return req
    },
  } as any

  const res = {
    statusCode: 200,
    setHeader: vi.fn(),
    writeHead: (code: number) => {
      statusCode = code
      return res
    },
    end: (chunk?: any) => {
      if (chunk) responseData = chunk.toString()
      return res
    },
  } as any

  return {
    req,
    res,
    getResult: () => {
      try {
        return { statusCode: res.statusCode || statusCode, data: JSON.parse(responseData) }
      } catch {
        return { statusCode: res.statusCode || statusCode, data: responseData }
      }
    },
  }
}

describe('Admin Serverless Functions Test', () => {
  const adminUid = 'admin_1'
  const memberUid = 'member_1'
  let adminSid: string
  let adminToken: string

  beforeEach(async () => {
    for (const key of Object.keys(mockDbStore)) {
      delete mockDbStore[key]
    }

    // Seed admin profile
    mockDbStore[`users/${adminUid}`] = {
      uid: adminUid,
      email: 'admin@monify.vn',
      displayName: 'Super Admin',
      role: 'admin',
      status: 'active',
      createdAt: 1000,
      updatedAt: 1000,
    } as UserProfile

    // Seed member profile
    mockDbStore[`users/${memberUid}`] = {
      uid: memberUid,
      email: 'member@monify.vn',
      displayName: 'Nguyen Member',
      role: 'member',
      status: 'active',
      createdAt: 2000,
      updatedAt: 2000,
    } as UserProfile

    // Tạo phiên admin
    const sessionRes = await createSession(adminUid)
    adminSid = sessionRes.sid
    adminToken = await signAccessToken({ uid: adminUid, role: 'admin', sid: adminSid })
  })

  it('GET /api/admin/users trả về danh sách người dùng phân trang và lọc', async () => {
    const { req, res, getResult } = createMockReqRes({
      method: 'GET',
      url: '/api/admin/users?page=1&size=10',
      headers: {
        cookie: serialize('access_token', adminToken),
      },
    })

    await usersListHandler(req, res)
    const result = getResult()
    expect(result.statusCode).toBe(200)
    expect(result.data.total).toBe(2)
    expect(result.data.users).toHaveLength(2)
  })

  it('PATCH /api/admin/users/[uid]/status: Khóa tài khoản thành công, thu hồi phiên và ghi log', async () => {
    // Tạo phiên cho member
    const memberSession = await createSession(memberUid)

    const { req, res, getResult } = createMockReqRes({
      method: 'PATCH',
      url: `/api/admin/users/${memberUid}/status`,
      headers: {
        cookie: serialize('access_token', adminToken),
        origin: 'http://localhost:3000',
        host: 'localhost:3000',
      },
      query: { uid: memberUid },
      body: { status: 'locked' },
    })

    await userStatusHandler(req, res)
    const result = getResult()
    expect(result.statusCode).toBe(200)
    expect(result.data.status).toBe('locked')

    // Trạng thái trong DB đổi thành locked
    expect(mockDbStore[`users/${memberUid}`].status).toBe('locked')

    // Phiên của member bị thu hồi
    expect(mockDbStore[`authSessions/${memberSession.sid}`].revokedAt).toBeDefined()

    // Nhật ký quản trị được ghi
    const logs = Object.values(mockDbStore).filter((v: any) => v?.action === 'user.lock')
    expect(logs.length).toBeGreaterThan(0)
    expect(logs[0].targetUid).toBe(memberUid)
  })

  it('PATCH /api/admin/users/[uid]/status: Chặn Admin tự khóa tài khoản chính mình', async () => {
    const { req, res, getResult } = createMockReqRes({
      method: 'PATCH',
      url: `/api/admin/users/${adminUid}/status`,
      headers: {
        cookie: serialize('access_token', adminToken),
        origin: 'http://localhost:3000',
        host: 'localhost:3000',
      },
      query: { uid: adminUid },
      body: { status: 'locked' },
    })

    await userStatusHandler(req, res)
    const result = getResult()
    expect(result.statusCode).toBe(400)
    expect(result.data.code).toBe('CANNOT_LOCK_SELF')
  })

  it('PATCH /api/admin/users/[uid]/role: Đổi role thành công và ghi log', async () => {
    const { req, res, getResult } = createMockReqRes({
      method: 'PATCH',
      url: `/api/admin/users/${memberUid}/role`,
      headers: {
        cookie: serialize('access_token', adminToken),
        origin: 'http://localhost:3000',
        host: 'localhost:3000',
      },
      query: { uid: memberUid },
      body: { role: 'admin' },
    })

    await userRoleHandler(req, res)
    const result = getResult()
    expect(result.statusCode).toBe(200)
    expect(result.data.role).toBe('admin')
    expect(mockDbStore[`users/${memberUid}`].role).toBe('admin')

    const logs = Object.values(mockDbStore).filter((v: any) => v?.action === 'user.setRole')
    expect(logs.length).toBeGreaterThan(0)
  })

  it('PATCH /api/admin/users/[uid]/role: Chặn Admin tự hạ quyền của chính mình', async () => {
    const { req, res, getResult } = createMockReqRes({
      method: 'PATCH',
      url: `/api/admin/users/${adminUid}/role`,
      headers: {
        cookie: serialize('access_token', adminToken),
        origin: 'http://localhost:3000',
        host: 'localhost:3000',
      },
      query: { uid: adminUid },
      body: { role: 'member' },
    })

    await userRoleHandler(req, res)
    const result = getResult()
    expect(result.statusCode).toBe(400)
    expect(result.data.code).toBe('CANNOT_DEMOTE_SELF')
  })

  it('PATCH /api/admin/users/[uid]/role: Chặn hạ quyền Admin cuối cùng trong hệ thống', async () => {
    // Thêm một caller admin
    const callerAdminUid = 'admin_caller'
    mockDbStore[`users/${callerAdminUid}`] = {
      uid: callerAdminUid,
      email: 'caller@monify.vn',
      displayName: 'Caller Admin',
      role: 'admin',
      status: 'active',
      createdAt: 1500,
      updatedAt: 1500,
    } as UserProfile

    const sessionCaller = await createSession(callerAdminUid)
    const tokenCaller = await signAccessToken({ uid: callerAdminUid, role: 'admin', sid: sessionCaller.sid })

    // callerAdminUid hạ quyền adminUid -> Thành công (còn lại callerAdminUid)
    const req1 = createMockReqRes({
      method: 'PATCH',
      url: `/api/admin/users/${adminUid}/role`,
      headers: {
        cookie: serialize('access_token', tokenCaller),
        origin: 'http://localhost:3000',
        host: 'localhost:3000',
      },
      query: { uid: adminUid },
      body: { role: 'member' },
    })
    await userRoleHandler(req1.req, req1.res)
    expect(req1.getResult().statusCode).toBe(200)

    // Bây giờ chỉ còn lại duy nhất callerAdminUid là admin trong users
    // Tạo 1 admin ngoài DB để gọi thử hạ callerAdminUid
    mockDbStore[`users/admin_system`] = {
      uid: 'admin_system',
      email: 'sys@monify.vn',
      displayName: 'System Admin',
      role: 'admin', // Được tính để pass requireAdmin
      status: 'active',
    } as UserProfile
    // Nhưng ngay trước khi gọi, ta set role admin_system thành member trong DB để adminCount chỉ còn 1
    mockDbStore[`users/admin_system`].role = 'member'

    const sessionSys = await createSession('admin_system')
    const tokenSys = await signAccessToken({ uid: 'admin_system', role: 'admin', sid: sessionSys.sid })

    const req2 = createMockReqRes({
      method: 'PATCH',
      url: `/api/admin/users/${callerAdminUid}/role`,
      headers: {
        cookie: serialize('access_token', tokenSys),
        origin: 'http://localhost:3000',
        host: 'localhost:3000',
      },
      query: { uid: callerAdminUid },
      body: { role: 'member' },
    })
    await userRoleHandler(req2.req, req2.res)
    expect(req2.getResult().statusCode).toBe(400)
    expect(req2.getResult().data.code).toBe('LAST_ADMIN')
  })

  it('GET /api/admin/stats: Thống kê chỉ trả số lượng, TUYỆT ĐỐI không chứa thông tin tiền bạc của người dùng', async () => {
    const { req, res, getResult } = createMockReqRes({
      method: 'GET',
      url: '/api/admin/stats',
      headers: {
        cookie: serialize('access_token', adminToken),
      },
    })

    await adminStatsHandler(req, res)
    const result = getResult()
    expect(result.statusCode).toBe(200)

    const stats = result.data.stats
    expect(stats).toBeDefined()
    expect(stats.totalUsers).toBe(2)
    expect(stats.activeUsers).toBe(2)
    expect(stats.lockedUsers).toBe(0)
    expect(stats.adminUsers).toBe(1)
    expect(stats.memberUsers).toBe(1)

    // Khẳng định không có bất kỳ trường tiền tệ nào
    const keys = Object.keys(stats)
    for (const key of keys) {
      expect(key.toLowerCase()).not.toContain('amount')
      expect(key.toLowerCase()).not.toContain('balance')
      expect(key.toLowerCase()).not.toContain('income')
      expect(key.toLowerCase()).not.toContain('expense')
      expect(key.toLowerCase()).not.toContain('money')
    }
  })
})
