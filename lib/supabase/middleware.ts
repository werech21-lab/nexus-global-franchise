import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/dashboard', '/admin', '/account']

export function isProtectedPath(pathname: string): boolean {
  if (
    PROTECTED_PREFIXES.some(
      prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    return true
  }

  if (pathname === '/listings/new') return true
  if (/^\/listings\/[^/]+\/edit$/.test(pathname)) return true

  return false
}

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // Validate the JWT on every request so the session cookie is refreshed.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  const pathname = request.nextUrl.pathname
  if (user && (pathname === '/admin' || pathname.startsWith('/admin/'))) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/account'
      redirectUrl.search = ''
      redirectUrl.searchParams.set('mfa', 'required')
      redirectUrl.searchParams.set(
        'next',
        pathname + (request.nextUrl.search || '')
      )
      const redirected = NextResponse.redirect(redirectUrl)
      supabaseResponse.cookies.getAll().forEach(cookie => {
        redirected.cookies.set(cookie.name, cookie.value)
      })
      return redirected
    }
  }

  return supabaseResponse
}
