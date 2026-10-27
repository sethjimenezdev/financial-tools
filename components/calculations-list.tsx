'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { Dollar } from '@/lib/mortgage'
import { useLanguage } from '@/lib/i18n'
import { fillTemplate } from '@/lib/i18n-auth'
import type { SavedCalculation } from '@/lib/calculations'
import { Alert, AuthShell, inputClass, secondaryButtonClass } from '@/components/auth-ui'

export function CalculationsList() {
  const { t, language } = useLanguage()
  const [items, setItems] = useState<SavedCalculation[] | null>(null)
  const [max, setMax] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/calculations')
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error)
        setItems(body.calculations)
        setMax(body.max)
      })
      .catch(() => setError(t.auth.calcLoadError))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rename = async (id: string) => {
    const name = editName.trim()
    if (!name) {
      setError(t.auth.errName)
      return
    }
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/calculations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error()
      setItems((prev) => prev?.map((c) => (c.id === id ? body.calculation : c)) ?? prev)
      setEditingId(null)
    } catch {
      setError(t.auth.saveError)
    }
    setBusyId(null)
  }

  const remove = async (calc: SavedCalculation) => {
    if (!window.confirm(fillTemplate(t.auth.calcDeleteConfirm, { name: calc.name }))) return
    setBusyId(calc.id)
    setError(null)
    try {
      const res = await fetch(`/api/calculations/${calc.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setItems((prev) => prev?.filter((c) => c.id !== calc.id) ?? prev)
    } catch {
      setError(t.auth.genericError)
    }
    setBusyId(null)
  }

  const dateFormat = new Intl.DateTimeFormat(language === 'es' ? 'es-MX' : 'en-US', { dateStyle: 'medium' })

  return (
    <AuthShell title={t.auth.calcPageTitle} subtitle={items ? fillTemplate(t.auth.calcUsage, { n: items.length, max }) : undefined}>
      {error && <Alert kind="error">{error}</Alert>}
      {items?.length === 0 && <Alert kind="info">{t.auth.calcEmpty}</Alert>}
      <ul className="flex flex-col gap-3">
        {items?.map((c) => (
          <li key={c.id} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 flex flex-col gap-3">
            {editingId === c.id ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={editName}
                  maxLength={120}
                  aria-label={t.auth.calcNameLabel}
                  onChange={(e) => setEditName(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') rename(c.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className={inputClass}
                />
                <button type="button" disabled={busyId === c.id} onClick={() => rename(c.id)} aria-label={t.auth.saveSubmit} className={secondaryButtonClass}>
                  <Check size={16} />
                </button>
                <button type="button" onClick={() => setEditingId(null)} aria-label={t.auth.cancel} className={secondaryButtonClass}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="font-medium break-words">{c.name}</div>
            )}
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {fillTemplate(t.auth.calcSummary, { amount: Dollar.format(c.mortgageAmount), rate: c.interestRate, years: c.mortgageLength })}
              {c.monthlyAdditionalPayment > 0 && <> · {fillTemplate(t.auth.calcExtra, { amount: Dollar.format(c.monthlyAdditionalPayment) })}</>}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-500">
              {fillTemplate(t.auth.calcUpdatedOn, { date: dateFormat.format(new Date(c.updatedAt)) })}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/?load=${c.id}`} className={secondaryButtonClass}>{t.auth.calcOpen}</Link>
              <button
                type="button"
                onClick={() => {
                  setEditingId(c.id)
                  setEditName(c.name)
                }}
                className={secondaryButtonClass}
              >
                <Pencil size={14} />
                {t.auth.calcRename}
              </button>
              <button type="button" disabled={busyId === c.id} onClick={() => remove(c)} className={`${secondaryButtonClass} text-red-600 dark:text-red-400`}>
                <Trash2 size={14} />
                {t.auth.calcDelete}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </AuthShell>
  )
}
