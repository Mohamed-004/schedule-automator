import { NextResponse, type NextRequest } from 'next/server'
// import { createMiddlewareClient } from './lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Temporarily disable auth middleware for debugging
  console.log('Middleware called for:', request.nextUrl.pathname)
  
  // Just pass through all requests for now
  return NextResponse.next()
  
  /* DISABLED FOR DEBUGGING
  const { supabase, response } = createMiddlewareClient(request)

  // This will refresh the session cookie if it's expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/auth/login') &&
    !request.nextUrl.pathname.startsWith('/auth/signup') &&
    !request.nextUrl.pathname.startsWith('/auth/callback') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    // No user, redirect to login page
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  return response
  */
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 
 
 