'use client'

import { useEffect, useState } from 'react'
import { RotateCcw, X } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import { secondaryButtonClass } from '@/components/auth-ui'

interface ClearCalculationProps {
  disabled: boolean
  onConfirm: () => void
}

export function ClearCalculation({ disabled, onConfirm }: ClearCalculationProps) {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const close = () => setIsOpen(false)

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  return (
    <>
      <button
        type="button"
        id="clear-calculation"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        className={`${secondaryButtonClass} shrink-0`}
      >
        <RotateCcw size={14} />
        {t.auth.clearButton}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-900/50" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="clear-dialog-title" aria-describedby="clear-dialog-body" className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-6">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h2 id="clear-dialog-title" className="text-lg font-semibold">{t.auth.clearDialogTitle}</h2>
              <button type="button" onClick={close} aria-label={t.auth.closeAria} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            <p id="clear-dialog-body" className="text-sm text-slate-600 dark:text-slate-400 mb-4">{t.auth.clearDialogBody}</p>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" autoFocus onClick={close} className={secondaryButtonClass}>{t.auth.cancel}</button>
              <button
                type="button"
                onClick={() => {
                  onConfirm()
                  close()
                }}
                className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                {t.auth.clearConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
