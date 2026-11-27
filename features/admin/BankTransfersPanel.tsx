'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLocale, useT } from '@/lib/i18n/provider'
import { interpolate } from '@/lib/i18n'
import { formatDate, formatDateTime, formatMoney } from '@/lib/format'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'

type Transfer = {
  payment_id: string
  deal_id: string
  deal_amount: number | null
  currency: string
  commission_amount: number | null
  owner_id: string
  owner_email: string | null
  transfer_reference: string | null
  transfer_date: string | null
  receipt_path: string | null
  submitted_at: string | null
  expected_reference: string
}

/** Admin list of bank transfers awaiting confirmation (admin RPCs check is_nexus_admin()). */
export default function BankTransfersPanel({ onChanged }: { onChanged?: () => void }) {
  const t = useT()
  const locale = useLocale()
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (!supabase) throw new Error(t.deals.unavailable)
      const { data, error: rpcError } = await supabase.rpc('admin_list_bank_transfers')
      if (rpcError) throw rpcError
      setTransfers((data ?? []) as Transfer[])
    } catch (err) {
      setError(err instanceof Error ? err.message : t.bank.adminLoadFailed)
    } finally {
      setLoading(false)
    }
  }, [t.bank.adminLoadFailed, t.deals.unavailable])

  useEffect(() => {
    void load()
  }, [load])

  async function openReceipt(path: string) {
    setError('')
    if (!supabase) return
    const { data, error: urlError } = await supabase.storage
      .from('commission-receipts')
      .createSignedUrl(path, 120)
    if (urlError || !data?.signedUrl) {
      setError(t.bank.receiptOpenFailed)
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function confirm(transfer: Transfer) {
    if (busyId) return
    const amount = formatMoney(transfer.commission_amount, transfer.currency, locale, t.common.notAvailable)
    if (!window.confirm(interpolate(t.bank.confirmPrompt, { amount, reference: transfer.transfer_reference ?? '' }))) return

    setBusyId(transfer.payment_id)
    setError('')
    setSuccess('')
    try {
      if (!supabase) throw new Error(t.deals.unavailable)
      const { error: rpcError } = await supabase.rpc('admin_confirm_bank_transfer', {
        p_payment_id: transfer.payment_id,
      })
      if (rpcError) throw rpcError
      setSuccess(t.bank.confirmedOk)
      await load()
      onChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : t.bank.confirmFailed)
    } finally {
      setBusyId(null)
    }
  }

  async function reject(transfer: Transfer) {
    if (busyId) return
    const trimmed = note.trim()
    if (trimmed.length < 3) {
      setError(t.bank.rejectNoteRequired)
      return
    }
    setBusyId(transfer.payment_id)
    setError('')
    setSuccess('')
    try {
      if (!supabase) throw new Error(t.deals.unavailable)
      const { error: rpcError } = await supabase.rpc('admin_reject_bank_transfer', {
        p_payment_id: transfer.payment_id,
        p_note: trimmed,
      })
      if (rpcError) throw rpcError
      setRejectingId(null)
      setNote('')
      setSuccess(t.bank.rejectedOk)
      await load()
      onChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : t.bank.rejectFailed)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="card space-y-4" aria-labelledby="bank-transfers-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="bank-transfers-title" className="text-2xl font-bold">
          {t.bank.adminTitle}
        </h2>
        <Badge tone="gold">{transfers.length}</Badge>
      </div>

      {error ? <Alert tone="error" role="alert">{error}</Alert> : null}
      {success ? <Alert tone="success" role="status">{success}</Alert> : null}

      {loading ? (
        <p className="text-slate-400">{t.bank.loading}</p>
      ) : transfers.length === 0 ? (
        <p className="text-slate-400">{t.bank.adminEmpty}</p>
      ) : (
        <div className="space-y-4">
          {transfers.map(transfer => {
            const busy = busyId === transfer.payment_id
            return (
              <div key={transfer.payment_id} className="space-y-3 rounded-xl border border-slate-700 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="text-2xl font-bold text-amber-300">
                    {formatMoney(transfer.commission_amount, transfer.currency, locale, t.common.notAvailable)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {t.bank.submittedAt}: {formatDateTime(transfer.submitted_at, locale, t.common.notSet)}
                  </p>
                </div>

                <div className="grid gap-1 text-sm text-slate-300 md:grid-cols-2">
                  <p>
                    <strong>{t.bank.owner}:</strong> <span dir="ltr">{transfer.owner_email ?? transfer.owner_id}</span>
                  </p>
                  <p>
                    <strong>{t.bank.dealAmount}:</strong>{' '}
                    {formatMoney(transfer.deal_amount, transfer.currency, locale, t.common.notAvailable)}
                  </p>
                  <p>
                    <strong>{t.bank.transferReference}:</strong>{' '}
                    <span dir="ltr">{transfer.transfer_reference ?? '—'}</span>
                  </p>
                  <p>
                    <strong>{t.bank.transferDate}:</strong> {formatDate(transfer.transfer_date, locale, '—')}
                  </p>
                  <p>
                    <strong>{t.bank.expectedNote}:</strong> <span dir="ltr">{transfer.expected_reference}</span>
                  </p>
                  <p className="break-all text-xs text-slate-400">{transfer.deal_id}</p>
                </div>

                {transfer.receipt_path ? (
                  <button
                    type="button"
                    className="rounded-lg border border-slate-600 !bg-transparent px-3 py-1 text-sm !text-amber-300"
                    onClick={() => void openReceipt(transfer.receipt_path as string)}
                  >
                    {t.bank.viewReceipt}
                  </button>
                ) : (
                  <p className="text-sm text-slate-400">{t.bank.noReceipt}</p>
                )}

                {rejectingId === transfer.payment_id ? (
                  <div className="space-y-2">
                    <label className="block text-sm text-slate-300">
                      {t.bank.rejectNote}
                      <textarea
                        className="mt-1"
                        rows={3}
                        maxLength={500}
                        value={note}
                        onChange={event => setNote(event.target.value)}
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn" disabled={busy} onClick={() => void reject(transfer)}>
                        {busy ? t.commissions.saving : t.bank.rejectSubmit}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-600 !bg-transparent px-4 py-2 !text-slate-300"
                        onClick={() => {
                          setRejectingId(null)
                          setNote('')
                        }}
                      >
                        {t.bank.cancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn" disabled={busy} onClick={() => void confirm(transfer)}>
                      {busy ? t.commissions.saving : t.bank.confirm}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-red-700 !bg-transparent px-4 py-2 !text-red-300"
                      disabled={busy}
                      onClick={() => {
                        setRejectingId(transfer.payment_id)
                        setNote('')
                        setError('')
                      }}
                    >
                      {t.bank.reject}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
