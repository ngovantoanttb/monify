import { auth, database } from '@/lib/firebase/client'
import { ref, get, update, remove, push, runTransaction } from 'firebase/database'
import type { Debt, DebtHistory, DebtHistoryType, Transaction } from '@shared/types'
import type { DebtFormValues } from '../schemas/debtSchema'
import { withTimeout } from '@/lib/firebase/timeout'
import { calculateAccountBalance } from '@/lib/finance'

export interface DebtCashflowParams {
  uid: string
  debtId: string
  accountId: string
  amount: number
  mode: 'payment' | 'settle'
  note?: string
  idempotencyKey?: string
}

export interface DebtCashflowResult {
  debt: Debt
  history: DebtHistory
  transactionId: string
  deduplicated: boolean
}

export type CreateDebtInput = DebtFormValues & {
  accountId: string
  idempotencyKey?: string
}

const inFlightCashflowRequests = new Map<string, Promise<DebtCashflowResult>>()
const inFlightCreateRequests = new Map<string, Promise<Debt>>()

function assertAuthorizedUid(uid: string): void {
  if (!uid) {
    throw new Error('Không xác định được người dùng thực hiện giao dịch')
  }
  if (auth?.currentUser && auth.currentUser.uid !== uid) {
    throw new Error('Bạn không có quyền thao tác trên dữ liệu công nợ của người dùng khác')
  }
}

function mapDebtSnapshot(id: string, val: Record<string, unknown>): Debt {
  return {
    id,
    kind: val.kind as Debt['kind'],
    personName: String(val.personName || ''),
    content: String(val.content || ''),
    principal: Number(val.principal || 0),
    paidAmount: Number(val.paidAmount || 0),
    dueDate: typeof val.dueDate === 'number' ? val.dueDate : undefined,
    note: typeof val.note === 'string' ? val.note : '',
    createdAt: Number(val.createdAt || 0),
    updatedAt: Number(val.updatedAt || 0),
  }
}

function mapDebtHistorySnapshot(id: string, val: Record<string, unknown>): DebtHistory {
  return {
    id,
    debtId: String(val.debtId || ''),
    transactionId: typeof val.transactionId === 'string' ? val.transactionId : undefined,
    idempotencyKey: typeof val.idempotencyKey === 'string' ? val.idempotencyKey : undefined,
    type: val.type as DebtHistoryType,
    hasCashFlow: Boolean(val.hasCashFlow),
    amount: Number(val.amount || 0),
    accountId: typeof val.accountId === 'string' ? val.accountId : undefined,
    accountName: typeof val.accountName === 'string' ? val.accountName : undefined,
    accountBalanceBefore:
      typeof val.accountBalanceBefore === 'number' ? val.accountBalanceBefore : undefined,
    accountBalanceAfter:
      typeof val.accountBalanceAfter === 'number' ? val.accountBalanceAfter : undefined,
    debtRemainingBefore: Number(val.debtRemainingBefore ?? 0),
    debtRemainingAfter: Number(val.debtRemainingAfter ?? 0),
    createdAt: Number(val.createdAt || 0),
    actorUid: String(val.actorUid || ''),
    note: typeof val.note === 'string' ? val.note : '',
  }
}

