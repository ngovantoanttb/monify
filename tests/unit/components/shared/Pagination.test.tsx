import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Pagination } from '@/components/shared/Pagination'

describe('Pagination Component Test', () => {
  it('không render khi totalPages <= 0 hoặc khi bật hideOnSinglePage với totalPages = 1', () => {
    const { container: c1 } = render(
      <Pagination currentPage={1} totalPages={0} onPageChange={vi.fn()} />
    )
    expect(c1.firstChild).toBeNull()

    const { container: c2 } = render(
      <Pagination currentPage={1} totalPages={1} hideOnSinglePage onPageChange={vi.fn()} />
    )
    expect(c2.firstChild).toBeNull()
  })

  it('vẫn render thanh phân trang với các nút bị vô hiệu khi totalPages = 1 (mặc định)', () => {
    render(<Pagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />)

    expect(screen.getByText('Trang')).toBeInTheDocument()
    expect(screen.getByText('/ 1')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1')).toBeInTheDocument()

    const prevBtn = screen.getByRole('button', { name: /Trang trước/i })
    const nextBtn = screen.getByRole('button', { name: /Trang sau/i })

    expect(prevBtn).toBeDisabled()
    expect(nextBtn).toBeDisabled()
  })

  it('hiển thị Trang X / Y và các nút điều hướng', () => {
    render(<Pagination currentPage={1} totalPages={720} onPageChange={vi.fn()} />)

    expect(screen.getByText('Trang')).toBeInTheDocument()
    expect(screen.getByText('/ 720')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1')).toBeInTheDocument()

    const prevBtn = screen.getByRole('button', { name: /Trang trước/i })
    const nextBtn = screen.getByRole('button', { name: /Trang sau/i })

    expect(prevBtn).toBeDisabled()
    expect(nextBtn).not.toBeDisabled()
  })

  it('gọi onPageChange khi nhấn nút Trang sau', () => {
    const handlePageChange = vi.fn()
    render(<Pagination currentPage={1} totalPages={720} onPageChange={handlePageChange} />)

    const nextBtn = screen.getByRole('button', { name: /Trang sau/i })
    fireEvent.click(nextBtn)

    expect(handlePageChange).toHaveBeenCalledWith(2)
  })

  it('gọi onPageChange khi nhấn nút Trang trước', () => {
    const handlePageChange = vi.fn()
    render(<Pagination currentPage={3} totalPages={720} onPageChange={handlePageChange} />)

    const prevBtn = screen.getByRole('button', { name: /Trang trước/i })
    fireEvent.click(prevBtn)

    expect(handlePageChange).toHaveBeenCalledWith(2)
  })

  it('cho phép nhập trực tiếp số trang và nhảy khi nhấn Enter', () => {
    const handlePageChange = vi.fn()
    render(<Pagination currentPage={1} totalPages={720} onPageChange={handlePageChange} />)

    const input = screen.getByLabelText(/Số trang hiện tại/i)
    fireEvent.change(input, { target: { value: '50' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(handlePageChange).toHaveBeenCalledWith(50)
  })

  it('tự động kẹp giới hạn nếu nhập số vượt quá totalPages', () => {
    const handlePageChange = vi.fn()
    render(<Pagination currentPage={1} totalPages={720} onPageChange={handlePageChange} />)

    const input = screen.getByLabelText(/Số trang hiện tại/i)
    fireEvent.change(input, { target: { value: '9999' } })
    fireEvent.blur(input)

    expect(handlePageChange).toHaveBeenCalledWith(720)
  })
})
