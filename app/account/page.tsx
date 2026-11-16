'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { passwordsMatch, validatePassword } from '@/lib/password'

export default function AccountPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loadingUser, setLoadingUser] = useState(true)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadUser() {
      if (!supabase) {
        setError('Supabase is not configured. Check Vercel environment variables.')
        setLoadingUser(false)
        return
      }

      const { data, error } = await supabase.auth.getUser()

      if (error || !data.user) {
        router.replace('/login?next=/account')
        return
      }

      setEmail(data.user.email || '')
      setLoadingUser(false)
    }

    void loadUser()
  }, [router])

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

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      })

      if (reauthError) {
        throw new Error('Current password is incorrect.')
      }

      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      setPassword('')
      setConfirmPassword('')
      setCurrentPassword('')
      setMessage('Your password has been updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  if (loadingUser) {
    return <p className="py-12">Loading account...</p>
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <div className="card">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Account</h1>
          <p className="mt-3 text-slate-300">
            Signed in as <span className="text-amber-200">{email || 'your account'}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="currentPassword" className="mb-2 block">
              Current password
            </label>
            <input
              id="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Enter your current password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
            />
          </div>

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

        <div className="mt-6 text-center">
          <Link href="/dashboard" className="text-sm">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
