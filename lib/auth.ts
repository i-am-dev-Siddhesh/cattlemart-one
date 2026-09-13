import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { assertAuthSecret, normalizeEmail, trustAuthHost } from '@/lib/security'

assertAuthSecret()

const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: trustAuthHost(),
  session: { strategy: 'jwt', maxAge: 60 * 60 * 8 },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = normalizeEmail(String(credentials?.email ?? ''))
        const password = String(credentials?.password ?? '')
        if (!email || !password) return null
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
          await bcrypt.compare(password, DUMMY_HASH)
          return null
        }
        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) return null
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: user.organizationId,
          role: user.role,
          authEpoch: user.authEpoch,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.organizationId = user.organizationId
        token.role = user.role
        token.authEpoch = user.authEpoch
        return token
      }
      if (!token.sub) return token
      const dbUser = await prisma.user.findUnique({
        where: { id: String(token.sub) },
        select: { authEpoch: true, organizationId: true, role: true },
      })
      if (!dbUser || dbUser.authEpoch !== Number(token.authEpoch ?? 0)) {
        return {}
      }
      token.organizationId = dbUser.organizationId
      token.role = dbUser.role
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? ''
        session.user.organizationId = String(token.organizationId ?? '')
        session.user.role = String(token.role ?? 'viewer')
      }
      return session
    },
  },
})
