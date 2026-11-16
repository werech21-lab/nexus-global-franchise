'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getPasswordIssue, getPasswordMismatch, passwordIssueMessage } from '@/lib/password'
import { Suspense } from 'react'
import { interpolate } from '@/lib/i18n'
import { useT } from '@/lib/i18n/provider'
import ProfileForm from '@/components/profile/ProfileForm'
import MfaSettings from '@/components/mfa/MfaSettings'

export default function AccountPage() {
  const t = useT()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState('')
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
        setError(t.common.supabase)
        setLoadingUser(false)
        return
      }

      const { data, error } = await supabase.auth.getUser()

      if (error || !data.user) {
        router.replace('/login?next=/account')
        return
      }

      setEmail(data.user.email || '')
      setUserId(data.user.id)
      setLoadingUser(false)
    }

    void loadUser()
  }, [router])

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

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      })

      if (reauthError) {
        throw new Error(t.auth.currentPasswordWrong)
      }

      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      setPassword('')
      setConfirmPassword('')
      setCurrentPassword('')
      setMessage(t.auth.passwordChanged)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error)
    } finally {
      setLoading(false)
    }
  }

  if (loadingUser) {
    return <p className="py-12">{t.auth.accountLoading}</p>
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-12">
      {userId ? <ProfileForm userId={userId} /> : null}
      <Suspense fallback={null}>
        <MfaSettings />
      </Suspense>
      <div className="card">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">{t.auth.accountTitle}</h1>
          <p className="mt-3 text-slate-300">
            {interpolate(t.auth.accountIntro, { email: email || t.auth.yourAccount })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="currentPassword" className="mb-2 block">
              {t.auth.currentPassword}
            </label>
            <input
              id="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              placeholder={t.auth.currentPasswordPlaceholder}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
            />
          </div>

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

        <div className="mt-6 text-center">
          <Link href="/dashboard" className="text-sm">
            {t.common.backToDashboard}
          </Link>
        </div>
      </div>
    </div>
  )
}
