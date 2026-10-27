'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { signIn } from 'next-auth/react'
import { ArrowLeft, Check, Circle, Eye, EyeOff } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import { checkPassword } from '@/lib/password-policy'
import { LanguageToggle } from '@/components/language-toggle'
import { ThemeToggle } from '@/components/theme-toggle'

export const inputClass =
  'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500'
export const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'
export const primaryButtonClass =
  'w-full inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900'
export const secondaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500'
export const linkClass = 'text-indigo-600 dark:text-indigo-400 hover:underline font-medium'

/** Only allows same-site relative paths, so a crafted callbackUrl can't redirect off-site. */
export function safeCallbackUrl(value: string | null | undefined): string {
  if (value && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return value
  return '/'
}

export function AuthShell({ title, subtitle, wide, children }: { title: string; subtitle?: string; wide?: boolean; children: ReactNode }) {
  const { t } = useLanguage()
  return (
    <>
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
            <ArrowLeft size={16} />
            {t.auth.backToCalculator}
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className={`mx-auto w-full px-4 py-8 sm:py-12 ${wide ? 'max-w-6xl sm:px-6 lg:px-8' : 'max-w-md'}`}>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-6 sm:p-8 flex flex-col gap-4">
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
          {children}
        </div>
      </main>
    </>
  )
}

export function Alert({ kind, children }: { kind: 'error' | 'success' | 'info'; children: ReactNode }) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
    info: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300',
  }[kind]
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>
      {children}
    </div>
  )
}

interface FieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  autoComplete?: string
  error?: string | null
  required?: boolean
  maxLength?: number
}

export function TextField({ id, label, value, onChange, type = 'text', autoComplete, error, required = true, maxLength }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        autoComplete={autoComplete}
        required={required}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        className={inputClass}
      />
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

export function PasswordField({ id, label, value, onChange, autoComplete, error }: Omit<FieldProps, 'type'>) {
  const { t } = useLanguage()
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          autoComplete={autoComplete}
          required
          aria-invalid={error ? true : undefined}
          className={`${inputClass} pr-10`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t.auth.hidePasswordAria : t.auth.showPasswordAria}
          className="absolute inset-y-0 right-0 px-3 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

export function PasswordRules({ password }: { password: string }) {
  const { t } = useLanguage()
  const c = checkPassword(password)
  const rules = [
    { ok: c.length, label: t.auth.pwRuleLength },
    { ok: c.number, label: t.auth.pwRuleNumber },
    { ok: c.special, label: t.auth.pwRuleSpecial },
    ...(c.maxLength ? [] : [{ ok: false, label: t.auth.pwRuleMax }]),
  ]
  return (
    <ul className="flex flex-col gap-1 text-xs">
      {rules.map((r) => (
        <li key={r.label} className={`flex items-center gap-1.5 ${r.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
          {r.ok ? <Check size={12} /> : <Circle size={12} />}
          {r.label}
        </li>
      ))}
    </ul>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.77.9 7.35 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

export function GoogleButton({ callbackUrl, onError }: { callbackUrl: string; onError?: () => void }) {
  const { t } = useLanguage()
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          await signIn('google', { callbackUrl })
        } catch {
          setBusy(false)
          onError?.()
        }
      }}
      className={`${secondaryButtonClass} w-full`}
    >
      <GoogleIcon />
      {t.auth.continueWithGoogle}
    </button>
  )
}

export function OrDivider() {
  const { t } = useLanguage()
  return (
    <div className="flex items-center gap-3 text-xs uppercase text-slate-400">
      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      {t.auth.orDivider}
      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
    </div>
  )
}
