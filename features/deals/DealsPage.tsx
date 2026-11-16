'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLocale, useT } from '@/lib/i18n/provider'
import { interpolate } from '@/lib/i18n'
import { formatDateTime, formatMoney, paymentStatusLabel, pickLatestPayment } from '@/lib/format'
import PageShell from '@/components/ui/PageShell'
import EmptyState from '@/components/ui/EmptyState'
import Alert from '@/components/ui/Alert'
import StatCard from '@/components/ui/StatCard'
import Badge from '@/components/ui/Badge'
import type { CommissionPayment, Deal, DealWithRole } from '@/types/deal'

type DealRow = DealWithRole & {
  payment: CommissionPayment | null
}

export default function DealsPage() {
  const t = useT()
  const locale = useLocale()
  const [deals, setDeals] = useState<DealRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [payingId, setPayingId] = useState<string | null>(null)

  const money = (amount: number | null | undefined, currency: string) =>
    formatMoney(amount, currency, locale, t.common.notAvailable)

  const loadDeals = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      if (!supabase) throw new Error(t.deals.unavailable)

      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError

      const userId = authData.user?.id
      if (!userId) {
        setDeals([])
        throw new Error(t.deals.loginRequired)
      }

      const { data: dealData, error: dealError } = await supabase
        .from('deals')
        .select(
          'id, conversation_id, amount, currency, status, commission_rate, commission_amount, investor_approved, owner_approved, investor_approved_at, owner_approved_at, created_at'
        )
        .order('created_at', { ascending: false })

      if (dealError) throw dealError

      const records = (dealData ?? []) as Deal[]
      if (records.length === 0) {
        setDeals([])
        return
      }

      const conversationIds = [...new Set(records.map(deal => deal.conversation_id))]
      const dealIds = records.map(deal => deal.id)

      const [{ data: conversationData, error: conversationError }, { data: paymentData, error: paymentError }] =
        await Promise.all([
          supabase
            .from('conversations')
            .select('id, investor_id, owner_id')
            .in('id', conversationIds),
          supabase
            .from('commission_payments')
            .select('id, deal_id, status, due_at, paid_at')
            .in('deal_id', dealIds),
        ])

      if (conversationError) throw conversationError
      if (paymentError) throw paymentError

      const conversations = new Map(
        ((conversationData ?? []) as Array<{ id: string; investor_id: string; owner_id: string }>).map(
          conversation => [conversation.id, conversation]
        )
      )

      const paymentsByDeal = new Map<string, CommissionPayment[]>()
      for (const payment of (paymentData ?? []) as CommissionPayment[]) {
        const list = paymentsByDeal.get(payment.deal_id) ?? []
        list.push(payment)
        paymentsByDeal.set(payment.deal_id, list)
      }

      const visibleDeals: DealRow[] = records
        .map(deal => {
          const conversation = conversations.get(deal.conversation_id)
          return {
            ...deal,
            isInvestor: conversation?.investor_id === userId,
            isOwner: conversation?.owner_id === userId,
            payment: pickLatestPayment(paymentsByDeal.get(deal.id) ?? []),
          }
        })
        .filter(deal => deal.isInvestor || deal.isOwner)

      setDeals(visibleDeals)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.deals.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [t.deals.loadFailed, t.deals.loginRequired, t.deals.unavailable])

  useEffect(() => {
    void loadDeals()
  }, [loadDeals])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('commission') === 'paid') {
      setSuccess(t.deals.payReturned)
    }
  }, [t.deals.payReturned])

  async function payCommission(deal: DealRow) {
    if (payingId || !deal.payment || deal.payment.status !== 'pending' || !deal.isOwner) return

    setPayingId(deal.id)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/payments/lemonsqueezy/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: deal.payment.id }),
      })
      const result = (await response.json().catch(() => null)) as {
        ok?: boolean
        error?: string
        url?: string
        amount_cents?: number
        currency?: string
        rate?: number | null
        deal_currency?: string
      } | null

      if (!response.ok || !result?.ok || !result.url) {
        const code = result?.error
        if (code === 'currency_unsupported') {
          throw new Error(
            interpolate(t.deals.payCurrencyUnsupported, {
              currency: result?.deal_currency ?? deal.currency,
            })
          )
        }
        if (code === 'forbidden') throw new Error(t.deals.payForbidden)
        if (code === 'not_pending') throw new Error(t.deals.payNotPending)
        if (code === 'unauthorized') throw new Error(t.deals.loginRequired)
        if (code === 'not_configured' || code === 'provider_unavailable') {
          throw new Error(t.deals.payUnavailable)
        }
        throw new Error(t.deals.payFailed)
      }

      const charge = money((result.amount_cents ?? 0) / 100, result.currency ?? 'USD')
      let message = interpolate(t.deals.payConfirm, {
        charge,
        amount: money(deal.commission_amount, deal.currency),
      })
      if (result.rate) {
        message += '\n' + interpolate(t.deals.payConfirmRate, {
          from: deal.currency,
          rate: String(result.rate),
          to: result.currency ?? 'USD',
        })
      }
      if (!window.confirm(message)) return

      window.location.assign(result.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.deals.payFailed)
    } finally {
      setPayingId(null)
    }
  }

  async function approveDeal(deal: DealRow, role: 'investor' | 'owner') {
    if (savingId || deal.status === 'completed') return

    const isAuthorized =
      role === 'investor'
        ? deal.isInvestor && !deal.investor_approved
        : deal.isOwner && !deal.owner_approved

    if (!isAuthorized) return

    const confirmed = window.confirm(
      interpolate(t.deals.confirmApprove, {
        amount: money(deal.amount, deal.currency),
      })
    )
    if (!confirmed) return

    setSavingId(deal.id)
    setError('')
    setSuccess('')

    try {
      if (!supabase) throw new Error(t.deals.unavailable)

      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!authData.user) throw new Error(t.deals.loginRequired)

      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .select('investor_id, owner_id')
        .eq('id', deal.conversation_id)
        .single()

      if (conversationError) throw conversationError

      const expectedUserId =
        role === 'investor' ? conversation.investor_id : conversation.owner_id

      if (authData.user.id !== expectedUserId) {
        throw new Error(t.deals.unauthorized)
      }

      const { error: rpcError } = await supabase.rpc('approve_deal', {
        p_deal_id: deal.id,
      })

      if (rpcError) {
        const column = role === 'investor' ? 'investor_approved' : 'owner_approved'
        const { data, error: updateError } = await supabase
          .from('deals')
          .update({ [column]: true })
          .eq('id', deal.id)
          .eq('conversation_id', deal.conversation_id)
          .eq(column, false)
          .select('id')
          .maybeSingle()

        if (updateError) throw updateError
        if (!data) throw new Error(rpcError.message || t.deals.notSaved)
      }

      await loadDeals()
      setSuccess(t.deals.approvedOk)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.deals.approveFailed)
    } finally {
      setSavingId(null)
    }
  }

  const currencies = [...new Set(deals.map(deal => deal.currency))]
  const currency = currencies.length === 1 ? currencies[0] : null
  const totalValue = deals.reduce((sum, deal) => sum + Number(deal.amount ?? 0), 0)
  const totalCommission = deals.reduce(
    (sum, deal) => sum + Number(deal.commission_amount ?? 0),
    0
  )
  const completed = deals.filter(deal => deal.status === 'completed').length

  return (
    <PageShell
      title={t.deals.title}
      intro={t.deals.intro}
      backHref="/dashboard"
      backLabel={t.common.backToDashboard}
      actions={
        <button type="button" className="btn" onClick={() => void loadDeals()}>
          {t.deals.refresh}
        </button>
      }
    >
      {error ? <Alert tone="error" role="alert">{error}</Alert> : null}
      {success ? <Alert tone="success" role="status">{success}</Alert> : null}

      {loading ? (
        <p className="text-slate-400">{t.deals.loading}</p>
      ) : deals.length === 0 ? (
        <EmptyState title={t.deals.empty} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              label={t.deals.totalValue}
              value={currency ? money(totalValue, currency) : t.deals.mixedCurrency}
            />
            <StatCard
              label={t.deals.calculatedCommission}
              value={currency ? money(totalCommission, currency) : t.deals.mixedCurrency}
              tone="warning"
            />
            <StatCard label={t.deals.completed} value={completed} tone="success" />
          </div>

          <div className="space-y-5">
            {deals.map(deal => {
              const bothApproved = deal.investor_approved && deal.owner_approved
              const paymentLabel = paymentStatusLabel(deal.payment?.status, {
                pending: t.deals.paymentPending,
                paid: t.deals.paymentPaid,
                none: t.deals.paymentNone,
              })

              return (
                <section key={deal.id} className="card space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-400">{deal.id}</p>
                      <p className="mt-2 text-2xl font-bold text-amber-300">
                        {money(deal.amount, deal.currency)}
                      </p>
                    </div>
                    <Badge tone={deal.status === 'completed' ? 'success' : 'gold'}>
                      {(t.deals.statusLabels as Record<string, string>)[deal.status] || deal.status}
                    </Badge>
                  </div>

                  <div className="grid gap-2 text-sm text-slate-300 md:grid-cols-2">
                    <p>
                      {t.deals.commissionRate}:{' '}
                      {(Number(deal.commission_rate ?? 0) * 100).toFixed(2)}%
                    </p>
                    <p>
                      {t.deals.commissionAmount}: {money(deal.commission_amount, deal.currency)}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-700 p-4">
                      <p className="text-sm text-slate-400">{t.deals.investor}</p>
                      <p className={deal.investor_approved ? 'text-green-400' : 'text-slate-300'}>
                        {deal.investor_approved ? t.deals.approved : t.deals.pendingApproval}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {t.deals.approvedAt}: {formatDateTime(deal.investor_approved_at, locale, t.common.notYet)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-700 p-4">
                      <p className="text-sm text-slate-400">{t.deals.owner}</p>
                      <p className={deal.owner_approved ? 'text-green-400' : 'text-slate-300'}>
                        {deal.owner_approved ? t.deals.approved : t.deals.pendingApproval}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {t.deals.approvedAt}: {formatDateTime(deal.owner_approved_at, locale, t.common.notYet)}
                      </p>
                    </div>
                  </div>

                  {deal.status !== 'completed' && deal.isInvestor && !deal.investor_approved ? (
                    <button
                      type="button"
                      className="btn"
                      disabled={savingId === deal.id}
                      onClick={() => void approveDeal(deal, 'investor')}
                    >
                      {savingId === deal.id ? t.deals.saving : t.deals.approveInvestor}
                    </button>
                  ) : null}

                  {deal.status !== 'completed' && deal.isOwner && !deal.owner_approved ? (
                    <button
                      type="button"
                      className="btn"
                      disabled={savingId === deal.id}
                      onClick={() => void approveDeal(deal, 'owner')}
                    >
                      {savingId === deal.id ? t.deals.saving : t.deals.approveOwner}
                    </button>
                  ) : null}

                  <p className={bothApproved ? 'text-green-400' : 'text-slate-400'}>
                    {bothApproved ? t.deals.bothApproved : t.deals.waitingApproval}
                  </p>

                  {deal.status === 'completed' && !bothApproved ? (
                    <p className="text-amber-300">{t.deals.legacyCompleted}</p>
                  ) : null}

                  <div className="border-t border-slate-700 pt-4">
                    <h3 className="text-lg font-bold">{t.deals.paymentTitle}</h3>
                    <p className="mt-2 text-amber-300">
                      {t.deals.calculated}: {money(deal.commission_amount, deal.currency)}
                    </p>
                    <p className="mt-1 text-slate-300">
                      {t.deals.paymentStatus}: {paymentLabel}
                    </p>
                    {deal.payment?.due_at ? (
                      <p className="mt-1 text-sm text-slate-400">
                        {t.deals.dueDate}: {formatDateTime(deal.payment.due_at, locale)}
                      </p>
                    ) : null}
                    {deal.payment?.paid_at ? (
                      <p className="mt-1 text-sm text-slate-400">
                        {t.deals.paidAt}: {formatDateTime(deal.payment.paid_at, locale)}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm text-slate-400">{t.deals.paymentNote}</p>
                    {deal.status === 'completed' && deal.payment?.status === 'pending' ? (
                      deal.isOwner ? (
                        <div className="mt-4 space-y-2">
                          <button
                            type="button"
                            className="btn"
                            disabled={payingId === deal.id}
                            onClick={() => void payCommission(deal)}
                          >
                            {payingId === deal.id ? t.deals.payingCommission : t.deals.payCommission}
                          </button>
                          <p className="text-xs text-slate-400">{t.deals.payNote}</p>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-slate-400">{t.deals.payOwnerOnly}</p>
                      )
                    ) : null}
                  </div>

                  <Link href={`/dashboard/messages/${deal.conversation_id}`} className="text-amber-300">
                    {t.deals.conversation}
                    <span className="inline-block ltr:ml-1 rtl:mr-1 rtl:rotate-180">→</span>
                  </Link>
                </section>
              )
            })}
          </div>
        </>
      )}
    </PageShell>
  )
}
