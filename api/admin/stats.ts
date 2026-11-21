import type { IncomingMessage, ServerResponse } from 'http'
import { requireAdmin } from '../../server/auth/guards'
import { adminDb } from '../../server/firebase/admin'
import { sendError, sendJson } from '../../server/auth/origin'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Chỉ chấp nhận phương thức GET')
    return
  }

  const authUser = await requireAdmin(req, res)
  if (!authUser) return

  // 1. Thống kê số lượng người dùng
  const usersSnap = await adminDb.ref('users').get()
  let totalUsers = 0
  let activeUsers = 0
  let lockedUsers = 0
  let adminUsers = 0
  let memberUsers = 0

  if (usersSnap.exists()) {
    usersSnap.forEach((child) => {
      const u = child.val()
      totalUsers++
      if (u.status === 'locked') {
        lockedUsers++
      } else {
        activeUsers++
      }

      if (u.role === 'admin') {
        adminUsers++
      } else {
        memberUsers++
      }
    })
  }

  // 2. Thống kê số phiên đang hoạt động (phiên chưa bị revoked và chưa hết hạn)
  const sessionsSnap = await adminDb.ref('authSessions').get()
  let activeSessions = 0
  const now = Date.now()

  if (sessionsSnap.exists()) {
    sessionsSnap.forEach((child) => {
      const s = child.val()
      if (!s.revokedAt && s.expiresAt > now) {
        activeSessions++
      }
    })
  }

  // 3. Thống kê số lượng giao dịch tổng cộng (chỉ đếm số bản ghi, TUYỆT ĐỐI KHÔNG tính hoặc trả về số tiền của người dùng)
  const financialSnap = await adminDb.ref('financial').get()
  let totalTransactionsCount = 0
  let totalAccountsCount = 0

  if (financialSnap.exists()) {
    financialSnap.forEach((userFinancial) => {
      const txs = userFinancial.child('transactions')
      if (txs.exists()) {
        totalTransactionsCount += txs.numChildren()
      }
      const accs = userFinancial.child('accounts')
      if (accs.exists()) {
        totalAccountsCount += accs.numChildren()
      }
    })
  }

  // Trả về số đếm tổng hợp
  sendJson(res, 200, {
    stats: {
      totalUsers,
      activeUsers,
      lockedUsers,
      adminUsers,
      memberUsers,
      activeSessions,
      totalTransactionsCount,
      totalAccountsCount,
    },
  })
}

