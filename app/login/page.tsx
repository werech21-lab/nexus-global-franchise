
'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`
          }
        })

        if (error) throw error

        if (data.session) {
          router.push('/dashboard')
          router.refresh()
          return
        }

        setMessage('Please check your email to confirm your account, then log in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (error) throw error

        router.push('/dashboard')
        router.refresh()
      }
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
          <div className="mb-4 text-4xl">🌐</div>
          <h1 className="text-3xl font-bold text-white">
            Nexus Global Franchise
          </h1>
          <p className="mt-3 text-slate-300">
            {mode === 'login'
              ? 'Welcome back to your global business network'
              : 'Create your global business account'}
          </p>
        </div>

        <div className="mb-6 flex gap-3">
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setError('')
              setMessage('')
            }}
            className="flex-1"
            style={{ opacity: mode === 'login' ? 1 : 0.55 }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup')
              setError('')
              setMessage('')
            }}
            className="flex-1"
            style={{ opacity: mode === 'signup' ? 1 : 0.55 }}
          >
            Sign Up
          </button>
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

          <div>
            <label htmlFor="password" className="mb-2 block">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
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
            {loading
              ? 'Please wait...'
              : mode === 'login'
                ? 'Login to Dashboard'
                : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm">
            ← Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  )
}
