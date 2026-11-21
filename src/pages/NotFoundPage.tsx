import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
      <h2 className="text-xl font-semibold mb-2">Không tìm thấy trang</h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Đường dẫn bạn yêu cầu không tồn tại hoặc đã được chuyển sang địa chỉ mới.
      </p>
      <Button asChild variant="brand">
        <Link to="/dashboard">Quay lại Tổng quan</Link>
      </Button>
    </div>
  )
}
