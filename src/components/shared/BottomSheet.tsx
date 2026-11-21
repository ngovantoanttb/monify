import React from 'react'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex flex-col justify-end md:justify-center md:items-center p-3 pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] md:p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          'bg-card w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4 max-h-[75dvh] overflow-y-auto animate-in slide-in-from-bottom duration-200'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto md:hidden" />
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 text-sm rounded-lg touch-target"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  )
}
