import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Realtime Database Rules Structure & Constraint Validation', () => {
  const rulesPath = path.resolve(__dirname, '../../database.rules.json')
  const rulesContent = fs.readFileSync(rulesPath, 'utf-8')
  const rules = JSON.parse(rulesContent).rules

  it('gốc (root) mặc định từ chối mọi quyền đọc và ghi (.read = false, .write = false)', () => {
    expect(rules['.read']).toBe(false)
    expect(rules['.write']).toBe(false)
  })

  describe('users/$uid rules', () => {
    const userRules = rules.users['$uid']

    it('khai báo chỉ mục .indexOn cho createdAt trên nhánh users', () => {
      expect(rules.users['.indexOn']).toContain('createdAt')
    })

    it('chỉ chủ sở hữu hoặc admin mới được đọc hồ sơ', () => {
      expect(userRules['.read']).toContain('auth.uid === $uid')
      expect(userRules['.read']).toContain("auth.token.role === 'admin'")
    })

    it('chặn ghi khi tài khoản có status bị locked', () => {
      expect(userRules['.write']).toContain("data.child('status').val() !== 'locked'")
    })

    it('chặn thay đổi vai trò (role) và trạng thái (status) từ client', () => {
      expect(userRules.role['.validate']).toContain("newData.val() === 'member'")
      expect(userRules.status['.validate']).toContain("newData.val() === 'active'")
      expect(userRules.status['.validate']).toContain('newData.val() === data.val()')
    })

    it('chặn đổi createdAt khi sửa hồ sơ', () => {
      expect(userRules.createdAt['.validate']).toContain('newData.val() === now')
      expect(userRules.createdAt['.validate']).toContain('newData.val() === data.val()')
    })

    it('từ chối mọi trường lạ ($other: .validate = false)', () => {
      expect(userRules['$other']['.validate']).toBe(false)
    })
  })

  describe('financial/$uid rules', () => {
    const financialRules = rules.financial['$uid']

    it('Admin KHÔNG có quyền đọc hoặc ghi dữ liệu tài chính (chỉ auth.uid === $uid và status không bị locked)', () => {
      expect(financialRules['.read']).toContain('auth.uid === $uid')
      expect(financialRules['.read']).not.toContain('admin')
      expect(financialRules['.write']).toContain('auth.uid === $uid')
      expect(financialRules['.write']).not.toContain('admin')
      expect(financialRules['.read']).toContain("root.child('users/' + $uid + '/status').val() !== 'locked'")
    })

    describe('accounts rules', () => {
      const accountRules = financialRules.accounts['$id']

      it('ràng buộc các loại ví hợp lệ (cash, bank, ewallet, savings)', () => {
        expect(accountRules.type['.validate']).toContain("'cash'")
        expect(accountRules.type['.validate']).toContain("'bank'")
        expect(accountRules.type['.validate']).toContain("'ewallet'")
        expect(accountRules.type['.validate']).toContain("'savings'")
      })

      it('số dư ban đầu phải là số nguyên (newData.val() % 1 === 0)', () => {
        expect(accountRules.openingBalance['.validate']).toContain('newData.val() % 1 === 0')
      })
    })

    describe('transactions rules', () => {
      const txRules = financialRules.transactions['$id']

      it('khai báo chỉ mục .indexOn cho date trên transactions', () => {
        expect(financialRules.transactions['.indexOn']).toContain('date')
      })

      it('số tiền giao dịch phải là số nguyên dương (> 0)', () => {
        expect(txRules.amount['.validate']).toContain('newData.val() > 0')
        expect(txRules.amount['.validate']).toContain('newData.val() % 1 === 0')
      })

      it('giao dịch chuyển ví (transfer) phải có toAccountId khác accountId và KHÔNG có categoryId', () => {
        const rootValidate = txRules['.validate']
        expect(rootValidate).toContain("newData.child('type').val() === 'transfer'")
        expect(rootValidate).toContain("newData.hasChild('toAccountId')")
        expect(rootValidate).toContain("!newData.hasChild('categoryId')")
      })

      it('giao dịch thu/chi (income/expense) phải có categoryId và KHÔNG có toAccountId', () => {
        const rootValidate = txRules['.validate']
        expect(rootValidate).toContain("newData.hasChild('categoryId')")
        expect(rootValidate).toContain("!newData.hasChild('toAccountId')")
      })

      it('chuyển ví không cho phép ví đích trùng ví nguồn', () => {
        expect(txRules.toAccountId['.validate']).toContain("newData.val() !== newData.parent().child('accountId').val()")
      })
    })

    describe('budgets rules', () => {
      const budgetRules = financialRules.budgets['$id']

      it('khóa document phải khớp định dạng yyyy-MM_categoryId và từ chối ID sai định dạng', () => {
        expect(budgetRules['.validate']).toContain('month')
        expect(budgetRules['.validate']).toContain('categoryId')
        expect(budgetRules['.validate']).toContain('^[0-9]{4}-(0[1-9]|1[0-2])_.+$')
        expect(budgetRules.month['.validate']).toContain('^[0-9]{4}-(0[1-9]|1[0-2])$')

        // Test regex trực tiếp với các ID mẫu
        const budgetIdRegex = /^[0-9]{4}-(0[1-9]|1[0-2])_.+$/
        expect(budgetIdRegex.test('2026-11_cat_food')).toBe(true)
        expect(budgetIdRegex.test('2026-01_123')).toBe(true)
        expect(budgetIdRegex.test('invalid_id')).toBe(false)
        expect(budgetIdRegex.test('2026-1_cat')).toBe(false)
        expect(budgetIdRegex.test('2026-13_cat')).toBe(false)
        expect(budgetIdRegex.test('2026-00_cat')).toBe(false)
      })

      it('hạn mức ngân sách phải là số nguyên không âm (>= 0)', () => {
        expect(budgetRules.amount['.validate']).toContain('newData.val() >= 0')
        expect(budgetRules.amount['.validate']).toContain('newData.val() % 1 === 0')
      })
    })

    describe('goals rules', () => {
      const goalRules = financialRules.goals['$id']

      it('mục tiêu phải có targetAmount > 0 và savedAmount >= 0', () => {
        expect(goalRules.targetAmount['.validate']).toContain('newData.val() > 0')
        expect(goalRules.savedAmount['.validate']).toContain('newData.val() >= 0')
      })
    })

    describe('debts rules', () => {
      const debtRules = financialRules.debts['$id']

      it('khoản nợ chỉ có thể là borrowed hoặc lent', () => {
        expect(debtRules.kind['.validate']).toContain("'borrowed'")
        expect(debtRules.kind['.validate']).toContain("'lent'")
      })

      it('số tiền đã trả không được vượt quá số gốc (paidAmount <= principal)', () => {
        expect(debtRules.paidAmount['.validate']).toContain("newData.val() <= newData.parent().child('principal').val()")
      })
    })
  })

  describe('defaultCategories & systemConfig & adminAuditLogs rules', () => {
    it('defaultCategories chỉ cho Admin ghi, người dùng được đọc', () => {
      expect(rules.defaultCategories['$id']['.read']).toContain('auth != null')
      expect(rules.defaultCategories['$id']['.write']).toContain("auth.token.role === 'admin'")
    })

    it('systemConfig/app chỉ cho Admin sửa ngưỡng từ 0.5 đến 1.0', () => {
      const appConfig = rules.systemConfig.app
      expect(appConfig['.read']).toContain('auth != null')
      expect(appConfig['.write']).toContain("auth.token.role === 'admin'")
      expect(appConfig.budgetWarningThreshold['.validate']).toContain('newData.val() >= 0.5 && newData.val() <= 1')
    })

    it('adminAuditLogs có chỉ mục createdAt, Admin đọc được, Client không được ghi (.write = false)', () => {
      expect(rules.adminAuditLogs['.indexOn']).toContain('createdAt')
      expect(rules.adminAuditLogs['$logId']['.read']).toContain("auth.token.role === 'admin'")
      expect(rules.adminAuditLogs['$logId']['.write']).toBe(false)
    })
  })
})

