import type { Transaction, Category, Account } from '@shared/types'

/**
 * Xuất danh sách giao dịch ra chuỗi CSV định dạng UTF-8 có BOM (Byte Order Mark)
 * Giúp Microsoft Excel hiển thị đúng tiếng Việt có dấu mà không bị lỗi font.
 */
export function exportTransactionsToCsv(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[]
): string {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]))

  const headers = ['Mã giao dịch', 'Ngày', 'Loại', 'Danh mục', 'Số tiền (VND)', 'Ví nguồn', 'Ví đích', 'Ghi chú']

  const rows = transactions.map((tx) => {
    const dateStr = new Date(tx.date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

    let typeStr = 'Chi tiêu'
    if (tx.type === 'income') typeStr = 'Thu nhập'
    else if (tx.type === 'transfer') typeStr = 'Chuyển ví'

    const categoryName = tx.categoryId ? categoryMap.get(tx.categoryId) || 'Khác' : tx.type === 'transfer' ? 'Chuyển tiền' : 'Chưa phân loại'
    const fromAccount = accountMap.get(tx.accountId) || 'Ví không xác định'
    const toAccount = tx.toAccountId ? accountMap.get(tx.toAccountId) || 'Ví không xác định' : ''

    const cleanNote = (tx.note || '').replace(/"/g, '""')

    return [
      `"${tx.id}"`,
      `"${dateStr}"`,
      `"${typeStr}"`,
      `"${categoryName}"`,
      tx.amount.toString(),
      `"${fromAccount}"`,
      `"${toAccount}"`,
      `"${cleanNote}"`,
    ].join(',')
  })

  // Thêm BOM UTF-8 (\uFEFF) ở đầu file
  return '\uFEFF' + [headers.map((h) => `"${h}"`).join(','), ...rows].join('\r\n')
}

/**
 * Kích hoạt tải tệp CSV về máy người dùng
 */
export function downloadCsv(csvContent: string, fileName: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', fileName)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

