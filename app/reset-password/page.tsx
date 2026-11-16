'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { passwordsMatch, validatePassword } from '@/lib/password'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) {
      setChecking(false)
      setError('Supabase is not configured. Check Vercel environment variables.')
      return
    }

    const client = supabase
    let cancelled = false

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        if (!cancelled) setHasRecoverySession(true)
      }
    })

    async function prepareSession() {
      try {
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')

        if (code) {
          const { error } = await client.auth.exchangeCodeForSession(code)
          if (error) throw error
          window.history.replaceState({}, '', '/reset-password')
        }

        const { data, error } = await client.auth.getSession()
        if (error) throw error

        if (!cancelled) {
          setHasRecoverySession(!!data.session)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'This reset link is invalid or has expired.'
          )
        }
      } finally {
        if (!cancelled) setChecking(false)
      }
    }

    void prepareSession()

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    const passwordError =
      validatePassword(password) || passwordsMatch(password, confirmPassword)

    if (passwordError) {
      setError(passwordError)
      setLoading(false)
      return
    }

    try {
      if (!supabase) {
        throw new Error('Supabase is not configured. Check Vercel environment variables.')
      }

      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      setMessage('Your password has been updated. Redirecting to login...')
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <div className="card">
        <div className="mb-8 text-center">
          <div className="mb-4 text-4xl">🔒</div>
          <h1 className="text-3xl font-bold text-white">Set a new password</h1>
          <p className="mt-3 text-slate-300">
            Choose a password with at least 10 characters, including letters and numbers.
          </p>
        </div>

        {checking ? (
          <p>Verifying your reset link...</p>
        ) : !hasRecoverySession ? (
          <div className="space-y-5">
            <p role="alert" className="rounded-lg bg-red-950 p-3 text-red-300">
              {error || 'This reset link is invalid or has expired. Please request a new one.'}
            </p>
            <Link href="/forgot-password" className="btn w-full text-center">
              Request a new reset link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="mb-2 block">
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
                placeholder="At least 10 characters, letters and numbers"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-red-950 p-3 text-red-300">
                {error}
              </p>
            )}

            {message && (
              <p role="status" className="rounded-lg bg-green-950 p-3 text-green-300">
                {message}
              </p>
            )}

            <button type="submit" disabled={loading} className="w-full">
              {loading ? 'Please wait...' : 'Update password'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
