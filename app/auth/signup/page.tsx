/**
 * Enhanced signup page with modern glassmorphic design
 * Features password strength indicator, improved validation, and consistent branding
 * Maintains full compatibility with existing authentication system
 */

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle, User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthLayout } from '@/components/auth/auth-layout'
import { AuthCard } from '@/components/auth/auth-card'
import { SocialLoginButtons } from '@/components/auth/social-login-buttons'
import { PasswordStrengthIndicator } from '@/components/auth/password-strength-indicator'

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear errors when user starts typing
    if (error) setError(null)
  }

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      setError('First name is required')
      return false
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required')
      return false
    }
    if (!formData.email.trim()) {
      setError('Email address is required')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address')
      return false
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy')
      return false
    }
    return true
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            full_name: `${formData.firstName} ${formData.lastName}`
          }
        },
      })

      if (error) {
        // Enhanced error messages
        if (error.message.includes('already registered')) {
          setError('An account with this email already exists. Try signing in instead.')
        } else if (error.message.includes('Password should be')) {
          setError('Password does not meet security requirements. Please choose a stronger password.')
        } else {
          setError(error.message)
        }
        return
      }

              setMessage('Success! Please check your email for a confirmation link to complete your registration.')
        
        // Success feedback
        const successMessage = document.createElement('div')
        successMessage.innerHTML = `
          <div class="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            Account created! Check your email.
          </div>
        `
        document.body.appendChild(successMessage)
        setTimeout(() => successMessage.remove(), 5000)

      } catch (err) {
        console.error('Sign up error:', err)
        setError('An unexpected error occurred. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    const handleSocialLogin = (provider: string) => {
      // Placeholder for social login implementation
      console.log(`Social login with ${provider}`)
      setError(`${provider} signup will be available soon. Please use email/password for now.`)
    }

    return (
      <AuthLayout 
        title="Create your account" 
        subtitle="Join Manager Pro and streamline your business operations"
      >
        <AuthCard>
          {/* Error display */}
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="text-sm text-destructive">{error}</div>
            </div>
          )}

          {/* Success message */}
          {message && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-green-700">{message}</div>
            </div>
          )}

          {/* Signup form */}
          <form onSubmit={handleSignUp} className="space-y-6">
            {/* Name fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium">
                  First name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="pl-10 h-11"
                    placeholder="First name"
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium">
                  Last name
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="h-11"
                  placeholder="Last name"
                  disabled={loading}
                />
              </div>
            </div>

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
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
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
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="pl-10 pr-10 h-11"
                  placeholder="Create a password"
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
              
              {/* Password strength indicator */}
              {formData.password && (
                <PasswordStrengthIndicator password={formData.password} className="mt-3" />
              )}
            </div>

            {/* Confirm password field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="pl-10 pr-10 h-11"
                  placeholder="Confirm your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              {/* Password match indicator */}
              {formData.confirmPassword && (
                <div className={`text-xs flex items-center gap-2 mt-2 ${
                  formData.password === formData.confirmPassword 
                    ? 'text-green-600' 
                    : 'text-destructive'
                }`}>
                  {formData.password === formData.confirmPassword ? (
                    <>
                      <CheckCircle className="h-3 w-3" />
                      Passwords match
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3" />
                      Passwords do not match
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Terms agreement */}
            <div className="flex items-start space-x-2">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-border rounded mt-0.5"
                disabled={loading}
              />
              <Label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed">
                I agree to the{' '}
                <Link href="/terms" className="text-primary hover:text-primary/80 underline">
                  Terms of Service
                </Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-primary hover:text-primary/80 underline">
                  Privacy Policy
                </Link>
              </Label>
            </div>

            {/* Create account button */}
            <Button
              type="submit"
              disabled={loading || !agreedToTerms}
              className="w-full h-11 text-base font-medium"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </div>
              ) : (
                'Create account'
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

          {/* Sign in link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link 
                href="/auth/login" 
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </AuthCard>
      </AuthLayout>
    )
} 
 
 