export const debtsService = {
  /**
   * Lấy danh sách công nợ của người dùng
   */
  async getDebts(uid: string): Promise<Debt[]> {
    assertAuthorizedUid(uid)
    const snap = await withTimeout(get(ref(database, `financial/${uid}/debts`)), null, 3000)
    if (!snap || !snap.exists()) return []

    const list: Debt[] = []
    snap.forEach((child) => {
      list.push(mapDebtSnapshot(child.key!, child.val()))
    })

    // Sắp xếp: chưa tất toán trước, theo hạn gần nhất trước
    list.sort((a, b) => {
      const aSettled = a.paidAmount >= a.principal
      const bSettled = b.paidAmount >= b.principal
      if (aSettled !== bSettled) return aSettled ? 1 : -1

      if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate
      if (a.dueDate && !b.dueDate) return -1
      if (!a.dueDate && b.dueDate) return 1
      return b.createdAt - a.createdAt
    })

    return list
  },

  /**
   * Lấy chi tiết một khoản công nợ
   */
  async getDebtById(uid: string, debtId: string): Promise<Debt | null> {
    assertAuthorizedUid(uid)
    if (!debtId) return null

    const snap = await withTimeout(
      get(ref(database, `financial/${uid}/debts/${debtId}`)),
      null,
      3000
    )
    if (!snap || !snap.exists()) return null
    return mapDebtSnapshot(snap.key || debtId, snap.val())
  },

  /**
   * Lấy lịch sử giao dịch công nợ (mới nhất lên đầu)
   */
  async getDebtHistories(uid: string, debtId?: string): Promise<DebtHistory[]> {
    assertAuthorizedUid(uid)
    const snap = await withTimeout(
      get(ref(database, `financial/${uid}/debtHistories`)),
      null,
      3000
    )
    if (!snap || !snap.exists()) return []

    const list: DebtHistory[] = []
    snap.forEach((child) => {
      const val = child.val()
      if (!val || (debtId && val.debtId !== debtId)) return
      list.push(mapDebtHistorySnapshot(child.key!, val))
    })

    list.sort((a, b) => b.createdAt - a.createdAt)
    return list
  },

  /**
   * Tạo khoản nợ mới và tự động ghi nhận dòng tiền vào/ra nguồn tiền đã chọn trong cùng transaction nguyên tử:
   * - Tôi vay (borrowed): Cộng tiền vào tài khoản nhận
   * - Tôi cho vay (lent): Trừ tiền từ nguồn tiền (kiểm tra đủ số dư)
   */
  async createDebt(uid: string, values: CreateDebtInput): Promise<Debt> {
    assertAuthorizedUid(uid)

    if (!values.accountId) {
      throw new Error('Vui lòng chọn nguồn tiền để ghi nhận dòng tiền cho khoản công nợ')
    }

    const { idempotencyKey } = values
    if (idempotencyKey && inFlightCreateRequests.has(idempotencyKey)) {
      return inFlightCreateRequests.get(idempotencyKey)!
    }

    const run = async (): Promise<Debt> => {
      const statusSnap = await withTimeout(
        get(ref(database, `users/${uid}/status`)),
        null,
        2000
      ).catch(() => null)
      if (statusSnap && statusSnap.exists() && statusSnap.val() === 'locked') {
        throw new Error('Tài khoản của bạn đang bị khóa, không thể tạo khoản công nợ')
      }

      const financialRef = ref(database, `financial/${uid}`)
      const debtId = push(ref(database, `financial/${uid}/debts`)).key!
      const txId = push(ref(database, `financial/${uid}/transactions`)).key!
      const historyId = push(ref(database, `financial/${uid}/debtHistories`)).key!

      let validationError: Error | null = null
      let deduplicatedDebt: Debt | null = null
      let committedDebt: Debt | null = null

      const txResult = await runTransaction(financialRef, (currentData) => {
        validationError = null
        deduplicatedDebt = null
        committedDebt = null

        if (currentData === null) {
          return null
        }

        const historiesObj = (currentData.debtHistories || {}) as Record<
          string,
          Record<string, unknown>
        >
        if (idempotencyKey) {
          const dupEntry = Object.entries(historiesObj).find(
            ([, h]) => h && h.idempotencyKey === idempotencyKey
          )
          if (dupEntry) {
            const [, existingHistoryVal] = dupEntry
            const existingDebtId = String(existingHistoryVal.debtId || '')
            const existingDebtVal = currentData.debts?.[existingDebtId] as
              | Record<string, unknown>
              | undefined
            if (existingDebtVal) {
              deduplicatedDebt = mapDebtSnapshot(existingDebtId, existingDebtVal)
            } else {
              validationError = new Error('Khoản công nợ đã được tạo trước đó')
            }
            return
          }
        }

        const accountVal = currentData.accounts?.[values.accountId] as
          | Record<string, unknown>
          | undefined
        if (!accountVal) {
          validationError = new Error('Không tìm thấy nguồn tiền đã chọn')
          return
        }

        const principal = Math.round(values.principal)
        const paidAmount = Math.round(values.paidAmount || 0)
        if (!Number.isInteger(principal) || principal <= 0) {
          validationError = new Error('Số tiền gốc phải là số nguyên lớn hơn 0')
          return
        }
        if (!Number.isInteger(paidAmount) || paidAmount < 0 || paidAmount > principal) {
          validationError = new Error('Số tiền đã thanh toán trước đó không hợp lệ')
          return
        }

        const cashFlowAmount = Math.max(0, principal - paidAmount)
        const transactionsObj = (currentData.transactions || {}) as Record<
          string,
          Record<string, unknown>
        >
        const serverTransactions: Transaction[] = Object.entries(transactionsObj)
          .filter(([, v]) => v && typeof v === 'object')
          .map(([id, v]) => ({
            id,
            type: v.type as Transaction['type'],
            amount: Number(v.amount || 0),
            date: Number(v.date || 0),
            accountId: String(v.accountId || ''),
            categoryId: typeof v.categoryId === 'string' ? v.categoryId : undefined,
            toAccountId: typeof v.toAccountId === 'string' ? v.toAccountId : undefined,
            note: typeof v.note === 'string' ? v.note : '',
            createdAt: Number(v.createdAt || 0),
            updatedAt: Number(v.updatedAt || 0),
          }))

        const accountBalanceBefore = calculateAccountBalance(
          Number(accountVal.openingBalance || 0),
          values.accountId,
          serverTransactions
        )

        const isBorrowed = values.kind === 'borrowed'
        if (!isBorrowed && cashFlowAmount > 0 && accountBalanceBefore < cashFlowAmount) {
          validationError = new Error(
            `Số dư nguồn tiền "${String(accountVal.name || '')}" không đủ để cho vay`
          )
          return
        }

        const now = Date.now()
        const cleanPerson = values.personName.trim()
        const cleanContent = values.content.trim()
        const cleanNote = values.note?.trim() || ''

        const newDebtData: Record<string, unknown> = {
          kind: values.kind,
          personName: cleanPerson,
          content: cleanContent,
          principal,
          paidAmount,
          createdAt: now,
          updatedAt: now,
        }
        if (values.dueDate) {
          newDebtData.dueDate = values.dueDate
        }
        if (cleanNote) {
          newDebtData.note = cleanNote
        }

        const nextTransactions = { ...transactionsObj }
        const nextHistories = { ...historiesObj }

        if (cashFlowAmount > 0) {
          const txType = isBorrowed ? 'income' : 'expense'
          const categoriesObj = (currentData.categories || {}) as Record<
            string,
            Record<string, unknown>
          >
          const preferredCatId = isBorrowed ? 'cat_13' : 'cat_8'
          let categoryId = preferredCatId
          if (categoriesObj[preferredCatId]?.type !== txType) {
            const matched = Object.entries(categoriesObj).find(([, c]) => c && c.type === txType)
            if (matched) {
              categoryId = matched[0]
            }
          }

          const accountBalanceAfter = isBorrowed
            ? accountBalanceBefore + cashFlowAmount
            : accountBalanceBefore - cashFlowAmount

          const txPrefix = isBorrowed
            ? `[Vay tiền] ${cleanPerson}`
            : `[Cho vay] ${cleanPerson}`
          const txNote = cleanNote ? `${txPrefix} - ${cleanNote}` : `${txPrefix} (${cleanContent})`

          nextTransactions[txId] = {
            type: txType,
            amount: cashFlowAmount,
            date: now,
            accountId: values.accountId,
            categoryId,
            note: txNote.slice(0, 500),
            createdAt: now,
            updatedAt: now,
          }

          const historyData: Record<string, unknown> = {
            debtId,
            transactionId: txId,
            type: isBorrowed ? 'initial_borrow' : 'initial_lend',
            hasCashFlow: true,
            amount: cashFlowAmount,
            accountId: values.accountId,
            accountName: accountVal.name,
            accountBalanceBefore,
            accountBalanceAfter,
            debtRemainingBefore: 0,
            debtRemainingAfter: cashFlowAmount,
            createdAt: now,
            actorUid: uid,
          }
          if (idempotencyKey) {
            historyData.idempotencyKey = idempotencyKey
          }
          if (cleanNote) {
            historyData.note = cleanNote.slice(0, 500)
          }
          nextHistories[historyId] = historyData
        }

        committedDebt = {
          id: debtId,
          kind: values.kind,
          personName: cleanPerson,
          content: cleanContent,
          principal,
          paidAmount,
          dueDate: values.dueDate || undefined,
          note: cleanNote,
          createdAt: now,
          updatedAt: now,
        }

        return {
          ...currentData,
          transactions: nextTransactions,
          debts: {
            ...(currentData.debts || {}),
            [debtId]: newDebtData,
          },
          debtHistories: nextHistories,
        }
      })

      if (deduplicatedDebt) {
        return deduplicatedDebt
      }
      if (validationError) {
        throw validationError
      }
      if (!txResult.committed || !committedDebt) {
        throw new Error('Không thể tạo khoản công nợ. Vui lòng kiểm tra nguồn tiền và thử lại.')
      }

      return committedDebt
    }

    const promise = run().finally(() => {
      if (idempotencyKey) {
        inFlightCreateRequests.delete(idempotencyKey)
      }
    })

    if (idempotencyKey) {
      inFlightCreateRequests.set(idempotencyKey, promise)
    }

    return promise
  },

  /**
   * Điều chỉnh thông tin khoản nợ (không mặc định phát sinh dòng tiền)
   */
  async updateDebt(uid: string, debtId: string, values: DebtFormValues): Promise<void> {
    assertAuthorizedUid(uid)
    const debtRef = ref(database, `financial/${uid}/debts/${debtId}`)
    const prevSnap = await get(debtRef)
    if (!prevSnap.exists()) {
      throw new Error('Không tìm thấy khoản công nợ để cập nhật')
    }

    const prev = prevSnap.val()
    const now = Date.now()
    const nextPrincipal = Math.round(values.principal)
    const nextPaid = Math.round(values.paidAmount || 0)

    const prevRemaining = Math.max(0, Math.round(prev.principal || 0) - Math.round(prev.paidAmount || 0))
    const nextRemaining = Math.max(0, nextPrincipal - nextPaid)

    const updates: Record<string, unknown> = {
      [`debts/${debtId}/kind`]: values.kind,
      [`debts/${debtId}/personName`]: values.personName.trim(),
      [`debts/${debtId}/content`]: values.content.trim(),
      [`debts/${debtId}/principal`]: nextPrincipal,
      [`debts/${debtId}/paidAmount`]: nextPaid,
      [`debts/${debtId}/note`]: values.note?.trim() || '',
      [`debts/${debtId}/updatedAt`]: now,
      [`debts/${debtId}/dueDate`]: values.dueDate ? values.dueDate : null,
    }

    // Nếu người dùng điều chỉnh số dư công nợ trực tiếp, ghi log điều chỉnh (không phát sinh dòng tiền)
    if (prevRemaining !== nextRemaining) {
      const historyId = push(ref(database, `financial/${uid}/debtHistories`)).key!
      updates[`debtHistories/${historyId}`] = {
        debtId,
        type: 'adjustment',
        hasCashFlow: false,
        amount: Math.abs(nextRemaining - prevRemaining),
        debtRemainingBefore: prevRemaining,
        debtRemainingAfter: nextRemaining,
        createdAt: now,
        actorUid: uid,
        note: 'Điều chỉnh thông tin công nợ (không phát sinh dòng tiền)',
      }
    }

    await update(ref(database, `financial/${uid}`), updates)
  },

  /**
   * Thực hiện trả nợ, thu hồi nợ hoặc tất toán công nợ trong cùng một transaction nguyên tử:
   * - Kiểm tra quyền và trạng thái tài khoản người dùng
   * - Kiểm tra số dư nguồn tiền mới nhất từ backend (RTDB)
   * - Chống ghi trùng giao dịch bằng idempotencyKey + in-flight lock
   * - Cập nhật đồng thời: giao dịch dòng tiền (transactions), số dư công nợ (debts), và lịch sử (debtHistories)
   */
  async executeDebtCashflow(params: DebtCashflowParams): Promise<DebtCashflowResult> {
    const { uid, debtId, accountId, amount, mode, note, idempotencyKey } = params
    assertAuthorizedUid(uid)

    if (!accountId) {
      throw new Error('Vui lòng chọn nguồn tiền để thực hiện giao dịch')
    }

    if (idempotencyKey && inFlightCashflowRequests.has(idempotencyKey)) {
      return inFlightCashflowRequests.get(idempotencyKey)!
    }

    const run = async (): Promise<DebtCashflowResult> => {
      // Kiểm tra trạng thái khóa của người dùng nếu có
      const statusSnap = await withTimeout(
        get(ref(database, `users/${uid}/status`)),
        null,
        2000
      ).catch(() => null)
      if (statusSnap && statusSnap.exists() && statusSnap.val() === 'locked') {
        throw new Error('Tài khoản của bạn đang bị khóa, không thể thực hiện giao dịch')
      }

      const financialRef = ref(database, `financial/${uid}`)
      const txId = push(ref(database, `financial/${uid}/transactions`)).key!
      const historyId = push(ref(database, `financial/${uid}/debtHistories`)).key!

      let validationError: Error | null = null
      let deduplicatedResult: DebtCashflowResult | null = null
      let committedResult: DebtCashflowResult | null = null

      const txResult = await runTransaction(financialRef, (currentData) => {
        validationError = null
        deduplicatedResult = null
        committedResult = null

        if (currentData === null) {
          return null
        }

        const historiesObj = (currentData.debtHistories || {}) as Record<
          string,
          Record<string, unknown>
        >
        if (idempotencyKey) {
          const dupEntry = Object.entries(historiesObj).find(
            ([, h]) => h && h.idempotencyKey === idempotencyKey
          )
          if (dupEntry) {
            const [existingHistoryId, existingHistoryVal] = dupEntry
            const existingDebtVal = currentData.debts?.[debtId] as
              | Record<string, unknown>
              | undefined
            if (existingDebtVal) {
              deduplicatedResult = {
                debt: mapDebtSnapshot(debtId, existingDebtVal),
                history: mapDebtHistorySnapshot(existingHistoryId, existingHistoryVal),
                transactionId:
                  typeof existingHistoryVal.transactionId === 'string'
                    ? existingHistoryVal.transactionId
                    : '',
                deduplicated: true,
              }
            } else {
              validationError = new Error('Giao dịch đã được ghi nhận trước đó')
            }
            return
          }
        }

        const debtVal = currentData.debts?.[debtId] as Record<string, unknown> | undefined
        if (!debtVal) {
          validationError = new Error('Không tìm thấy khoản công nợ')
          return
        }

        const principal = Math.round(Number(debtVal.principal || 0))
        const paidBefore = Math.round(Number(debtVal.paidAmount || 0))
        const debtRemainingBefore = Math.max(0, principal - paidBefore)

        if (debtRemainingBefore <= 0) {
          validationError = new Error('Khoản công nợ này đã được tất toán hoàn toàn')
          return
        }

        const effectiveAmount = mode === 'settle' ? debtRemainingBefore : Math.round(amount)
        if (!Number.isInteger(effectiveAmount) || effectiveAmount <= 0) {
          validationError = new Error('Số tiền giao dịch phải là số nguyên lớn hơn 0')
          return
        }

        if (effectiveAmount > debtRemainingBefore) {
          validationError = new Error('Số tiền giao dịch không được vượt quá số dư công nợ còn lại')
          return
        }

        const accountVal = currentData.accounts?.[accountId] as
          | Record<string, unknown>
          | undefined
        if (!accountVal) {
          validationError = new Error('Không tìm thấy nguồn tiền đã chọn')
          return
        }

        const transactionsObj = (currentData.transactions || {}) as Record<
          string,
          Record<string, unknown>
        >
        const serverTransactions: Transaction[] = Object.entries(transactionsObj)
          .filter(([, v]) => v && typeof v === 'object')
          .map(([id, v]) => ({
            id,
            type: v.type as Transaction['type'],
            amount: Number(v.amount || 0),
            date: Number(v.date || 0),
            accountId: String(v.accountId || ''),
            categoryId: typeof v.categoryId === 'string' ? v.categoryId : undefined,
            toAccountId: typeof v.toAccountId === 'string' ? v.toAccountId : undefined,
            note: typeof v.note === 'string' ? v.note : '',
            createdAt: Number(v.createdAt || 0),
            updatedAt: Number(v.updatedAt || 0),
          }))

        const accountBalanceBefore = calculateAccountBalance(
          Number(accountVal.openingBalance || 0),
          accountId,
          serverTransactions
        )

        const isBorrowed = debtVal.kind === 'borrowed'
        if (isBorrowed && accountBalanceBefore < effectiveAmount) {
          validationError = new Error(
            `Số dư nguồn tiền "${String(accountVal.name || '')}" không đủ để thanh toán`
          )
          return
        }

        const accountBalanceAfter = isBorrowed
          ? accountBalanceBefore - effectiveAmount
          : accountBalanceBefore + effectiveAmount

        if (isBorrowed && accountBalanceAfter < 0) {
          validationError = new Error('Hệ thống không hỗ trợ số dư nguồn tiền âm')
          return
        }

        const txType = isBorrowed ? 'expense' : 'income'
        const categoriesObj = (currentData.categories || {}) as Record<
          string,
          Record<string, unknown>
        >
        const preferredCatId = isBorrowed ? 'cat_8' : 'cat_13'
        let categoryId = preferredCatId
        if (categoriesObj[preferredCatId]?.type !== txType) {
          const matched = Object.entries(categoriesObj).find(([, c]) => c && c.type === txType)
          if (matched) {
            categoryId = matched[0]
          }
        }

        const paidAfter = Math.min(principal, paidBefore + effectiveAmount)
        const debtRemainingAfter = Math.max(0, principal - paidAfter)

        const historyType: DebtHistoryType =
          mode === 'settle'
            ? isBorrowed
              ? 'settle_repay'
              : 'settle_collect'
            : isBorrowed
              ? 'repay'
              : 'collect'

        const now = Date.now()
        const cleanNote = note?.trim() || ''
        const txLabel =
          historyType === 'settle_repay'
            ? `[Tất toán nợ] ${debtVal.personName}`
            : historyType === 'settle_collect'
              ? `[Tất toán thu nợ] ${debtVal.personName}`
              : isBorrowed
                ? `[Trả nợ] ${debtVal.personName}`
                : `[Thu hồi nợ] ${debtVal.personName}`
        const txNote = cleanNote
          ? `${txLabel} - ${cleanNote}`
          : `${txLabel} (${debtVal.content})`

        const newTransactionData = {
          type: txType,
          amount: effectiveAmount,
          date: now,
          accountId,
          categoryId,
          note: txNote.slice(0, 500),
          createdAt: now,
          updatedAt: now,
        }

        const newHistoryData: Record<string, unknown> = {
          debtId,
          transactionId: txId,
          type: historyType,
          hasCashFlow: true,
          amount: effectiveAmount,
          accountId,
          accountName: accountVal.name,
          accountBalanceBefore,
          accountBalanceAfter,
          debtRemainingBefore,
          debtRemainingAfter,
          createdAt: now,
          actorUid: uid,
        }

        if (idempotencyKey) {
          newHistoryData.idempotencyKey = idempotencyKey
        }
        if (cleanNote) {
          newHistoryData.note = cleanNote.slice(0, 500)
        }

        const updatedDebtData = {
          ...debtVal,
          paidAmount: paidAfter,
          updatedAt: now,
        }

        const nextFinancialData = {
          ...currentData,
          transactions: {
            ...transactionsObj,
            [txId]: newTransactionData,
          },
          debts: {
            ...(currentData.debts || {}),
            [debtId]: updatedDebtData,
          },
          debtHistories: {
            ...historiesObj,
            [historyId]: newHistoryData,
          },
        }

        committedResult = {
          debt: mapDebtSnapshot(debtId, updatedDebtData),
          history: mapDebtHistorySnapshot(historyId, newHistoryData),
          transactionId: txId,
          deduplicated: false,
        }

        return nextFinancialData
      })

      if (deduplicatedResult) {
        return deduplicatedResult
      }
      if (validationError) {
        throw validationError
      }
      if (!txResult.committed || !committedResult) {
        throw new Error('Giao dịch công nợ không thành công. Dữ liệu đã được giữ nguyên.')
      }

      return committedResult
    }

    const promise = run().finally(() => {
      if (idempotencyKey) {
        inFlightCashflowRequests.delete(idempotencyKey)
      }
    })

    if (idempotencyKey) {
      inFlightCashflowRequests.set(idempotencyKey, promise)
    }

    return promise
  },

  /**
   * Ghi nhận thanh toán/thu hồi hoặc tất toán khoản nợ (yêu cầu chọn nguồn tiền)
   */
  async recordPayment(
    uid: string,
    debtId: string,
    additionalAmount: number,
    options: {
      accountId: string
      note?: string
      mode?: 'payment' | 'settle'
      idempotencyKey?: string
    }
  ): Promise<DebtCashflowResult> {
    return debtsService.executeDebtCashflow({
      uid,
      debtId,
      accountId: options.accountId,
      amount: additionalAmount,
      mode: options.mode || 'payment',
      note: options.note,
      idempotencyKey: options.idempotencyKey,
    })
  },

  /**
   * Xóa khoản nợ (không xóa lịch sử giao dịch đã phát sinh)
   */
  async deleteDebt(uid: string, debtId: string): Promise<void> {
    assertAuthorizedUid(uid)
    const debtRef = ref(database, `financial/${uid}/debts/${debtId}`)
    await remove(debtRef)
  },
}
