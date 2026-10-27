'use client'

import Link from 'next/link'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLanguage } from '@/lib/i18n'
import { Alert, AuthShell, linkClass } from '@/components/auth-ui'

function VerifyEmail() {
  const { t } = useLanguage()
  const token = useSearchParams().get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>(token ? 'loading' : 'failed')
  const started = useRef(false)

  useEffect(() => {
    // Tokens are single-use, so guard against the effect running twice (React strict mode).
    if (!token || started.current) return
    started.current = true
    fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => setStatus(res.ok ? 'success' : 'failed'))
      .catch(() => setStatus('failed'))
  }, [token])

  return (
    <AuthShell title={t.auth.verifyTitle}>
      {status === 'loading' && <Alert kind="info">{t.auth.verifying}</Alert>}
      {status === 'success' && <Alert kind="success">{t.auth.verifySuccess}</Alert>}
      {status === 'failed' && <Alert kind="error">{t.auth.verifyFailed}</Alert>}
      {status !== 'loading' && <Link href="/login" className={linkClass}>{t.auth.goToLogin}</Link>}
    </AuthShell>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  )
}
