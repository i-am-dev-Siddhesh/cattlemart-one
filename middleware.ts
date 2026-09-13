import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function hasSession(req: NextRequest) {
  return Boolean(
    req.cookies.get('authjs.session-token') ??
      req.cookies.get('__Secure-authjs.session-token') ??
      req.cookies.get('next-auth.session-token'),
  )
}

export function middleware(req: NextRequest) {
  const isApp = req.nextUrl.pathname.startsWith('/app')
  const loggedIn = hasSession(req)
  if (isApp && !loggedIn) {
    return NextResponse.redirect(new URL('/login', req.nextUrl.origin))
  }
  if (req.nextUrl.pathname === '/login' && loggedIn) {
    return NextResponse.redirect(new URL('/app/dashboard', req.nextUrl.origin))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/app/:path*', '/login'],
}
