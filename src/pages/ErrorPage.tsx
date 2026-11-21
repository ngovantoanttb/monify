import { Link, useRouteError } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export function ErrorPage() {
  const error = useRouteError() as any

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-background">
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-bold text-destructive mb-2">500</h1>
      <h2 className="text-xl font-semibold mb-2 text-foreground">Đã xảy ra sự cố ngoài ý muốn</h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Hệ thống gặp sự cố trong quá trình xử lý yêu cầu. Vui lòng tải lại trang hoặc quay về trang chủ.
      </p>
      {error?.message && (
        <pre className="text-xs text-muted-foreground/80 bg-muted p-3 rounded-lg max-w-md overflow-x-auto mb-6 text-left">
          {error.message}
        </pre>
      )}
      <div className="flex items-center gap-3">
        <Button onClick={() => window.location.reload()} variant="outline" className="gap-2 touch-target">
          <RefreshCw className="w-4 h-4" />
          Tải lại trang
        </Button>
        <Button asChild className="touch-target">
          <Link to="/dashboard">Quay lại Tổng quan</Link>
        </Button>
      </div>
    </div>
  )
}

