'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLocale, useT } from '@/lib/i18n/provider'
import { formatMoney } from '@/lib/format'
import type { Deal } from '@/types/deal'

export default function DealProposal({
  conversationId,
  isOwner,
  userId,
}: {
  conversationId: string
  isOwner: boolean
  userId: string
}) {
  const t = useT()
  const locale = useLocale()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('KWD')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    if (!supabase) return
    const { data } = await supabase
      .from('deals')
      .select(
        'id, conversation_id, amount, currency, status, commission_rate, commission_amount, investor_approved, owner_approved, investor_approved_at, owner_approved_at, created_at'
      )
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setDeal((data as Deal | null) || null)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  async function propose() {
    if (!supabase || busy) return
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return
    setBusy(true)
    setMessage('')
    const { error } = await supabase.rpc('propose_deal', {
      p_conversation_id: conversationId,
      p_amount: value,
      p_currency: currency,
    })
    if (error) {
      setMessage(error.message || t.deals.proposeFailed)
    } else {
      setMessage(t.deals.proposedOk)
      setAmount('')
      await load()
    }
    setBusy(false)
  }

  async function approve() {
    if (!supabase || !deal || busy) return
    setBusy(true)
    setMessage('')
    const { error } = await supabase.rpc('approve_deal', { p_deal_id: deal.id })
    if (error) {
      setMessage(error.message || t.deals.approveFailed)
    } else {
      setMessage(t.deals.approvedOk)
      await load()
    }
    setBusy(false)
  }

  const steps = [
    { key: 'proposed', label: t.deals.stepProposed, done: Boolean(deal) },
    {
      key: 'approvals',
      label: t.deals.stepApprovals,
      done: Boolean(deal && (deal.investor_approved || deal.owner_approved)),
    },
    {
      key: 'approved',
      label: t.deals.stepApproved,
      done: Boolean(deal && deal.investor_approved && deal.owner_approved),
    },
    { key: 'completed', label: t.deals.stepCompleted, done: deal?.status === 'completed' },
  ]

  const canApprove =
    deal &&
    deal.status !== 'completed' &&
    ((isOwner && !deal.owner_approved) || (!isOwner && !deal.investor_approved))

  return (
    <div className="space-y-3 border-b border-slate-700 px-5 py-4">
      <h2 className="font-bold">{t.deals.stepsTitle}</h2>
      <ol className="flex flex-wrap gap-2 text-xs">
        {steps.map((step, index) => (
          <li
            key={step.key}
            className={`rounded-full px-3 py-1 ${
              step.done ? 'bg-emerald-900/50 text-emerald-300' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {index + 1}. {step.label}
          </li>
        ))}
      </ol>

      {deal ? (
        <div className="text-sm text-slate-300">
          <p>
            {formatMoney(deal.amount, deal.currency, locale)} · {(t.deals.statusLabels as Record<string, string>)[deal.status] || deal.status}
          </p>
          <p className="mt-1">
            {t.deals.investor}: {deal.investor_approved ? t.deals.approved : t.deals.pendingApproval}
            {' · '}
            {t.deals.owner}: {deal.owner_approved ? t.deals.approved : t.deals.pendingApproval}
          </p>
        </div>
      ) : isOwner ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-300">{t.deals.proposeIntro}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="number"
              min={0}
              step="0.001"
              placeholder={t.deals.proposeAmount}
              value={amount}
              onChange={event => setAmount(event.target.value)}
            />
            <select value={currency} onChange={event => setCurrency(event.target.value)}>
              {['KWD', 'SAR', 'AED', 'USD'].map(item => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <button type="button" className="btn" disabled={busy} onClick={() => void propose()}>
              {busy ? t.deals.proposing : t.deals.propose}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400">{t.deals.proposeTitle}</p>
      )}

      {canApprove ? (
        <button type="button" className="btn" disabled={busy} onClick={() => void approve()}>
          {t.deals.approveDeal}
        </button>
      ) : null}

      {message ? (
        <p role="status" className="text-sm text-amber-300">
          {message}
        </p>
      ) : null}
    </div>
  )
}
