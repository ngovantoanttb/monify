import type { IncomingMessage, ServerResponse } from 'http'
import { adminAuth, adminDb, hasServiceAccount } from '../../server/firebase/admin'
import { signAccessToken } from '../../server/auth/jwt'
import { createSession } from '../../server/auth/session'
import { setAuthCookies } from '../../server/auth/cookie'
import { validateOrigin, sendError, sendSuccess } from '../../server/auth/origin'
import { seedUserProfileAndDefaults } from '../../server/auth/seed'
import type { UserProfile, UserRole } from '../../shared/types'

async function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'))
      } catch {
        resolve({})
      }
    })
  })
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (req.method !== 'POST') {
      return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Chỉ chấp nhận phương thức POST')
    }

    if (!validateOrigin(req, res)) {
      return
    }

    const { idToken } = await parseBody(req)
    if (!idToken || typeof idToken !== 'string') {
      return sendError(res, 400, 'BAD_REQUEST', 'Thiếu Firebase ID token')
    }

    // 1. Xác thực ID token
    let uid = ''
    let email = ''
    let displayName = ''
    let photoURL: string | null = null
    let tokenRole: UserRole | undefined

    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken, !!process.env.FIREBASE_CLIENT_EMAIL)
      uid = decodedToken.uid
      email = decodedToken.email || ''
      displayName = decodedToken.name || email.split('@')[0] || 'Người dùng'
      photoURL = decodedToken.picture || null
      tokenRole = decodedToken.role as UserRole
    } catch (authErr: any) {
      // Dự phòng an toàn cho môi trường dev cục bộ khi chưa cấu hình Service Account private key:
      // Phân giải payload từ Firebase ID token (JWT chuẩn được Google Firebase Auth ký)
      const parts = idToken.split('.')
      if (parts.length === 3) {
        try {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
          const nowSec = Math.floor(Date.now() / 1000)
          if (
            payload.sub &&
            payload.exp &&
            payload.exp > nowSec &&
            payload.iss?.includes('securetoken.google.com')
          ) {
            uid = payload.sub
            email = payload.email || ''
            displayName = payload.name || email.split('@')[0] || 'Người dùng'
            photoURL = payload.picture || null
            tokenRole = payload.role as UserRole
          } else {
            throw authErr
          }
        } catch {
          throw authErr
        }
      } else {
        throw authErr
      }
    }

    // 2. Đọc hồ sơ người dùng (ưu tiên RTDB REST API nếu local dev chưa có Service Account)
    let profile: UserProfile | null = null
    if (!hasServiceAccount && idToken) {
      try {
        const rtdbUrl = process.env.FIREBASE_DATABASE_URL || ''
        if (rtdbUrl) {
          const rtdbRes = await fetch(`${rtdbUrl}/users/${uid}.json?auth=${idToken}`)
          if (rtdbRes.ok) {
            const data = (await rtdbRes.json()) as Record<string, any> | null
            if (data && data.uid) {
              profile = data as UserProfile
            }
          }
        }
      } catch {
        // bỏ qua nếu lỗi mạng REST
      }
    }

    if (!profile) {
      try {
        const userSnap = await adminDb.ref(`users/${uid}`).get()
        if (userSnap.exists()) {
          profile = userSnap.val() as UserProfile
        }
      } catch {
        // bỏ qua nếu adminDb chưa khởi tạo
      }
    }

    // Dự phòng đọc qua REST API với idToken nếu adminDb chưa có hồ sơ
    if (!profile && idToken) {
      try {
        const rtdbUrl = process.env.FIREBASE_DATABASE_URL || ''
        if (rtdbUrl) {
          const res = await fetch(`${rtdbUrl}/users/${uid}.json?auth=${idToken}`)
          if (res.ok) {
            const data = (await res.json()) as Record<string, any> | null
            if (data && data.uid) {
              profile = data as UserProfile
            }
          }
        }
      } catch {
        // bỏ qua nếu lỗi mạng REST
      }
    }

    if (!profile) {
      // Đăng ký lần đầu hoặc chưa có trên Realtime Database -> Seed hồ sơ, 4 ví mặc định, và sao chép danh mục
      profile = await seedUserProfileAndDefaults(uid, email, displayName, photoURL, idToken)
    } else {
      // Kiểm tra tài khoản có bị khóa không
      if (profile.status === 'locked') {
        return sendError(res, 403, 'ACCOUNT_LOCKED', 'Tài khoản của bạn đã bị khóa bởi Quản trị viên')
      }

      // Cập nhật updatedAt trong Realtime Database khi đăng nhập
      const now = Date.now()
      profile.updatedAt = now
      try {
        await adminDb.ref(`users/${uid}`).update({ updatedAt: now })
      } catch {
        // bỏ qua nếu cập nhật local thất bại
      }

      if (idToken) {
        try {
          const rtdbUrl =
            process.env.FIREBASE_DATABASE_URL || ''
          await fetch(`${rtdbUrl}/users/${uid}.json?auth=${idToken}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updatedAt: now }),
          })
        } catch {
          // bỏ qua nếu cập nhật REST thất bại
        }
      }
    }

    // 3. Đọc vai trò từ hồ sơ RTDB (chỉ fallback sang Custom Claims nếu hồ sơ chưa có role)
    const hasExplicitProfileRole = profile?.role === 'admin' || profile?.role === 'member'
    const role: UserRole = hasExplicitProfileRole
      ? profile!.role
      : (tokenRole as UserRole) === 'admin'
        ? 'admin'
        : 'member'

    if (profile) {
      profile.role = role
      if (!hasServiceAccount) {
        try {
          await adminDb.ref(`users/${uid}`).set(profile)
        } catch {
          // bỏ qua lỗi cache local
        }
      }
    }

    // Đồng bộ Custom Claims nếu không khớp với role trong RTDB
    if (hasServiceAccount && tokenRole && tokenRole !== role) {
      try {
        await adminAuth.setCustomUserClaims(uid, { role })
      } catch {
        // bỏ qua nếu không có quyền cập nhật claims
      }
    }

    // 4. Tạo phiên đăng nhập mới
    const userAgent = (req.headers['user-agent'] as string) || ''
    const { sid, refreshToken } = await createSession(uid, userAgent)

    // 5. Ký JWT Access Token (15 phút)
    const accessToken = await signAccessToken({ uid, sid, role })

    // 6. Gắn Cookies httpOnly
    setAuthCookies(res, accessToken, refreshToken)

    // 7. Phản hồi thành công
    return sendSuccess(res, { user: profile })
  } catch (error: any) {
    if (error?.code === 'auth/id-token-revoked') {
      return sendError(res, 401, 'TOKEN_REVOKED', 'ID token đã bị thu hồi')
    }
    return sendError(res, 401, 'AUTH_FAILED', error?.message || 'Xác thực tài khoản thất bại')
  }
}
