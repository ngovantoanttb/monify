import { SignJWT, jwtVerify } from 'jose'
import type { JWTPayloadCustom, UserRole } from '@shared/types'

const JWT_SECRET = process.env.AUTH_JWT_SECRET || 'dev-super-secret-jwt-key-must-be-at-least-32-chars-long!!'
const ISSUER = process.env.AUTH_ISSUER || 'monify-auth'
const AUDIENCE = process.env.AUTH_AUDIENCE || 'monify-app'
const ACCESS_TOKEN_TTL = parseInt(process.env.ACCESS_TOKEN_TTL || '900', 10) // 15 mins (in seconds)

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET)
}

/**
 * Ký access token JWT (HS256)
 * Thời hạn mặc định 15 phút
 */
export async function signAccessToken(payload: { uid: string; sid: string; role: UserRole }): Promise<string> {
  const secretKey = getSecretKey()

  return new SignJWT({
    role: payload.role,
    sid: payload.sid,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(payload.uid)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL}s`)
    .sign(secretKey)
}

/**
 * Xác thực access token JWT
 * Kiểm tra issuer, audience, subject, expiration
 */
export async function verifyAccessToken(token: string): Promise<JWTPayloadCustom | null> {
  try {
    const secretKey = getSecretKey()
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: ISSUER,
      audience: AUDIENCE,
    })

    if (!payload.sub || !payload.sid || !payload.role) {
      return null
    }

    return {
      iss: payload.iss as string,
      aud: payload.aud as string,
      sub: payload.sub,
      sid: payload.sid as string,
      role: payload.role as UserRole,
      iat: payload.iat,
      exp: payload.exp,
    }
  } catch {
    return null
  }
}
