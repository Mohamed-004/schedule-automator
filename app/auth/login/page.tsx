/**
 * Enhanced login page with modern glassmorphic design
 * Features social login, improved UX, and consistent branding
 * Maintains full compatibility with existing authentication system
 */

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthLayout } from '@/components/auth/auth-layout'
import { AuthCard } from '@/components/auth/auth-card'
import { SocialLoginButtons } from '@/components/auth/social-login-buttons'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Enhanced error messages
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials and try again.')
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link before signing in.')
        } else {
          setError(error.message)
        }
        return
      }

      // Success feedback
      const successMessage = document.createElement('div')
      successMessage.innerHTML = `
        <div class="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
          Welcome back! Redirecting...
        </div>
      `
      document.body.appendChild(successMessage)
      setTimeout(() => successMessage.remove(), 3000)

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error('Sign in error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = (provider: string) => {
    // Placeholder for social login implementation
    console.log(`Social login with ${provider}`)
    setError(`${provider} login will be available soon. Please use email/password for now.`)
  }

  return (
    <AuthLayout 
      title="Welcome back" 
      subtitle="Sign in to your Manager Pro account"
    >
      <AuthCard>
        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-sm text-destructive">{error}</div>
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleSignIn} className="space-y-6">
          {/* Email field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-11"
                placeholder="Enter your email"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-11"
                placeholder="Enter your password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Remember me and forgot password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                disabled={loading}
              />
              <Label htmlFor="remember-me" className="text-sm text-muted-foreground">
                Remember me
              </Label>
            </div>
            <Link 
              href="/auth/forgot-password" 
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          {/* Sign in button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 text-base font-medium"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Signing in...
              </div>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>

        {/* Social login */}
        <div className="mt-6">
          <SocialLoginButtons 
            onSocialLogin={handleSocialLogin}
            disabled={loading}
          />
        </div>

        {/* Sign up link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link 
              href="/auth/signup" 
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Create one now
            </Link>
          </p>
        </div>
      </AuthCard>
    </AuthLayout>
  )
} 
 
 