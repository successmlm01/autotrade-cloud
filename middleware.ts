// middleware.ts — Protect /dashboard routes
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res      = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const isAuth       = req.nextUrl.pathname.startsWith('/auth')
  const isDashboard  = req.nextUrl.pathname.startsWith('/dashboard')
  const isApi        = req.nextUrl.pathname.startsWith('/api')

  // Redirect unauthenticated users to login
  // In demo mode: skip auth (remove this block in production)
  const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
  if (!DEMO_MODE && !session && isDashboard) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  // Redirect authenticated users away from auth pages
  if (session && isAuth) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
}
