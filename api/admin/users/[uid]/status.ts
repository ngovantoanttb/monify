import type { IncomingMessage, ServerResponse } from 'http'
import { requireAdmin } from '../../../../server/auth/guards'
import { adminDb } from '../../../../server/firebase/admin'
import { validateOrigin, sendError, sendJson, parseJsonBody } from '../../../../server/auth/origin'
import { revokeAllUserSessions } from '../../../../server/auth/session'
import { logAdminAction } from '../../../../server/admin/audit'
import { z } from 'zod'

const statusSchema = z.object({
  status: z.enum(['active', 'locked'], {
    required_error: 'Trạng thái chỉ có thể là active hoặc locked',
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
    const match = req.url?.match(/\/api\/admin\/users\/([^/?]+)\/status/)
    targetUid = match ? match[1] : undefined
  }

  if (!targetUid) {
    sendError(res, 400, 'MISSING_UID', 'Thiếu mã định danh người dùng')
    return
  }

  const body = await parseJsonBody(req)
  const parseResult = statusSchema.safeParse(body)
  if (!parseResult.success) {
    sendError(res, 400, 'INVALID_INPUT', parseResult.error.errors[0]?.message || 'Dữ liệu không hợp lệ')
    return
  }

  const { status } = parseResult.data

  // Chặn tự khóa chính mình
  if (targetUid === authUser.uid && status === 'locked') {
    sendError(res, 400, 'CANNOT_LOCK_SELF', 'Bạn không thể tự khóa tài khoản của chính mình')
    return
  }

  const userRef = adminDb.ref(`users/${targetUid}`)
  const userSnap = await userRef.get()
  if (!userSnap.exists()) {
    sendError(res, 404, 'USER_NOT_FOUND', 'Không tìm thấy hồ sơ người dùng')
    return
  }

  const currentUser = userSnap.val()
  const previousStatus = currentUser.status

  if (previousStatus === status) {
    sendJson(res, 200, { success: true, status })
    return
  }

  const now = Date.now()
  await userRef.update({
    status,
    updatedAt: now,
  })

  // Nếu bị khóa, thu hồi toàn bộ phiên đăng nhập của người dùng đó
  if (status === 'locked') {
    await revokeAllUserSessions(targetUid)
  }

  // Ghi nhật ký quản trị
  await logAdminAction({
    actorUid: authUser.uid,
    action: status === 'locked' ? 'user.lock' : 'user.unlock',
    targetUid,
    before: { status: previousStatus },
    after: { status },
  })

  sendJson(res, 200, {
    success: true,
    status,
    message: status === 'locked' ? 'Đã khóa tài khoản thành công' : 'Đã mở khóa tài khoản thành công',
  })
}

