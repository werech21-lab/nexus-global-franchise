'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getPasswordIssue, getPasswordMismatch, passwordIssueMessage } from '@/lib/password'
import { useT } from '@/lib/i18n/provider'

export default function ResetPasswordPage() {
  const t = useT()
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
      setError(t.common.supabase)
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
              : t.auth.invalidReset
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

    const passwordError = passwordIssueMessage(
      getPasswordIssue(password) || getPasswordMismatch(password, confirmPassword),
      t.password
    )

    if (passwordError) {
      setError(passwordError)
      setLoading(false)
      return
    }

    try {
      if (!supabase) {
        throw new Error(t.common.supabase)
      }

      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      setMessage(t.auth.passwordUpdated)
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
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
          <div className="mb-4 text-4xl">🔒</div>
          <h1 className="text-3xl font-bold text-white">{t.auth.resetTitle}</h1>
          <p className="mt-3 text-slate-300">
            {t.auth.resetIntro}
          </p>
        </div>

        {checking ? (
          <p>{t.auth.verifyingReset}</p>
        ) : !hasRecoverySession ? (
          <div className="space-y-5">
            <p role="alert" className="rounded-lg bg-red-950 p-3 text-red-300">
              {error || t.auth.invalidResetHint}
            </p>
            <Link href="/forgot-password" className="btn w-full text-center">
              {t.auth.requestNewLink}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="mb-2 block">
                {t.auth.newPassword}
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
                placeholder={t.auth.passwordHint}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block">
                {t.auth.confirmNewPassword}
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
                placeholder={t.auth.reenterNewPassword}
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
              {loading ? t.common.pleaseWait : t.auth.updatePassword}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm">
            {t.auth.backToLogin}
          </Link>
        </div>
      </div>
    </div>
  )
}
