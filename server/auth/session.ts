import crypto from 'crypto'
import { adminDb } from '../firebase/admin'

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days absolute

export const devSessionStore = new Map<string, SessionData>()

export interface SessionData {
  uid: string
  refreshTokenHash: string
  createdAt: number
  lastUsedAt: number
  expiresAt: number
  revokedAt?: number
  userAgent?: string
}

/**
 * Hash secret của refresh token bằng SHA-256
 */
export function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex')
}

/**
 * Tạo phiên mới cho người dùng
 * Trả về { sid, refreshToken }
 */
export async function createSession(
  uid: string,
  userAgent: string = ''
): Promise<{ sid: string; refreshToken: string }> {
  const sid = crypto.randomUUID()
  const secret = crypto.randomBytes(32).toString('hex')
  const refreshTokenHash = hashSecret(secret)
  const now = Date.now()

  const sessionData: SessionData = {
    uid,
    refreshTokenHash,
    createdAt: now,
    lastUsedAt: now,
    expiresAt: now + REFRESH_TOKEN_TTL_MS,
    userAgent,
  }

  try {
    await adminDb.ref(`authSessions/${sid}`).set(sessionData)
  } catch {
    // Dự phòng lưu phiên trong bộ nhớ khi chạy local dev chưa có service account
  }
  devSessionStore.set(sid, sessionData)

  const refreshToken = `${sid}.${secret}`
  return { sid, refreshToken }
}

/**
 * Xoay vòng refresh token:
 * - Kiểm tra session hợp lệ
 * - Phát hiện dùng lại (token reuse) -> thu hồi ngay
 * - Cập nhật secret mới, giữ nguyên expiresAt tuyệt đối 7 ngày
 */
export async function rotateSession(
  refreshTokenString: string
): Promise<
  { success: true; sid: string; uid: string; newRefreshToken: string } | { success: false; error: string; uid?: string }
> {
  const parts = refreshTokenString.split('.')
  if (parts.length !== 2) {
    return { success: false, error: 'INVALID_TOKEN_FORMAT' }
  }

  const [sid, secret] = parts as [string, string]
  let session: SessionData | null = null

  try {
    const sessionSnap = await adminDb.ref(`authSessions/${sid}`).get()
    if (sessionSnap.exists()) {
      session = sessionSnap.val() as SessionData
    }
  } catch {
    // Dự phòng đọc từ memory store khi chạy local dev
  }

  if (!session) {
    session = devSessionStore.get(sid) || null
  }

  if (!session) {
    return { success: false, error: 'SESSION_NOT_FOUND' }
  }

  // 1. Kiểm tra đã bị thu hồi chưa
  if (session.revokedAt) {
    return { success: false, error: 'SESSION_REVOKED', uid: session.uid }
  }

  // 2. Kiểm tra thời hạn tuyệt đối 7 ngày
  if (Date.now() > session.expiresAt) {
    return { success: false, error: 'SESSION_EXPIRED', uid: session.uid }
  }

  // 3. So sánh hash an toàn thời gian (timingSafeEqual)
  const incomingHash = hashSecret(secret)
  const incomingBuffer = Buffer.from(incomingHash)
  const storedBuffer = Buffer.from(session.refreshTokenHash)

  if (incomingBuffer.length !== storedBuffer.length || !crypto.timingSafeEqual(incomingBuffer, storedBuffer)) {
    // PHÁT HIỆN DÙNG LẠI (Token reuse) -> Thu hồi toàn bộ phiên này lập tức
    try {
      await adminDb.ref(`authSessions/${sid}`).update({ revokedAt: Date.now() })
    } catch {
      //
    }
    const memS = devSessionStore.get(sid)
    if (memS) memS.revokedAt = Date.now()
    return { success: false, error: 'TOKEN_REUSE_DETECTED', uid: session.uid }
  }

  // 4. Sinh secret mới và cập nhật
  const newSecret = crypto.randomBytes(32).toString('hex')
  const newHash = hashSecret(newSecret)
  const now = Date.now()

  try {
    await adminDb.ref(`authSessions/${sid}`).update({
      refreshTokenHash: newHash,
      lastUsedAt: now,
    })
  } catch {
    //
  }

  devSessionStore.set(sid, {
    ...session,
    refreshTokenHash: newHash,
    lastUsedAt: now,
  })

  const newRefreshToken = `${sid}.${newSecret}`
  return { success: true, sid, uid: session.uid, newRefreshToken }
}

/**
 * Thu hồi một phiên cụ thể
 */
export async function revokeSession(sid: string): Promise<void> {
  try {
    await adminDb.ref(`authSessions/${sid}`).update({ revokedAt: Date.now() })
  } catch {
    //
  }
  const s = devSessionStore.get(sid)
  if (s) s.revokedAt = Date.now()
}

/**
 * Thu hồi toàn bộ phiên của một người dùng
 */
export async function revokeAllUserSessions(uid: string): Promise<void> {
  try {
    const snap = await adminDb.ref('authSessions').orderByChild('uid').equalTo(uid).get()
    if (snap.exists()) {
      const updates: Record<string, number> = {}
      const now = Date.now()
      snap.forEach((child) => {
        updates[`authSessions/${child.key}/revokedAt`] = now
      })

      if (Object.keys(updates).length > 0) {
        await adminDb.ref().update(updates)
      }
    }
  } catch {
    //
  }

  for (const s of devSessionStore.values()) {
    if (s.uid === uid) {
      s.revokedAt = Date.now()
    }
  }
}
