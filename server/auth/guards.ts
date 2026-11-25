import type { IncomingMessage, ServerResponse } from 'http'
import { getCookies } from './cookie'
import { verifyAccessToken } from './jwt'
import { adminDb, hasServiceAccount } from '../firebase/admin'
import { devSessionStore } from './session'
import { sendError } from './origin'
import type { UserProfile, UserRole } from '../../shared/types'

export interface AuthenticatedUser {
  uid: string
  role: UserRole
  sid: string
  profile: UserProfile
}

/**
 * Middleware xác thực người dùng cho Vercel Functions
 * Yêu cầu access_token hợp lệ và phiên chưa bị thu hồi
 */
export async function requireUser(req: IncomingMessage, res: ServerResponse): Promise<AuthenticatedUser | null> {
  const cookies = getCookies(req)
  const token = cookies.access_token

  if (!token) {
    sendError(res, 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc thiếu token xác thực')
    return null
  }

  const payload = await verifyAccessToken(token)
  if (!payload) {
    sendError(res, 401, 'INVALID_TOKEN', 'Token không hợp lệ hoặc đã hết hạn')
    return null
  }

  // Kiểm tra phiên trong authSessions
  let session: any = null
  try {
    const sessionSnap = await adminDb.ref(`authSessions/${payload.sid}`).get()
    if (sessionSnap.exists()) {
      session = sessionSnap.val()
    }
  } catch {
    //
  }

  if (!session) {
    session = devSessionStore.get(payload.sid) || null
  }

  if (!session || session?.revokedAt) {
    sendError(res, 401, 'SESSION_REVOKED', 'Phiên đăng nhập đã bị thu hồi')
    return null
  }

  // Lấy thông tin hồ sơ người dùng
  let profile: UserProfile | null = null
  let dbThrew = false
  try {
    const userSnap = await adminDb.ref(`users/${payload.sub}`).get()
    if (userSnap.exists()) {
      profile = userSnap.val() as UserProfile
    }
  } catch {
    // Dự phòng khi adminDb chưa có service account trong môi trường dev cục bộ
    dbThrew = true
  }

  if (!profile) {
    if (!hasServiceAccount || dbThrew) {
      profile = {
        uid: payload.sub,
        email: session?.email || '',
        displayName: session?.displayName || 'Người dùng',
        role: payload.role,
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    } else {
      sendError(res, 404, 'USER_NOT_FOUND', 'Không tìm thấy hồ sơ người dùng')
      return null
    }
  }

  const effectiveRole: UserRole =
    payload.role === 'admin' || profile.role === 'admin' ? 'admin' : 'member'

  const authProfile: UserProfile = {
    ...profile,
    role: effectiveRole,
  }

  // Kiểm tra trạng thái tài khoản
  if (authProfile.status === 'locked') {
    sendError(res, 403, 'ACCOUNT_LOCKED', 'Tài khoản của bạn đã bị khóa')
    return null
  }

  return {
    uid: payload.sub,
    role: effectiveRole,
    sid: payload.sid,
    profile: authProfile,
  }
}

/**
 * Middleware bảo vệ các route chỉ dành cho Quản trị viên (Admin)
 */
export async function requireAdmin(req: IncomingMessage, res: ServerResponse): Promise<AuthenticatedUser | null> {
  const authUser = await requireUser(req, res)
  if (!authUser) return null

  if (authUser.role !== 'admin') {
    sendError(res, 403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác quản trị này')
    return null
  }

  return authUser
}
