'use client'

import Link from 'next/link'
import { Suspense, useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLanguage } from '@/lib/i18n'
import { isPasswordValid } from '@/lib/password-policy'
import { Alert, AuthShell, PasswordField, PasswordRules, linkClass, primaryButtonClass } from '@/components/auth-ui'

function ResetPassword() {
  const { t } = useLanguage()
  const token = useSearchParams().get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<'form' | 'success' | 'invalid_token' | 'rate_limited' | 'generic'>(token ? 'form' : 'invalid_token')

  const policyError = isPasswordValid(password) ? null : t.auth.errPasswordPolicy
  const matchError = confirm === password ? null : t.auth.errPasswordsMatch

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (policyError || matchError) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) setStatus('success')
      else if (data.error === 'invalid_token') setStatus('invalid_token')
      else setStatus(res.status === 429 ? 'rate_limited' : 'generic')
    } catch {
      setStatus('generic')
    }
    setSubmitting(false)
  }

  if (status === 'success') {
    return (
      <AuthShell title={t.auth.resetTitle}>
        <Alert kind="success">{t.auth.resetSuccess}</Alert>
        <Link href="/login" className={linkClass}>{t.auth.goToLogin}</Link>
      </AuthShell>
    )
  }

  if (status === 'invalid_token') {
    return (
      <AuthShell title={t.auth.resetTitle}>
        <Alert kind="error">{t.auth.resetInvalidToken}</Alert>
        <Link href="/forgot-password" className={linkClass}>{t.auth.requestNewLink}</Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={t.auth.resetTitle}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {status === 'rate_limited' && <Alert kind="error">{t.auth.rateLimited}</Alert>}
        {status === 'generic' && <Alert kind="error">{t.auth.genericError}</Alert>}
        <div className="flex flex-col gap-2">
          <PasswordField id="password" label={t.auth.newPasswordLabel} value={password} onChange={setPassword} autoComplete="new-password" error={touched ? policyError : null} />
          <PasswordRules password={password} />
        </div>
        <PasswordField id="confirm-password" label={t.auth.confirmPasswordLabel} value={confirm} onChange={setConfirm} autoComplete="new-password" error={touched ? matchError : null} />
        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitting ? t.auth.resetSubmitting : t.auth.resetSubmit}
        </button>
      </form>
    </AuthShell>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPassword />
    </Suspense>
  )
}
