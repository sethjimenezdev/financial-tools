'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, Trash2, X } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import { fillTemplate } from '@/lib/i18n-auth'
import { Alert, AuthShell, inputClass, secondaryButtonClass } from '@/components/auth-ui'

interface AdminUser {
  id: string
  name: string
  email: string
  createdAt: string
  emailVerified: boolean
  hasPassword: boolean
  hasGoogle: boolean
  isAdmin: boolean
  calculationCount: number
}

const badgeClass = 'inline-block rounded-full px-2 py-0.5 text-xs font-medium'

export function AdminUsers({ currentUserId }: { currentUserId: string }) {
  const { t, language } = useLanguage()
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<AdminUser | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/users?page=${page}&q=${encodeURIComponent(query)}`)
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error()
      setUsers(body.users)
      setTotal(body.total)
      setPageSize(body.pageSize)
      setError(null)
    } catch {
      setError(t.auth.adminLoadError)
    }
  }, [page, query, t.auth.adminLoadError])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!toDelete) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting) setToDelete(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toDelete, deleting])

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/users/${toDelete.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setToDelete(null)
      // Step back a page if that was the last row on it.
      if (users?.length === 1 && page > 1) setPage(page - 1)
      else await load()
    } catch {
      setToDelete(null)
      setError(t.auth.adminDeleteError)
    }
    setDeleting(false)
  }

  const dateFormat = new Intl.DateTimeFormat(language === 'es' ? 'es-MX' : 'en-US', { dateStyle: 'medium' })
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <AuthShell wide title={t.auth.adminTitle} subtitle={users ? fillTemplate(t.auth.adminSubtitle, { n: total }) : undefined}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setPage(1)
          setQuery(search.trim())
        }}
        className="relative max-w-sm"
      >
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          maxLength={100}
          placeholder={t.auth.adminSearchPlaceholder}
          aria-label={t.auth.adminSearchPlaceholder}
          onChange={(e) => setSearch(e.currentTarget.value)}
          className={`${inputClass} pl-9`}
        />
      </form>

      {error && <Alert kind="error">{error}</Alert>}
      {users?.length === 0 && <Alert kind="info">{t.auth.adminNoUsers}</Alert>}

      {users && users.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">{t.auth.adminColName}</th>
                <th className="px-3 py-2 font-medium">{t.auth.adminColEmail}</th>
                <th className="px-3 py-2 font-medium">{t.auth.adminColCreated}</th>
                <th className="px-3 py-2 font-medium text-right">{t.auth.adminColCalcs}</th>
                <th className="px-3 py-2 font-medium">{t.auth.adminColStatus}</th>
                <th className="px-3 py-2 font-medium">{t.auth.adminColMethod}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {u.name}
                    {u.isAdmin && <span className={`${badgeClass} ml-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300`}>{t.auth.adminBadge}</span>}
                  </td>
                  <td className="px-3 py-2 break-all">{u.email}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{dateFormat.format(new Date(u.createdAt))}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{u.calculationCount}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`${badgeClass} ${u.emailVerified ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>
                      {u.emailVerified ? t.auth.adminVerified : t.auth.adminUnverified}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {[u.hasPassword && t.auth.adminMethodPassword, u.hasGoogle && t.auth.adminMethodGoogle].filter(Boolean).join(' + ')}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {u.isAdmin || u.id === currentUserId ? null : (
                      <button type="button" onClick={() => setToDelete(u)} className={`${secondaryButtonClass} !px-2.5 !py-1 text-red-600 dark:text-red-400`}>
                        <Trash2 size={14} />
                        {t.auth.calcDelete}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-400">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className={secondaryButtonClass}>{t.auth.adminPrev}</button>
          <span>{fillTemplate(t.auth.adminPage, { p: page, total: totalPages })}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className={secondaryButtonClass}>{t.auth.adminNext}</button>
        </div>
      )}

      {toDelete && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-900/50" onMouseDown={(e) => e.target === e.currentTarget && !deleting && setToDelete(null)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-user-title" aria-describedby="delete-user-body" className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-6">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h2 id="delete-user-title" className="text-lg font-semibold">{t.auth.adminDeleteTitle}</h2>
              <button type="button" disabled={deleting} onClick={() => setToDelete(null)} aria-label={t.auth.closeAria} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            <p id="delete-user-body" className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {fillTemplate(t.auth.adminDeleteBody, { email: toDelete.email, n: toDelete.calculationCount })}
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" autoFocus disabled={deleting} onClick={() => setToDelete(null)} className={secondaryButtonClass}>{t.auth.cancel}</button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                {t.auth.adminDeleteConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthShell>
  )
}
