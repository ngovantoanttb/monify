import type { IncomingMessage, ServerResponse } from 'http'
import { requireUser } from '../../server/auth/guards'
import { sendError, sendSuccess } from '../../server/auth/origin'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Chỉ chấp nhận phương thức GET')
  }

  const authUser = await requireUser(req, res)
  if (!authUser) {
    return
  }

  return sendSuccess(res, { user: authUser.profile })
}
