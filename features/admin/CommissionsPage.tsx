'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLocale, useT } from '@/lib/i18n/provider'
import { formatDateTime, formatMoney, paymentStatusLabel } from '@/lib/format'
import PageShell from '@/components/ui/PageShell'
import EmptyState from '@/components/ui/EmptyState'
import Alert from '@/components/ui/Alert'
import StatCard from '@/components/ui/StatCard'
import Badge from '@/components/ui/Badge'
import type { PaymentWithDeal } from '@/types/deal'

export default function CommissionsPage() {
  const t = useT()
  const locale = useLocale()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<PaymentWithDeal[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  const money = (value: number | null | undefined, currency = 'KWD') =>
    formatMoney(value, currency, locale, t.common.notAvailable)

  const loadPayments = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      if (!supabase) throw new Error(t.deals.unavailable)

      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!authData.user) throw new Error(t.common.signInFirst)

      const { data: adminFlag, error: adminError } = await supabase.rpc('is_nexus_admin')
      if (adminError) throw adminError
      if (adminFlag !== true) throw new Error(t.common.accessDenied)

      setAuthorized(true)

      const { data: paymentData, error: paymentError } = await supabase
        .from('commission_payments')
        .select('id, deal_id, status, due_at, paid_at')
        .order('created_at', { ascending: false })

      if (paymentError) throw paymentError

      const records = (paymentData ?? []) as PaymentWithDeal[]
      const dealIds = [...new Set(records.map(payment => payment.deal_id).filter(Boolean))]

      let dealsById = new Map<string, NonNullable<PaymentWithDeal['deal']>>()
      if (dealIds.length > 0) {
        const { data: dealData, error: dealError } = await supabase
          .from('deals')
          .select('id, amount, currency, commission_rate, commission_amount, status, conversation_id')
          .in('id', dealIds)

        if (dealError) throw dealError
        dealsById = new Map(
          ((dealData ?? []) as NonNullable<PaymentWithDeal['deal']>[]).map(deal => [deal.id, deal])
        )
      }

      setPayments(
        records.map(payment => ({
          ...payment,
          deal: dealsById.get(payment.deal_id) ?? null,
        }))
      )
    } catch (err) {
      setAuthorized(false)
      setError(err instanceof Error ? err.message : t.common.error)
    } finally {
      setLoading(false)
    }
  }, [t.common.accessDenied, t.common.error, t.common.signInFirst, t.deals.unavailable])

  useEffect(() => {
    void loadPayments()
  }, [loadPayments])

  async function markPaid(payment: PaymentWithDeal) {
    if (savingId || payment.status !== 'pending') return

    const confirmed = window.confirm(t.commissions.confirmPaid)
    if (!confirmed) return

    setSavingId(payment.id)
    setError('')
    setSuccess('')

    try {
      if (!supabase) throw new Error(t.deals.unavailable)

      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!authData.user) throw new Error(t.commissions.adminSession)

      const { data: adminFlag, error: adminError } = await supabase.rpc('is_nexus_admin')
      if (adminError) throw adminError
      if (adminFlag !== true) throw new Error(t.commissions.adminFailed)

      const { error: rpcError } = await supabase.rpc('admin_mark_commission_paid', {
        p_payment_id: payment.id,
      })
      if (rpcError) throw rpcError

      await loadPayments()
      setSuccess(t.commissions.markedOk)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.commissions.markFailed)
    } finally {
      setSavingId(null)
    }
  }

  const pending = payments.filter(payment => payment.status === 'pending').length
  const paid = payments.filter(payment => payment.status === 'paid').length

  return (
    <PageShell
      title={t.commissions.title}
      intro={t.commissions.intro}
      backHref="/admin"
      backLabel={t.common.backToAdmin}
      actions={
        <button type="button" className="btn" onClick={() => void loadPayments()}>
          {t.commissions.refresh}
        </button>
      }
    >
      {error ? <Alert tone="error" role="alert">{error}</Alert> : null}
      {success ? <Alert tone="success" role="status">{success}</Alert> : null}

      {loading ? (
        <p className="text-slate-400">{t.commissions.loading}</p>
      ) : !authorized ? null : payments.length === 0 ? (
        <EmptyState title={t.commissions.empty} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label={t.commissions.total} value={payments.length} />
            <StatCard label={t.commissions.pending} value={pending} tone="warning" />
            <StatCard label={t.commissions.paid} value={paid} tone="success" />
          </div>

          <div className="space-y-4">
            {payments.map(payment => {
              const deal = payment.deal
              const currency = deal?.currency || 'KWD'
              const statusLabel = paymentStatusLabel(payment.status, {
                pending: t.commissions.pending,
                paid: t.commissions.paid,
                awaiting: t.bank.statusAwaiting,
                none: t.common.notSet,
              })

              return (
                <section key={payment.id} className="card space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 text-sm text-slate-300">
                      <p>
                        <strong>{t.commissions.paymentId}:</strong> {payment.id}
                      </p>
                      <p>
                        <strong>{t.commissions.dealId}:</strong> {payment.deal_id}
                      </p>
                    </div>
                    <Badge tone={payment.status === 'paid' ? 'success' : 'gold'}>
                      {statusLabel}
                    </Badge>
                  </div>

                  <div className="border-t border-slate-700 pt-4 text-sm text-slate-300">
                    {deal ? (
                      <>
                        <p>
                          <strong>{t.commissions.dealAmount}:</strong> {money(deal.amount, currency)}
                        </p>
                        <p>
                          <strong>{t.commissions.commissionRate}:</strong>{' '}
                          {deal.commission_rate == null
                            ? t.common.notAvailable
                            : `${(Number(deal.commission_rate) * 100).toFixed(2)}%`}
                        </p>
                        <p className="text-amber-300">
                          {t.commissions.commissionAmount}: {money(deal.commission_amount, currency)}
                        </p>
                        <p>
                          <strong>{t.commissions.dealStatus}:</strong> {(t.deals.statusLabels as Record<string, string>)[deal.status] || deal.status}
                        </p>
                        <p>
                          <strong>{t.commissions.conversationId}:</strong>{' '}
                          {deal.conversation_id || t.common.notAvailable}
                        </p>
                      </>
                    ) : (
                      <p className="text-amber-300">{t.commissions.missingDeal}</p>
                    )}
                  </div>

                  <div className="border-t border-slate-700 pt-4 text-sm text-slate-300">
                    <p>
                      <strong>{t.commissions.dueDate}:</strong>{' '}
                      {formatDateTime(payment.due_at, locale, t.common.notSet)}
                    </p>
                    <p>
                      <strong>{t.commissions.paidAt}:</strong>{' '}
                      {formatDateTime(payment.paid_at, locale, t.commissions.notPaid)}
                    </p>
                  </div>

                  {payment.status === 'pending' ? (
                    <button
                      type="button"
                      className="btn"
                      disabled={savingId === payment.id}
                      onClick={() => void markPaid(payment)}
                    >
                      {savingId === payment.id ? t.commissions.saving : t.commissions.markPaid}
                    </button>
                  ) : null}
                </section>
              )
            })}
          </div>
        </>
      )}
    </PageShell>
  )
}
