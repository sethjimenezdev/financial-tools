import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { sql } from '@/lib/db'
import { verifyPassword } from '@/lib/password'
import { allowHit, getClientIp, hashKey } from '@/lib/rate-limit'
import { EMAIL_RE } from '@/lib/password-policy'

class EmailNotVerifiedError extends CredentialsSignin {
  code = 'email_not_verified'
}

class RateLimitedError extends CredentialsSignin {
  code = 'rate_limited'
}

const MAX_LOGIN_ATTEMPTS_PER_IP = 20
const MAX_LOGIN_ATTEMPTS_PER_EMAIL = 8
const LOGIN_WINDOW_SECONDS = 15 * 60

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Google,
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials, request) {
        const email = typeof credentials?.email === 'string' ? credentials.email.trim().toLowerCase() : ''
        const password = typeof credentials?.password === 'string' ? credentials.password : ''
        if (!EMAIL_RE.test(email) || !password || email.length > 254) return null

        const ipOk = await allowHit(`login:ip:${hashKey(getClientIp(request.headers))}`, MAX_LOGIN_ATTEMPTS_PER_IP, LOGIN_WINDOW_SECONDS)
        const emailOk = await allowHit(`login:email:${hashKey(email)}`, MAX_LOGIN_ATTEMPTS_PER_EMAIL, LOGIN_WINDOW_SECONDS)
        if (!ipOk || !emailOk) throw new RateLimitedError()

        const rows = await sql`
          SELECT id, first_name, last_name, email, password_hash, email_verified_at
          FROM users WHERE lower(email) = ${email}
        `
        const user = rows[0]
        const valid = await verifyPassword(password, user?.password_hash)
        if (!user || !valid) return null
        if (!user.email_verified_at) throw new EmailNotVerifiedError()

        return { id: user.id, name: `${user.first_name} ${user.last_name}`.trim(), email: user.email }
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') return true
      const email = profile?.email?.trim().toLowerCase()
      if (!email || profile?.email_verified !== true) return false

      const rows = await sql`SELECT id, email_verified_at FROM users WHERE lower(email) = ${email}`
      let userId: string
      if (rows[0]) {
        userId = rows[0].id
        if (!rows[0].email_verified_at) {
          // The account was created by someone who never proved ownership of this email.
          // Google just did, so verify it and drop any password set by the unverified creator.
          await sql`UPDATE users SET email_verified_at = now(), password_hash = NULL WHERE id = ${userId}`
        }
      } else {
        const firstName = (profile?.given_name as string | undefined) || (profile?.name as string | undefined)?.split(' ')[0] || email.split('@')[0]
        const lastName = (profile?.family_name as string | undefined) || ''
        const created = await sql`
          INSERT INTO users (first_name, last_name, email, email_verified_at)
          VALUES (${firstName.slice(0, 80)}, ${lastName.slice(0, 80)}, ${email}, now())
          RETURNING id
        `
        userId = created[0].id
      }
      await sql`
        INSERT INTO accounts (user_id, provider, provider_account_id)
        VALUES (${userId}, 'google', ${account.providerAccountId})
        ON CONFLICT (provider, provider_account_id) DO NOTHING
      `
      return true
    },
    async jwt({ token, user, account }) {
      if (account?.provider === 'google') {
        const rows = await sql`
          SELECT u.id, u.first_name, u.last_name FROM accounts a JOIN users u ON u.id = a.user_id
          WHERE a.provider = 'google' AND a.provider_account_id = ${account.providerAccountId}
        `
        if (rows[0]) {
          token.uid = rows[0].id
          token.name = `${rows[0].first_name} ${rows[0].last_name}`.trim()
        }
      } else if (user?.id) {
        token.uid = user.id
      }
      // UI hint only (shows the Admin menu link); API routes re-check the database.
      if (token.uid && (account || user)) {
        try {
          const rows = await sql`SELECT is_admin FROM users WHERE id = ${token.uid}`
          token.isAdmin = rows[0]?.is_admin === true
        } catch {
          // e.g. migration 003 not applied yet; never block sign-in over a UI hint.
          token.isAdmin = false
        }
      }
      return token
    },
    session({ session, token }) {
      if (typeof token.uid === 'string') session.user.id = token.uid
      session.user.isAdmin = token.isAdmin === true
      return session
    },
  },
})
