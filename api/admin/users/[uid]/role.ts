import type { IncomingMessage, ServerResponse } from 'http'
import { requireAdmin } from '../../../../server/auth/guards'
import { adminDb, adminAuth } from '../../../../server/firebase/admin'
import { validateOrigin, sendError, sendJson, parseJsonBody } from '../../../../server/auth/origin'
import { revokeAllUserSessions } from '../../../../server/auth/session'
import { logAdminAction } from '../../../../server/admin/audit'
import { z } from 'zod'

const roleSchema = z.object({
  role: z.enum(['admin', 'member'], {
    required_error: 'Vai trò chỉ có thể là admin hoặc member',
  }),
})

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'PATCH') {
    sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Chỉ chấp nhận phương thức PATCH')
    return
  }

  if (!validateOrigin(req, res)) return

  const authUser = await requireAdmin(req, res)
  if (!authUser) return

  // Trích xuất target uid từ query hoặc url
  let targetUid = (req as any).query?.uid as string | undefined
  if (!targetUid) {
    const match = req.url?.match(/\/api\/admin\/users\/([^/?]+)\/role/)
    targetUid = match ? match[1] : undefined
  }

  if (!targetUid) {
    sendError(res, 400, 'MISSING_UID', 'Thiếu mã định danh người dùng')
    return
  }

  const body = await parseJsonBody(req)
  const parseResult = roleSchema.safeParse(body)
  if (!parseResult.success) {
    sendError(res, 400, 'INVALID_INPUT', parseResult.error.errors[0]?.message || 'Dữ liệu không hợp lệ')
    return
  }

  const { role } = parseResult.data

  // Chặn tự hạ quyền chính mình
  if (targetUid === authUser.uid && role === 'member') {
    sendError(res, 400, 'CANNOT_DEMOTE_SELF', 'Bạn không thể tự hạ quyền quản trị của chính mình')
    return
  }

  const userRef = adminDb.ref(`users/${targetUid}`)
  const userSnap = await userRef.get()
  if (!userSnap.exists()) {
    sendError(res, 404, 'USER_NOT_FOUND', 'Không tìm thấy hồ sơ người dùng')
    return
  }

  const currentUser = userSnap.val()
  const previousRole = currentUser.role

  if (previousRole === role) {
    sendJson(res, 200, { success: true, role })
    return
  }

  // Chặn hạ quyền Admin cuối cùng trong hệ thống
  if (previousRole === 'admin' && role === 'member') {
    const allUsersSnap = await adminDb.ref('users').get()
    let adminCount = 0
    if (allUsersSnap.exists()) {
      allUsersSnap.forEach((child) => {
        if (child.val()?.role === 'admin') {
          adminCount++
        }
      })
    }
    if (adminCount <= 1) {
      sendError(res, 400, 'LAST_ADMIN', 'Không thể hạ quyền Admin cuối cùng trong hệ thống')
      return
    }
  }

  const now = Date.now()
  await userRef.update({
    role,
    updatedAt: now,
  })

  // Cập nhật Firebase Custom Claims
  try {
    await adminAuth.setCustomUserClaims(targetUid, { role })
  } catch {
    // Non-fatal if emulator doesn't support or user not in auth
  }

  // Thu hồi phiên đăng nhập cũ để người dùng đăng nhập lại với quyền mới
  await revokeAllUserSessions(targetUid)

  // Ghi nhật ký quản trị
  await logAdminAction({
    actorUid: authUser.uid,
    action: 'user.setRole',
    targetUid,
    before: { role: previousRole },
    after: { role },
  })

  sendJson(res, 200, {
    success: true,
    role,
    message: `Đã đổi vai trò thành công sang ${role === 'admin' ? 'Quản trị viên' : 'Thành viên'}`,
  })
}

