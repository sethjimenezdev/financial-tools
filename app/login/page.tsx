'use client'

import Link from 'next/link'
import { Suspense, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useLanguage } from '@/lib/i18n'
import {
  Alert, AuthShell, GoogleButton, OrDivider, PasswordField, TextField,
  linkClass, primaryButtonClass, safeCallbackUrl,
} from '@/components/auth-ui'

function LoginForm() {
  const { t, language } = useLanguage()
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = safeCallbackUrl(params.get('callbackUrl'))
  const oauthFailed = params.get('error') !== null

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<'credentials' | 'unverified' | 'rate_limited' | 'generic' | null>(null)
  const [resendMessage, setResendMessage] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setResendMessage(false)
    try {
      const res = await signIn('credentials', { email, password, redirect: false })
      if (res?.error) {
        setError(
          res.code === 'email_not_verified' ? 'unverified'
            : res.code === 'rate_limited' ? 'rate_limited'
            : res.code === 'credentials' || res.error === 'CredentialsSignin' ? 'credentials'
            : 'generic'
        )
        setSubmitting(false)
        return
      }
      router.push(callbackUrl)
      router.refresh()
    } catch {
      setError('generic')
      setSubmitting(false)
    }
  }

  const resend = async () => {
    setResendMessage(false)
    await fetch('/api/auth/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, lang: language }),
    }).catch(() => {})
    setResendMessage(true)
  }

  return (
    <AuthShell title={t.auth.loginTitle} subtitle={t.auth.loginSubtitle}>
      {oauthFailed && <Alert kind="error">{t.auth.errGoogle}</Alert>}
      <GoogleButton callbackUrl={callbackUrl} />
      <OrDivider />
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error === 'credentials' && <Alert kind="error">{t.auth.errInvalidCredentials}</Alert>}
        {error === 'rate_limited' && <Alert kind="error">{t.auth.rateLimited}</Alert>}
        {error === 'generic' && <Alert kind="error">{t.auth.genericError}</Alert>}
        {error === 'unverified' && (
          <Alert kind="error">
            {t.auth.errEmailNotVerified}{' '}
            <button type="button" onClick={resend} className="underline font-medium">{t.auth.resendVerification}</button>
          </Alert>
        )}
        {resendMessage && <Alert kind="info">{t.auth.verificationResent}</Alert>}
        <TextField id="email" label={t.auth.emailLabel} type="email" value={email} onChange={setEmail} autoComplete="email" maxLength={254} />
        <PasswordField id="password" label={t.auth.passwordLabel} value={password} onChange={setPassword} autoComplete="current-password" />
        <div className="text-right text-sm">
          <Link href="/forgot-password" className={linkClass}>{t.auth.forgotPasswordLink}</Link>
        </div>
        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitting ? t.auth.loginSubmitting : t.auth.loginSubmit}
        </button>
      </form>
      <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
        {t.auth.noAccountPrompt}{' '}
        <Link href={`/signup${callbackUrl !== '/' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`} className={linkClass}>{t.auth.signUp}</Link>
      </p>
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
