import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      organizationId: string
      role: string
    }
  }

  interface User {
    organizationId: string
    role: string
    authEpoch: number
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    organizationId?: string
    role?: string
    authEpoch?: number
  }
}
