import type { IncomingMessage, ServerResponse } from 'http'
import { getCookies, setAuthCookies, clearAuthCookies } from '../../server/auth/cookie'
import { rotateSession } from '../../server/auth/session'
import { signAccessToken } from '../../server/auth/jwt'
import { adminAuth, adminDb } from '../../server/firebase/admin'
import { validateOrigin, sendError, sendSuccess } from '../../server/auth/origin'
import type { UserProfile, UserRole } from '@shared/types'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const method = req.method?.toUpperCase()
  if (method !== 'POST' && method !== 'GET') {
    return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Chỉ chấp nhận phương thức POST hoặc GET')
  }

  if (method === 'POST' && !validateOrigin(req, res)) {
    return
  }

  const cookies = getCookies(req)
  const refreshToken = cookies.refresh_token

  if (!refreshToken) {
    clearAuthCookies(res)
    return sendError(res, 401, 'MISSING_REFRESH_TOKEN', 'Thiếu refresh token')
  }

  // 1. Xoay vòng refresh token và phát hiện dùng lại
  const rotationResult = await rotateSession(refreshToken)
  if (!rotationResult.success) {
    clearAuthCookies(res)
    return sendError(res, 401, rotationResult.error, 'Phiên làm việc không hợp lệ hoặc đã bị thu hồi')
  }

  const { sid, uid, newRefreshToken } = rotationResult

  // 2. Kiểm tra trạng thái tài khoản
  const userSnap = await adminDb.ref(`users/${uid}`).get()
  if (!userSnap.exists()) {
    clearAuthCookies(res)
    return sendError(res, 404, 'USER_NOT_FOUND', 'Người dùng không tồn tại')
  }

  const profile = userSnap.val() as UserProfile
  if (profile.status === 'locked') {
    clearAuthCookies(res)
    return sendError(res, 403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa')
  }

  // 3. Đọc claims mới nhất từ Firebase Auth
  let role: UserRole = profile.role || 'member'
  try {
    const userRecord = await adminAuth.getUser(uid)
    if (userRecord.customClaims?.role) {
      role = userRecord.customClaims.role as UserRole
    }
  } catch {
    // Giữ nguyên role từ profile
  }

  // 4. Ký Access Token mới
  const newAccessToken = await signAccessToken({ uid, sid, role })

  // 5. Gắn lại cookies mới
  setAuthCookies(res, newAccessToken, newRefreshToken)

  // 6. Xử lý phản hồi theo method
  if (method === 'GET') {
    // Chuyển hướng theo query param next (hoặc /dashboard)
    const url = new URL(req.url || '/', 'http://localhost')
    const nextPath = url.searchParams.get('next') || '/dashboard'
    res.statusCode = 302
    res.setHeader('Location', nextPath)
    res.end()
    return
  }

  return sendSuccess(res, { user: profile })
}
