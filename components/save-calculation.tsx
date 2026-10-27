'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { Save, X } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import { fillTemplate } from '@/lib/i18n-auth'
import type { CalculationInput } from '@/lib/calculations'
import { Alert, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from '@/components/auth-ui'

interface SaveCalculationProps {
  disabled: boolean
  data: CalculationInput
  /** Set when the form currently holds a calculation loaded from the user's saved list. */
  loaded: { id: string; name: string } | null
  onSaved: (calc: { id: string; name: string }) => void
}

type Status = 'idle' | 'saving' | 'success'

export function SaveCalculation({ disabled, data, loaded, onSaved }: SaveCalculationProps) {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [usage, setUsage] = useState<{ count: number; max: number } | null>(null)

  const refreshUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/calculations')
      if (!res.ok) return
      const body = await res.json()
      setUsage({ count: body.calculations.length, max: body.max })
    } catch {
      // Leave usage unknown; the server still enforces the limit on save.
    }
  }, [])

  useEffect(() => {
    refreshUsage()
  }, [refreshUsage])

  const atLimit = usage !== null && usage.count >= usage.max

  const open = () => {
    setName(loaded?.name ?? '')
    setError(null)
    setStatus('idle')
    setIsOpen(true)
  }
  const close = () => setIsOpen(false)

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  useEffect(() => {
    if (status !== 'success') return
    const timer = setTimeout(close, 1200)
    return () => clearTimeout(timer)
  }, [status])

  const submit = async (mode: 'new' | 'update') => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError(t.auth.errName)
      return
    }
    setStatus('saving')
    setError(null)
    try {
      const res =
        mode === 'update' && loaded
          ? await fetch(`/api/calculations/${loaded.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: trimmed, ...data }),
            })
          : await fetch('/api/calculations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: trimmed, ...data }),
            })
      const body = await res.json().catch(() => ({}))
      if (res.ok) {
        onSaved({ id: body.calculation.id, name: body.calculation.name })
        refreshUsage()
        setSuccessMessage(mode === 'update' ? t.auth.updatedMessage : t.auth.savedMessage)
        setStatus('success')
      } else if (res.status === 401) {
        setError(t.auth.sessionExpired)
        setStatus('idle')
        setTimeout(() => signIn(undefined, { callbackUrl: '/' }), 1500)
      } else if (body.error === 'limit_reached') {
        setError(fillTemplate(t.auth.limitReached, { max: body.max }))
        setUsage({ count: body.max, max: body.max })
        setStatus('idle')
      } else {
        setError(body.error === 'invalid_name' ? t.auth.errName : t.auth.saveError)
        setStatus('idle')
      }
    } catch {
      setError(t.auth.saveError)
      setStatus('idle')
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit(loaded ? 'update' : 'new')
  }

  const saving = status === 'saving'

  // At the limit a new calculation can't be saved, but updating the loaded one still can.
  const showLimitAlert = atLimit && !loaded && !isOpen

  return (
    <>
      {showLimitAlert ? (
        <Alert kind="info">{fillTemplate(t.auth.limitReached, { max: usage.max })}</Alert>
      ) : (
        <button
          type="button"
          id="save-calculation"
          disabled={disabled}
          onClick={open}
          className={`${secondaryButtonClass} disabled:hover:bg-white dark:disabled:hover:bg-slate-800`}
        >
          <Save size={16} />
          {t.auth.saveButton}
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-900/50" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div role="dialog" aria-modal="true" aria-labelledby="save-dialog-title" className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 id="save-dialog-title" className="text-lg font-semibold">{t.auth.saveDialogTitle}</h2>
              <button type="button" onClick={close} aria-label={t.auth.closeAria} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              {status === 'success' ? (
                <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">{successMessage}</p>
              ) : (
                <>
                  <div>
                    <label htmlFor="calculation-name" className={labelClass}>{t.auth.calcNameLabel}</label>
                    <input
                      id="calculation-name"
                      autoFocus
                      value={name}
                      maxLength={120}
                      placeholder={t.auth.calcNamePlaceholder}
                      onChange={(e) => setName(e.currentTarget.value)}
                      className={inputClass}
                    />
                  </div>
                  {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <button type="button" onClick={close} className={secondaryButtonClass}>{t.auth.cancel}</button>
                    {loaded && !atLimit && (
                      <button type="button" disabled={saving} onClick={() => submit('new')} className={secondaryButtonClass}>
                        {t.auth.saveAsNew}
                      </button>
                    )}
                    <button type="submit" disabled={saving} className={`${primaryButtonClass} sm:w-auto`}>
                      {saving ? t.auth.saving : loaded ? fillTemplate(t.auth.updateExisting, { name: loaded.name }) : t.auth.saveSubmit}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  )
}
