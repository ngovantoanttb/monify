import type { IncomingMessage, ServerResponse } from 'http'
import { requireAdmin } from '../../../server/auth/guards'
import { adminDb } from '../../../server/firebase/admin'
import { sendError, sendJson } from '../../../server/auth/origin'
import type { UserProfile } from '@shared/types'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Chỉ chấp nhận phương thức GET')
    return
  }

  const authUser = await requireAdmin(req, res)
  if (!authUser) return

  // Parse query params
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const size = parseInt(url.searchParams.get('size') || '20', 10)
  const search = (url.searchParams.get('search') || '').trim().toLowerCase()
  const roleFilter = url.searchParams.get('role')
  const statusFilter = url.searchParams.get('status')

  const snap = await adminDb.ref('users').get()
  if (!snap.exists()) {
    sendJson(res, 200, {
      users: [],
      total: 0,
      page,
      size,
      totalPages: 0,
    })
    return
  }

  const allUsers: UserProfile[] = []
  snap.forEach((child) => {
    const val = child.val()
    if (val && val.uid) {
      allUsers.push(val as UserProfile)
    }
  })

  // Sắp xếp giảm dần theo thời gian tạo
  allUsers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

  // Lọc
  let filtered = allUsers
  if (search) {
    filtered = filtered.filter(
      (u) =>
        u.email?.toLowerCase().includes(search) ||
        u.displayName?.toLowerCase().includes(search) ||
        u.uid.toLowerCase().includes(search)
    )
  }
  if (roleFilter && (roleFilter === 'admin' || roleFilter === 'member')) {
    filtered = filtered.filter((u) => u.role === roleFilter)
  }
  if (statusFilter && (statusFilter === 'active' || statusFilter === 'locked')) {
    filtered = filtered.filter((u) => u.status === statusFilter)
  }

  const total = filtered.length
  const totalPages = Math.ceil(total / size)
  const offset = (page - 1) * size
  const paginatedUsers = filtered.slice(offset, offset + size)

  sendJson(res, 200, {
    users: paginatedUsers,
    total,
    page,
    size,
    totalPages,
  })
}

