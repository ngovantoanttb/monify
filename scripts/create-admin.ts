/**
 * Script gán quyền Quản trị viên (Admin) đầu tiên
 * Chạy thủ công bằng lệnh: pnpm tsx scripts/create-admin.ts <email-hoac-uid>
 */

import { adminAuth, adminDb } from '../server/firebase/admin'

async function createFirstAdmin() {
  const target = process.argv[2]
  if (!target) {
    console.error('Vui lòng cung cấp email hoặc uid: pnpm tsx scripts/create-admin.ts <email-hoặc-uid>')
    process.exit(1)
  }

  try {
    let userRecord
    if (target.includes('@')) {
      userRecord = await adminAuth.getUserByEmail(target)
    } else {
      userRecord = await adminAuth.getUser(target)
    }

    const uid = userRecord.uid

    // 1. Cập nhật Custom Claims role: 'admin'
    await adminAuth.setCustomUserClaims(uid, { role: 'admin' })

    // 2. Cập nhật role trong users/{uid}
    await adminDb.ref(`users/${uid}/role`).set('admin')
    await adminDb.ref(`users/${uid}/updatedAt`).set(Date.now())

    // 3. Ghi nhật ký quản trị
    const logId = `log_${Date.now()}`
    await adminDb.ref(`adminAuditLogs/${logId}`).set({
      actorUid: 'system_script',
      action: 'user.setRole',
      targetUid: uid,
      before: { role: 'member' },
      after: { role: 'admin' },
      createdAt: Date.now(),
    })

    console.log(`✓ Đã nâng quyền Admin thành công cho tài khoản: ${userRecord.email} (${uid})`)
    process.exit(0)
  } catch (err: any) {
    console.error('Lỗi khi nâng quyền Admin:', err?.message || err)
    process.exit(1)
  }
}

createFirstAdmin()

