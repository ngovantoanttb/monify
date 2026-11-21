import * as adminModule from 'firebase-admin'

const admin = ((adminModule as any).default || adminModule) as typeof adminModule

const devDbStore = new Map<string, any>()

/**
 * Giả lập nhẹ Firebase Realtime Database trong bộ nhớ cho môi trường dev cục bộ
 * Ngăn chặn lỗi kết nối "getaddrinfo ENOTFOUND metadata.google.internal" khi chưa cấu hình Service Account private key
 */
class DevDatabaseRef {
  public key: string | null = null

  constructor(private path: string = '', private store: Map<string, any> = devDbStore) {
    const clean = path.replace(/^\/+|\/+$/g, '')
    this.key = clean ? clean.split('/').pop() || null : null
  }

  private normalizeKey(subPath?: string): string {
    const p = subPath !== undefined ? `${this.path}/${subPath}` : this.path
    return p.replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '')
  }

  child(subPath: string): DevDatabaseRef {
    return new DevDatabaseRef(this.normalizeKey(subPath), this.store)
  }

  push(value?: any): DevDatabaseRef & { key: string } {
    const key = `push_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const ref = this.child(key)
    ref.key = key
    if (value !== undefined) {
      ref.set(value)
    }
    return ref as DevDatabaseRef & { key: string }
  }

  async set(val: any): Promise<void> {
    const k = this.normalizeKey()
    if (val === null) {
      this.store.delete(k)
    } else {
      this.store.set(k, JSON.parse(JSON.stringify(val)))
    }
  }

  async update(val: Record<string, any>): Promise<void> {
    const base = this.normalizeKey()
    for (const [subKey, subVal] of Object.entries(val)) {
      const full = base
        ? `${base}/${subKey}`.replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '')
        : subKey.replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '')
      if (subVal === null) {
        this.store.delete(full)
      } else {
        const existing = this.store.get(full) || {}
        this.store.set(
          full,
          typeof subVal === 'object' && subVal !== null && !Array.isArray(subVal)
            ? { ...existing, ...subVal }
            : subVal
        )
      }
    }
  }

  async remove(): Promise<void> {
    const k = this.normalizeKey()
    this.store.delete(k)
    for (const key of Array.from(this.store.keys())) {
      if (key.startsWith(`${k}/`)) {
        this.store.delete(key)
      }
    }
  }

  async get(): Promise<{
    exists: () => boolean
    val: () => any
    forEach: (cb: (child: any) => void) => void
  }> {
    const k = this.normalizeKey()
    let data = this.store.get(k)

    // Nếu không tìm thấy key trực tiếp, kiểm tra các node con
    if (data === undefined) {
      const prefix = k ? `${k}/` : ''
      const children: Record<string, any> = {}
      let hasChildren = false

      for (const [storedKey, val] of this.store.entries()) {
        if (!k || storedKey.startsWith(prefix)) {
          const subKey = storedKey.slice(prefix.length).split('/')[0]
          if (subKey) {
            children[subKey] = val
            hasChildren = true
          }
        }
      }
      if (hasChildren) {
        data = children
      }
    }

    const exists = data !== undefined && data !== null
    return {
      exists: () => exists,
      val: () => (exists ? JSON.parse(JSON.stringify(data)) : null),
      forEach: (cb: (child: any) => void) => {
        if (data && typeof data === 'object') {
          for (const [childKey, childVal] of Object.entries(data)) {
            cb({
              key: childKey,
              val: () => childVal,
              exists: () => childVal !== undefined,
            })
          }
        }
      },
    }
  }

  orderByChild(childKey: string) {
    return {
      equalTo: (val: any) => ({
        get: async () => {
          const snap = await this.get()
          const matched: Record<string, any> = {}
          snap.forEach((child) => {
            const v = child.val()
            if (v && v[childKey] === val) {
              matched[child.key] = v
            }
          })
          const exists = Object.keys(matched).length > 0
          return {
            exists: () => exists,
            val: () => (exists ? matched : null),
            forEach: (cb: (child: any) => void) => {
              for (const [k, v] of Object.entries(matched)) {
                cb({ key: k, val: () => v, exists: () => true })
              }
            },
          }
        },
      }),
    }
  }
}

export const hasServiceAccount = Boolean(
  (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  process.env.FIREBASE_DATABASE_EMULATOR_HOST ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST
)

// Singleton initialization for Firebase Admin SDK
function getFirebaseAdminApp(): adminModule.app.App {
  const apps = admin.apps || []
  if (apps.length > 0) {
    return apps[0]!
  }

  const databaseURL =
    process.env.FIREBASE_DATABASE_URL ||
    'https://monify-f0597-default-rtdb.asia-southeast1.firebasedatabase.app'
  const projectId = process.env.FIREBASE_PROJECT_ID || 'monify-f0597'

  if (process.env.FIREBASE_DATABASE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return admin.initializeApp({
      projectId,
      databaseURL,
    })
  }

  // Production/Staging credentials from environment variables
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  let privateKey = process.env.FIREBASE_PRIVATE_KEY

  if (clientEmail && privateKey) {
    try {
      privateKey = privateKey.replace(/\\n/g, '\n').trim()
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1)
      }
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        databaseURL,
      })
    } catch (certErr) {
      console.warn('[Firebase Admin] Initialization with cert failed, falling back to project ID:', certErr)
      return admin.initializeApp({
        projectId,
      })
    }
  }

  // Fallback an toàn: khởi tạo với projectId
  return admin.initializeApp({
    projectId,
  })
}

export const adminApp = getFirebaseAdminApp()
export const adminAuth = adminApp.auth()
export const adminDb: adminModule.database.Database = (
  hasServiceAccount
    ? adminApp.database()
    : {
        ref: (path?: string) => new DevDatabaseRef(path || '', devDbStore),
      }
) as unknown as adminModule.database.Database
