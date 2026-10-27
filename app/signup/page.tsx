'use client'

import Link from 'next/link'
import { Suspense, useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLanguage } from '@/lib/i18n'
import { fillTemplate } from '@/lib/i18n-auth'
import { EMAIL_RE, isPasswordValid } from '@/lib/password-policy'
import {
  Alert, AuthShell, GoogleButton, OrDivider, PasswordField, PasswordRules, TextField,
  linkClass, primaryButtonClass, safeCallbackUrl,
} from '@/components/auth-ui'

function SignupForm() {
  const { t, language } = useLanguage()
  const params = useSearchParams()
  const callbackUrl = safeCallbackUrl(params.get('callbackUrl'))

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [website, setWebsite] = useState('')
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<'rate_limited' | 'generic' | null>(null)
  const [done, setDone] = useState(false)

  const errors = {
    firstName: firstName.trim() ? null : t.auth.errFirstName,
    lastName: lastName.trim() ? null : t.auth.errLastName,
    email: EMAIL_RE.test(email.trim()) ? null : t.auth.errEmail,
    password: isPasswordValid(password) ? null : t.auth.errPasswordPolicy,
    confirm: confirm === password ? null : t.auth.errPasswordsMatch,
  }
  const hasErrors = Object.values(errors).some(Boolean)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (hasErrors) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password, website, lang: language }),
      })
      if (res.ok) {
        setDone(true)
      } else {
        setError(res.status === 429 ? 'rate_limited' : 'generic')
        setSubmitting(false)
      }
    } catch {
      setError('generic')
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <AuthShell title={t.auth.signupSuccessTitle}>
        <Alert kind="success">{fillTemplate(t.auth.signupSuccessBody, { email: email.trim() })}</Alert>
        <Link href="/login" className={linkClass}>{t.auth.goToLogin}</Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={t.auth.signupTitle} subtitle={t.auth.signupSubtitle}>
      <GoogleButton callbackUrl={callbackUrl} />
      <OrDivider />
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {error === 'rate_limited' && <Alert kind="error">{t.auth.rateLimited}</Alert>}
        {error === 'generic' && <Alert kind="error">{t.auth.genericError}</Alert>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField id="first-name" label={t.auth.firstNameLabel} value={firstName} onChange={setFirstName} autoComplete="given-name" maxLength={80} error={touched ? errors.firstName : null} />
          <TextField id="last-name" label={t.auth.lastNameLabel} value={lastName} onChange={setLastName} autoComplete="family-name" maxLength={80} error={touched ? errors.lastName : null} />
        </div>
        <TextField id="email" label={t.auth.emailLabel} type="email" value={email} onChange={setEmail} autoComplete="email" maxLength={254} error={touched ? errors.email : null} />
        <div className="flex flex-col gap-2">
          <PasswordField id="password" label={t.auth.passwordLabel} value={password} onChange={setPassword} autoComplete="new-password" error={touched ? errors.password : null} />
          <PasswordRules password={password} />
        </div>
        <PasswordField id="confirm-password" label={t.auth.confirmPasswordLabel} value={confirm} onChange={setConfirm} autoComplete="new-password" error={touched ? errors.confirm : null} />
        {/* Honeypot: hidden from people, filled by bots. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(e) => setWebsite(e.currentTarget.value)} className="hidden" />
        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitting ? t.auth.signupSubmitting : t.auth.signupSubmit}
        </button>
      </form>
      <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
        {t.auth.haveAccountPrompt}{' '}
        <Link href={`/login${callbackUrl !== '/' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`} className={linkClass}>{t.auth.signIn}</Link>
      </p>
    </AuthShell>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
