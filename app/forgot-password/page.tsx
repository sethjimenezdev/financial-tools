'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { useLanguage } from '@/lib/i18n'
import { EMAIL_RE } from '@/lib/password-policy'
import { Alert, AuthShell, TextField, linkClass, primaryButtonClass } from '@/components/auth-ui'

export default function ForgotPasswordPage() {
  const { t, language } = useLanguage()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<'email' | 'rate_limited' | 'generic' | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!EMAIL_RE.test(email.trim())) {
      setError('email')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, lang: language }),
      })
      if (res.ok) setSent(true)
      else setError(res.status === 429 ? 'rate_limited' : 'generic')
    } catch {
      setError('generic')
    }
    setSubmitting(false)
  }

  return (
    <AuthShell title={t.auth.forgotTitle} subtitle={sent ? undefined : t.auth.forgotBody}>
      {sent ? (
        <Alert kind="success">{t.auth.forgotSent}</Alert>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {error === 'rate_limited' && <Alert kind="error">{t.auth.rateLimited}</Alert>}
          {error === 'generic' && <Alert kind="error">{t.auth.genericError}</Alert>}
          <TextField id="email" label={t.auth.emailLabel} type="email" value={email} onChange={setEmail} autoComplete="email" maxLength={254} error={error === 'email' ? t.auth.errEmail : null} />
          <button type="submit" disabled={submitting} className={primaryButtonClass}>
            {submitting ? t.auth.forgotSubmitting : t.auth.forgotSubmit}
          </button>
        </form>
      )}
      <Link href="/login" className={`${linkClass} text-sm text-center`}>{t.auth.backToLogin}</Link>
    </AuthShell>
  )
}
