'use client'

import { useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { supabase } from '../../lib/supabase'
import { getPasswordIssue, getPasswordMismatch, passwordIssueMessage } from '@/lib/password'
import { useT } from '@/lib/i18n/provider'

function LoginForm() {
  const t = useT()
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/dashboard'
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function safeNext(path: string) {
    return path.startsWith('/') && !path.startsWith('//') ? path : '/dashboard'
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      if (!supabase) {
        throw new Error(t.common.supabase)
      }

      if (mode === 'signup') {
        const passwordError = passwordIssueMessage(
          getPasswordIssue(password) || getPasswordMismatch(password, confirmPassword),
          t.password
        )

        if (passwordError) {
          throw new Error(passwordError)
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`
          }
        })

        if (error) throw error

        if (data.session) {
          router.push(safeNext(nextPath))
          router.refresh()
          return
        }

        setMessage(t.auth.confirmEmail)
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (error) throw error

        router.push(safeNext(nextPath))
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error)
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
            {t.site.name}
          </h1>
          <p className="mt-3 text-slate-300">
            {mode === 'login' ? t.auth.welcomeBack : t.auth.createAccount}
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
            className={`flex-1 ${mode === 'login' ? '' : 'opacity-55'}`}
          >
            {t.auth.loginTitle}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup')
              setError('')
              setMessage('')
            }}
            className={`flex-1 ${mode === 'signup' ? '' : 'opacity-55'}`}
          >
            {t.auth.signupTitle}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block">
              {t.auth.email}
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder={t.auth.emailPlaceholder}
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block">
              {t.auth.password}
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={mode === 'signup' ? 10 : 1}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder={
                mode === 'signup'
                  ? t.auth.passwordHint
                  : t.auth.enterPassword
              }
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label htmlFor="confirmPassword" className="mb-2 block">
                {t.auth.confirmPassword}
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
                placeholder={t.auth.reenterPassword}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          {mode === 'login' && (
            <div className="text-end">
              <Link href="/forgot-password" className="text-sm">
                {t.auth.forgot}
              </Link>
            </div>
          )}

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
              ? t.common.pleaseWait
              : mode === 'login'
                ? t.auth.loginSubmit
                : t.auth.signupSubmit}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm">
            {t.common.backToHome}
          </Link>
        </div>
      </div>
    </div>
  )
}

function LoginFallback() {
  const t = useT()
  return <p className="py-12">{t.common.loading}</p>
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}
