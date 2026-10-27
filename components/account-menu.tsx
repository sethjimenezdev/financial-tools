'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { ChevronDown, FolderOpen, LogOut, User, Users } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

export function AccountMenu() {
  const { t } = useLanguage()
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (status !== 'authenticated') return null
  const name = session.user?.name || session.user?.email || ''

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={t.auth.accountMenuAria}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <User size={16} />
        <span className="hidden sm:inline max-w-[10rem] truncate">{name}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg py-1 z-20">
          <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 truncate">{session.user?.email}</div>
          <Link
            href="/calculations"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <FolderOpen size={16} />
            {t.auth.myCalculations}
          </Link>
          {session.user?.isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Users size={16} />
              {t.auth.adminMenu}
            </Link>
          )}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <LogOut size={16} />
            {t.auth.signOut}
          </button>
        </div>
      )}
    </div>
  )
}
