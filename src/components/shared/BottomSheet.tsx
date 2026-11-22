import React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  React.useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    const prevTouchAction = document.body.style.touchAction
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.touchAction = prevTouchAction
    }
  }, [isOpen])

  if (!isOpen) return null

  const content = (
    <div
      className="fixed inset-0 z-[70] w-full h-full bg-black/60 backdrop-blur-xs flex flex-col justify-end md:justify-center md:items-center p-3 pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] md:p-4 overflow-x-hidden overflow-y-auto overscroll-contain"
      onClick={onClose}
    >
      <div
        className={cn(
          'bg-card w-full max-w-lg rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 max-h-[82dvh] overflow-y-auto overflow-x-hidden animate-in slide-in-from-bottom duration-200 box-border'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto md:hidden" />
        <div className="flex items-center justify-between border-b pb-3 gap-2">
          <h2 className="text-base sm:text-lg font-bold text-foreground truncate">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:bg-muted/80 transition-colors shrink-0 -mr-1"
            aria-label="Đóng"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
          </button>
        </div>
        <div className="w-full overflow-x-hidden">{children}</div>
      </div>
    </div>
  )

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body)
  }

  return content
}
