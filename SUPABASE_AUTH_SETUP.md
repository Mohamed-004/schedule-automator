# Supabase Auth SSR Setup Guide

## Overview

This project uses Supabase Authentication with Server-Side Rendering (SSR) support. This document outlines the implementation details and how to complete the setup.

## Implementation Details

We've started implementing Supabase Auth SSR by:

1. Installing the required packages:
   ```bash
   npm install @supabase/supabase-js @supabase/ssr
   ```

2. Creating utility files for browser and server clients:
   - `lib/supabase/client.ts` - For client-side usage
   - `lib/supabase/server.ts` - For server-side usage
   - `lib/supabase/middleware.ts` - For middleware usage

3. Setting up the middleware in `middleware.ts`

4. Creating the authentication callback route in `app/auth/callback/route.ts`

## IMPORTANT: Type System Issues

We encountered some TypeScript issues with the Next.js cookies API. The cookies API in Next.js has evolved, and there may be type mismatches between the Supabase SSR package and the Next.js cookies API.

### Current State

- The core files have been created with the correct patterns
- Type errors are present in some files due to the evolving Next.js API
- The middleware is configured correctly but may need type adjustments

## Next Steps to Complete the Setup

1. **Update the package.json and install dependencies**: 
   Make sure you have the latest versions of `@supabase/supabase-js` and `@supabase/ssr`.

2. **Create Login and Signup pages**:
   You'll need to create login and signup pages in:
   - `app/auth/login/page.tsx`
   - `app/auth/signup/page.tsx`

3. **Create Sign Out functionality**:
   Add a sign-out button that calls Supabase's auth.signOut() method.

4. **Test the authentication flow**:
   - Sign up for a new account
   - Log in with the new account
   - Verify protected routes redirect to login
   - Test sign out functionality

## Troubleshooting TypeScript Issues

If you continue to face TypeScript issues with the cookies API, consider:

1. Using the `as any` type assertion temporarily for cookies
2. Creating wrapper functions that handle the type conversion
3. Checking for updates to the `@supabase/ssr` package

## Example Usage

### Client Component
```tsx
'use client'

import { createClient } from '@/lib/supabase/client'

export default function ClientComponent() {
  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <button onClick={handleSignOut}>Sign Out</button>
  )
}
```

### Server Component
```tsx
import { createClient } from '@/lib/supabase/server'

export default async function ServerComponent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div>
      {user ? `Logged in as ${user.email}` : 'Not logged in'}
    </div>
  )
}
```

## References

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase SSR Docs](https://supabase.com/docs/guides/auth/server-side/overview)
- [Next.js App Router](https://nextjs.org/docs/app/building-your-application/routing) 