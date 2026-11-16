'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useT } from '@/lib/i18n/provider'

type Factor = { id: string; status: string; factor_type?: string }

export default function MfaSettings() {
  const t = useT()
  const router = useRouter()
  const searchParams = useSearchParams()
  const required = searchParams.get('mfa') === 'required'
  const nextPath = searchParams.get('next') || '/admin'

  const [loading, setLoading] = useState(true)
  const [factors, setFactors] = useState<Factor[]>([])
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const enrolled = factors.some(factor => factor.status === 'verified')

  async function refreshFactors() {
    if (!supabase) return
    const { data, error: listError } = await supabase.auth.mfa.listFactors()
    if (listError) {
      setError(listError.message)
      return
    }
    const totp = (data?.totp || []) as Factor[]
    setFactors(totp)
  }

  useEffect(() => {
    async function start() {
      if (!supabase) {
        setError(t.common.supabase)
        setLoading(false)
        return
      }
      await refreshFactors()
      setLoading(false)
    }
    void start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startEnroll() {
    if (!supabase || busy) return
    setBusy(true)
    setError('')
    setMessage('')
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator',
    })
    if (enrollError || !data) {
      setError(enrollError?.message || t.mfa.enrollFailed)
      setBusy(false)
      return
    }
    setFactorId(data.id)
    setQr(data.totp.qr_code)
    setSecret(data.totp.secret)
    setBusy(false)
  }

  async function verify(factor: string, value: string) {
    if (!supabase) return false
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: factor,
    })
    if (challengeError || !challenge) {
      setError(challengeError?.message || t.mfa.failed)
      return false
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: factor,
      challengeId: challenge.id,
      code: value,
    })
    if (verifyError) {
      setError(verifyError.message || t.mfa.failed)
      return false
    }
    return true
  }

  async function activate() {
    if (!factorId || !code.trim()) return
    setBusy(true)
    setError('')
    const ok = await verify(factorId, code.trim())
    if (ok) {
      setMessage(t.mfa.enrolled)
      setQr(null)
      setSecret(null)
      setCode('')
      await refreshFactors()
    }
    setBusy(false)
  }

  async function confirmExisting() {
    const factor = factors.find(item => item.status === 'verified')
    if (!factor || !code.trim()) return
    setBusy(true)
    setError('')
    const ok = await verify(factor.id, code.trim())
    if (ok) {
      setMessage(t.mfa.enrolled)
      setCode('')
      if (nextPath.startsWith('/admin')) {
        router.replace(nextPath)
        router.refresh()
      }
    }
    setBusy(false)
  }

  async function unenroll() {
    if (!supabase) return
    const factor = factors.find(item => item.status === 'verified')
    if (!factor) return
    setBusy(true)
    setError('')
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
    if (unenrollError) setError(unenrollError.message)
    else {
      setMessage(t.mfa.unenrolled)
      await refreshFactors()
    }
    setBusy(false)
  }

  if (loading) return <p>{t.common.pleaseWait}</p>

  return (
    <div className="card space-y-4">
      <h2 className="text-2xl font-bold">{t.mfa.title}</h2>
      <p className="text-slate-300">{required ? t.mfa.required : t.mfa.intro}</p>
      <p className="text-sm text-slate-400">{enrolled ? t.mfa.statusOn : t.mfa.statusOff}</p>

      {qr ? (
        <div className="space-y-3">
          <div
            className="max-w-xs rounded-xl bg-white p-3"
            // QR is an SVG string from supabase-js
            dangerouslySetInnerHTML={{ __html: qr.startsWith('data:') ? '' : qr }}
          />
          {qr.startsWith('data:') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="" className="max-w-xs rounded-xl bg-white p-3" />
          ) : null}
          {secret ? (
            <p className="break-all text-sm text-slate-300">
              {t.mfa.secret}: {secret}
            </p>
          ) : null}
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder={t.mfa.code}
            value={code}
            onChange={event => setCode(event.target.value)}
          />
          <button type="button" className="btn" disabled={busy} onClick={() => void activate()}>
            {busy ? t.mfa.verifying : t.mfa.verify}
          </button>
        </div>
      ) : enrolled && required ? (
        <div className="space-y-3">
          <p>{t.mfa.challenge}</p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder={t.mfa.code}
            value={code}
            onChange={event => setCode(event.target.value)}
          />
          <button type="button" className="btn" disabled={busy} onClick={() => void confirmExisting()}>
            {busy ? t.mfa.verifying : t.mfa.confirm}
          </button>
        </div>
      ) : enrolled ? (
        <button type="button" className="btn" disabled={busy} onClick={() => void unenroll()}>
          {t.mfa.unenroll}
        </button>
      ) : (
        <button type="button" className="btn" disabled={busy} onClick={() => void startEnroll()}>
          {t.mfa.start}
        </button>
      )}

      {error ? <p className="text-rose-300">{error}</p> : null}
      {message ? <p className="text-green-300">{message}</p> : null}
    </div>
  )
}
