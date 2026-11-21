import { adminDb } from '../firebase/admin'

export interface AuditLogData {
  actorUid: string
  action: string
  targetUid?: string | null
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
}

/**
 * Ghi nhật ký quản trị vào nhánh adminAuditLogs
 */
export async function logAdminAction(data: AuditLogData): Promise<string> {
  const logRef = adminDb.ref('adminAuditLogs').push()
  const now = Date.now()

  const logEntry = {
    actorUid: data.actorUid,
    action: data.action,
    targetUid: data.targetUid || null,
    before: data.before || null,
    after: data.after || null,
    createdAt: now,
  }

  await logRef.set(logEntry)
  return logRef.key!
}

