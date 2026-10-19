
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

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
  const [agreement, setAgreement] =
    useState<Agreement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadAgreement() {
      if (!supabase) {
        setError('Supabase is not configured.')
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

      if (queryError) {
        setError(queryError.message)
      } else {
        setAgreement(data as Agreement | null)
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
          ← Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold">
          Nexus Deal Protection
        </h1>

        <p className="text-slate-300">
          Brokerage transparency, introduction
          records and commission protection.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-2">
          <p className="text-slate-400">
            Proposed Success Commission
          </p>

          <p className="text-4xl font-bold text-amber-300">
            2%
          </p>

          <p className="text-sm text-slate-300">
            Payable by the opportunity owner
            upon a qualifying completed transaction,
            subject to a final approved agreement.
          </p>
        </div>

        <div className="card space-y-2">
          <p className="text-slate-400">
            Subscription Fees
          </p>

          <p className="text-2xl font-bold">
            Separate
          </p>

          <p className="text-sm text-slate-300">
            Subscription payments are independent
            of transaction-based commissions.
          </p>
        </div>
      </div>

      <div className="card space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">
            Brokerage Agreement
          </h2>

          <span className="rounded-full bg-amber-500/20 px-4 py-2 text-sm text-amber-300">
            Draft - Legal Review Required
          </span>
        </div>

        {loading ? (
          <p className="text-slate-300">
            Loading agreement...
          </p>
        ) : error ? (
          <p role="alert" className="text-red-400">
            {error}
          </p>
        ) : agreement ? (
          <>
            <p className="text-sm text-slate-400">
              Version: {agreement.version}
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
                Not Active - For Legal Review Only
              </p>

              <p className="mt-2 text-sm text-slate-300">
                This document is a development draft.
                No binding acceptance or commission
                obligation is created by viewing it.
              </p>
            </div>

            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-lg bg-slate-700 px-6 py-3 font-semibold text-slate-400"
            >
              Agreement Acceptance Unavailable
            </button>
          </>
        ) : (
          <p className="text-slate-300">
            The draft agreement is not available
            for public viewing yet.
          </p>
        )}
      </div>

      <div className="card space-y-3">
        <h2 className="text-xl font-bold">
          How Nexus Deal Protection Works
        </h2>

        <p className="text-slate-300">
          Once the legal agreement is approved,
          Nexus will record agreement acceptance,
          investor introductions and qualifying
          transactions to support commission tracking.
        </p>

        <p className="text-sm text-slate-400">
          International availability will depend
          on applicable laws and licensing.
        </p>
      </div>
    </main>
  )
}
