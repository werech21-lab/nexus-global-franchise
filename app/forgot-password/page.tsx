'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      if (!supabase) {
        throw new Error('Supabase is not configured. Check Vercel environment variables.')
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      setMessage(
        'If an account exists for that email, we sent a password reset link. Please check your inbox.'
      )
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
          <div className="mb-4 text-4xl">🔑</div>
          <h1 className="text-3xl font-bold text-white">Forgot password</h1>
          <p className="mt-3 text-slate-300">
            Enter your email and we will send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
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
            {loading ? 'Please wait...' : 'Send reset link'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
