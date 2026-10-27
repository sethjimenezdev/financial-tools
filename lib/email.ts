import { Resend } from 'resend'

type Lang = 'en' | 'es'

export function normalizeLang(value: unknown): Lang {
  return value === 'es' ? 'es' : 'en'
}

function appUrl(): string {
  return (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

async function send(to: string, subject: string, html: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') throw new Error('RESEND_API_KEY is not set')
    console.log(`[email:dev] to=${to} subject="${subject}"\n${text}`)
    return
  }
  const from = process.env.EMAIL_FROM
  if (!from) throw new Error('EMAIL_FROM is not set')
  const { error } = await new Resend(apiKey).emails.send({ from, to, subject, html, text })
  if (error) throw new Error(`Resend error: ${error.message}`)
}

function escapeHtml(s: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return s.replace(/[&<>"']/g, (c) => map[c])
}

function layout(greeting: string, body: string, cta: string, url: string, footer: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#0f172a">
<p>${greeting}</p><p>${body}</p>
<p style="margin:24px 0"><a href="${url}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;display:inline-block">${cta}</a></p>
<p style="font-size:12px;color:#64748b">${footer}<br>${url}</p></div>`
}

export async function sendVerificationEmail(to: string, firstName: string, token: string, lang: Lang) {
  const url = `${appUrl()}/verify-email?token=${token}`
  const name = escapeHtml(firstName)
  const c = lang === 'es'
    ? { subject: 'Confirma tu correo electrónico', greeting: `Hola ${name},`, body: 'Gracias por registrarte. Confirma tu correo para activar tu cuenta. El enlace vence en 24 horas.', cta: 'Confirmar correo', footer: 'Si no creaste esta cuenta, ignora este mensaje.', text: `Hola ${firstName}, confirma tu correo: ${url}` }
    : { subject: 'Confirm your email address', greeting: `Hi ${name},`, body: 'Thanks for signing up. Confirm your email to activate your account. The link expires in 24 hours.', cta: 'Confirm email', footer: "If you didn't create this account, you can ignore this message.", text: `Hi ${firstName}, confirm your email: ${url}` }
  await send(to, c.subject, layout(c.greeting, c.body, c.cta, url, c.footer), c.text)
}

export async function sendPasswordResetEmail(to: string, firstName: string, token: string, lang: Lang) {
  const url = `${appUrl()}/reset-password?token=${token}`
  const name = escapeHtml(firstName)
  const c = lang === 'es'
    ? { subject: 'Restablece tu contraseña', greeting: `Hola ${name},`, body: 'Recibimos una solicitud para restablecer tu contraseña. El enlace vence en 1 hora.', cta: 'Restablecer contraseña', footer: 'Si no lo solicitaste, ignora este mensaje; tu contraseña no cambiará.', text: `Hola ${firstName}, restablece tu contraseña: ${url}` }
    : { subject: 'Reset your password', greeting: `Hi ${name},`, body: 'We received a request to reset your password. The link expires in 1 hour.', cta: 'Reset password', footer: "If you didn't request this, ignore this message; your password won't change.", text: `Hi ${firstName}, reset your password: ${url}` }
  await send(to, c.subject, layout(c.greeting, c.body, c.cta, url, c.footer), c.text)
}

export async function sendAlreadyRegisteredEmail(to: string, firstName: string, lang: Lang) {
  const url = `${appUrl()}/login`
  const name = escapeHtml(firstName)
  const c = lang === 'es'
    ? { subject: 'Ya tienes una cuenta', greeting: `Hola ${name},`, body: 'Alguien intentó registrarse con este correo, pero ya tienes una cuenta. Inicia sesión, o usa «¿Olvidaste tu contraseña?» si la necesitas.', cta: 'Iniciar sesión', footer: 'Si no fuiste tú, ignora este mensaje.', text: `Hola ${firstName}, ya tienes una cuenta: ${url}` }
    : { subject: 'You already have an account', greeting: `Hi ${name},`, body: 'Someone tried to sign up with this email, but you already have an account. Sign in, or use "Forgot password?" if you need it.', cta: 'Sign in', footer: "If this wasn't you, ignore this message.", text: `Hi ${firstName}, you already have an account: ${url}` }
  await send(to, c.subject, layout(c.greeting, c.body, c.cta, url, c.footer), c.text)
}
