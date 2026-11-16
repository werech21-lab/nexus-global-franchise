
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLocale, useT } from '@/lib/i18n/provider'
import { interpolate } from '@/lib/i18n'
import { formatDate } from '@/lib/format'

type Agreement = {
  id: string
  version: string
  title: string
  content: string
  commission_rate: number
  is_active: boolean
  created_at: string
}

export default function DealProtectionPage() {
  const t = useT()
  const [agreement, setAgreement] =
    useState<Agreement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const locale = useLocale()
  const [userId, setUserId] = useState<string | null>(null)
  const [acceptedAt, setAcceptedAt] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [acceptMessage, setAcceptMessage] = useState('')

  useEffect(() => {
    let active = true

    async function loadAgreement() {
      if (!supabase) {
        setError(t.common.supabase)
        setLoading(false)
        return
      }

      const { data, error: queryError } = await supabase
        .from('brokerage_agreements')
        .select(
          'id,version,title,content,commission_rate,is_active,created_at'
        )
        .eq('version', 'draft-v1')
        .maybeSingle()

      if (!active) return

      const { data: authData } = await supabase.auth.getUser()
      const currentUserId = authData.user?.id || null
      setUserId(currentUserId)

      if (queryError) {
        setError(queryError.message)
      } else {
        setAgreement(data as Agreement | null)
      }

      if (currentUserId && data) {
        const agreementRow = data as Agreement
        const { data: acceptance } = await supabase
          .from('brokerage_agreement_acceptances')
          .select('accepted_at')
          .eq('user_id', currentUserId)
          .eq('agreement_id', agreementRow.id)
          .eq('agreement_version', agreementRow.version)
          .maybeSingle()
        setAcceptedAt(acceptance?.accepted_at || null)
      }

      setLoading(false)
    }

    void loadAgreement()

    return () => {
      active = false
    }
  }, [])

  return (
    <main className="mx-auto max-w-4xl space-y-8 py-10">
      <div className="space-y-3">
        <Link
          href="/dashboard"
          className="text-amber-300"
        >
          <span className="inline-block rtl:rotate-180">←</span> {t.common.backToDashboard}
        </Link>

        <h1 className="text-3xl font-bold">
          {t.dealProtection.title}
        </h1>

        <p className="text-slate-300">
          {t.dealProtection.intro}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-2">
          <p className="text-slate-400">
            {t.dealProtection.commissionTitle}
          </p>

          <p className="text-4xl font-bold text-amber-300">
            2%
          </p>

          <p className="text-sm text-slate-300">
            {t.dealProtection.commissionBody}
          </p>
        </div>

        <div className="card space-y-2">
          <p className="text-slate-400">
            {t.dealProtection.subscriptionTitle}
          </p>

          <p className="text-2xl font-bold">
            {t.dealProtection.subscriptionBadge}
          </p>

          <p className="text-sm text-slate-300">
            {t.dealProtection.subscriptionBody}
          </p>
        </div>
      </div>

      <div className="card space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">
            {t.dealProtection.agreementTitle}
          </h2>

          <span className="rounded-full bg-amber-500/20 px-4 py-2 text-sm text-amber-300">
            {t.dealProtection.draftReview}
          </span>
        </div>

        {loading ? (
          <p className="text-slate-300">
            {t.dealProtection.loading}
          </p>
        ) : error ? (
          <p role="alert" className="text-red-400">
            {error}
          </p>
        ) : agreement ? (
          <>
            <p className="text-sm text-slate-400">
              {t.dealProtection.version}: {agreement.version}
            </p>

            <h3 className="text-xl font-semibold">
              {agreement.title}
            </h3>

            <div className="max-h-[600px] overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-5">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                {agreement.content}
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
              <p className="font-semibold text-amber-300">
                {t.dealProtection.notActive}
              </p>

              <p className="mt-2 text-sm text-slate-300">
                {t.dealProtection.draftViewNote}
              </p>
            </div>

            <div className="space-y-3 rounded-xl border border-amber-500/30 bg-slate-950/40 p-4">
              <p className="font-semibold text-amber-300">
                {t.dealProtection.acceptTitle}
              </p>
              <p className="text-sm text-slate-300">
                {t.dealProtection.acceptBody}
              </p>
              {!userId ? (
                <Link href="/login?next=/deal-protection" className="btn">
                  {t.dealProtection.signInToAccept}
                </Link>
              ) : acceptedAt ? (
                <p role="status" className="text-sm text-emerald-300">
                  {interpolate(t.dealProtection.acceptedAt, {
                    version: agreement.version,
                    date: formatDate(acceptedAt, locale),
                  })}
                </p>
              ) : (
                <button
                  type="button"
                  disabled={accepting}
                  className="btn"
                  onClick={async () => {
                    if (!supabase || accepting) return
                    setAccepting(true)
                    setAcceptMessage('')
                    const { error: acceptError } = await supabase
                      .from('brokerage_agreement_acceptances')
                      .insert({
                        user_id: userId,
                        agreement_id: agreement.id,
                        agreement_version: agreement.version,
                      })
                    if (acceptError) {
                      setAcceptMessage(acceptError.message || t.dealProtection.acceptFailed)
                    } else {
                      setAcceptedAt(new Date().toISOString())
                    }
                    setAccepting(false)
                  }}
                >
                  {accepting ? t.dealProtection.accepting : t.dealProtection.accept}
                </button>
              )}
              {acceptMessage ? (
                <p className="text-sm text-rose-300">{acceptMessage}</p>
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-slate-300">
            {t.dealProtection.draftUnavailable}
          </p>
        )}
      </div>

      <div className="card space-y-3">
        <h2 className="text-xl font-bold">
          {t.dealProtection.howTitle}
        </h2>

        <p className="text-slate-300">
          {t.dealProtection.howBody}
        </p>

        <p className="text-sm text-slate-400">
          {t.dealProtection.howLegal}
        </p>
      </div>
    </main>
  )
}
