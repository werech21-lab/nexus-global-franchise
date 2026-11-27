'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLocale, useT } from '@/lib/i18n/provider'
import { formatMoney } from '@/lib/format'
import Alert from '@/components/ui/Alert'

type Details = {
  amount: number
  currency: string
  reference: string
  review_note: string | null
  bank: {
    account_holder: string
    bank_name: string
    bank_name_ar: string
    account_number: string
    iban: string
    swift: string | null
  }
}

export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024
const RECEIPT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 80) || 'receipt'
}

function CopyRow({ label, value, copyLabel, copiedLabel }: {
  label: string
  value: string
  copyLabel: string
  copiedLabel: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt(label, value)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 py-2 last:border-b-0">
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="break-all font-semibold text-slate-100" dir="ltr">
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        className="rounded-lg border border-slate-600 !bg-transparent px-3 py-1 text-sm !text-amber-300"
      >
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  )
}

export default function BankTransferPanel({
  paymentId,
  onSubmitted,
}: {
  paymentId: string
  onSubmitted: () => void | Promise<void>
}) {
  const t = useT()
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [details, setDetails] = useState<Details | null>(null)
  const [error, setError] = useState('')
  const [transferRef, setTransferRef] = useState('')
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    if (details) return

    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/payments/bank-transfer/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId }),
      })
      const result = (await response.json().catch(() => null)) as
        | ({ ok?: boolean; error?: string } & Partial<Details>)
        | null
      if (!response.ok || !result?.ok || !result.bank) {
        const code = result?.error
        if (code === 'forbidden') throw new Error(t.deals.payForbidden)
        if (code === 'not_pending') throw new Error(t.deals.payNotPending)
        if (code === 'unauthorized') throw new Error(t.deals.loginRequired)
        throw new Error(t.bank.loadFailed)
      }
      setDetails(result as Details)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.bank.loadFailed)
    } finally {
      setLoading(false)
    }
  }

  function onFile(selected: File | null) {
    setError('')
    if (!selected) {
      setFile(null)
      return
    }
    if (!RECEIPT_TYPES.includes(selected.type)) {
      setError(t.bank.receiptType)
      setFile(null)
      return
    }
    if (selected.size > RECEIPT_MAX_BYTES) {
      setError(t.bank.receiptSize)
      setFile(null)
      return
    }
    setFile(selected)
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting || !supabase) return
    setError('')

    const reference = transferRef.trim()
    if (reference.length < 3) {
      setError(t.bank.referenceRequired)
      return
    }
    if (!transferDate) {
      setError(t.bank.dateRequired)
      return
    }

    setSubmitting(true)
    let uploadedPath: string | null = null
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) throw new Error(t.deals.loginRequired)

      if (file) {
        const path = `${authData.user.id}/${paymentId}/${crypto.randomUUID()}-${safeFileName(file.name)}`
        const { error: uploadError } = await supabase.storage
          .from('commission-receipts')
          .upload(path, file, { contentType: file.type, upsert: false })
        if (uploadError) throw new Error(t.bank.uploadFailed)
        uploadedPath = path
      }

      const { error: rpcError } = await supabase.rpc('submit_bank_transfer', {
        p_payment_id: paymentId,
        p_transfer_reference: reference,
        p_transfer_date: transferDate,
        p_receipt_path: uploadedPath,
      })
      if (rpcError) {
        if (uploadedPath) await supabase.storage.from('commission-receipts').remove([uploadedPath])
        if (/not pending/i.test(rpcError.message)) throw new Error(t.deals.payNotPending)
        if (/opportunity owner/i.test(rpcError.message)) throw new Error(t.deals.payForbidden)
        if (/date/i.test(rpcError.message)) throw new Error(t.bank.dateInvalid)
        throw new Error(t.bank.submitFailed)
      }

      setOpen(false)
      await onSubmitted()
    } catch (err) {
      setError(err instanceof Error ? err.message : t.bank.submitFailed)
    } finally {
      setSubmitting(false)
    }
  }

  const amountText = details
    ? formatMoney(details.amount, details.currency, locale, t.common.notAvailable)
    : ''

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="btn !bg-transparent !text-amber-300 border border-amber-400"
        aria-expanded={open}
        onClick={() => void toggle()}
      >
        {t.bank.button}
      </button>

      {open ? (
        <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/40 p-4">
          <h4 className="text-lg font-bold">{t.bank.title}</h4>

          {loading ? <p className="text-slate-400">{t.bank.loading}</p> : null}
          {error ? <Alert tone="error" role="alert">{error}</Alert> : null}

          {details ? (
            <>
              {details.review_note ? (
                <Alert tone="warning" role="status">
                  <strong>{t.bank.rejectedTitle}</strong> {details.review_note}
                </Alert>
              ) : null}

              <div className="rounded-lg border border-slate-700 p-3">
                <CopyRow
                  label={t.bank.accountHolder}
                  value={details.bank.account_holder}
                  copyLabel={t.bank.copy}
                  copiedLabel={t.bank.copied}
                />
                <CopyRow
                  label={t.bank.bankName}
                  value={locale === 'ar' ? details.bank.bank_name_ar : details.bank.bank_name}
                  copyLabel={t.bank.copy}
                  copiedLabel={t.bank.copied}
                />
                <CopyRow
                  label={t.bank.accountNumber}
                  value={details.bank.account_number}
                  copyLabel={t.bank.copy}
                  copiedLabel={t.bank.copied}
                />
                <CopyRow
                  label={t.bank.iban}
                  value={details.bank.iban}
                  copyLabel={t.bank.copy}
                  copiedLabel={t.bank.copied}
                />
                {details.bank.swift ? (
                  <CopyRow
                    label={t.bank.swift}
                    value={details.bank.swift}
                    copyLabel={t.bank.copy}
                    copiedLabel={t.bank.copied}
                  />
                ) : null}
                <CopyRow
                  label={t.bank.amountToTransfer}
                  value={amountText}
                  copyLabel={t.bank.copy}
                  copiedLabel={t.bank.copied}
                />
                <CopyRow
                  label={t.bank.transferNote}
                  value={details.reference}
                  copyLabel={t.bank.copy}
                  copiedLabel={t.bank.copied}
                />
              </div>

              <p className="text-sm text-slate-300">{t.bank.instructions}</p>
              {details.currency !== 'KWD' ? (
                <p className="text-sm text-amber-300">{t.bank.otherCurrency}</p>
              ) : null}

              <form onSubmit={event => void submit(event)} className="space-y-3 border-t border-slate-700 pt-4">
                <h5 className="font-bold">{t.bank.formTitle}</h5>
                <label className="block space-y-1 text-sm">
                  <span className="text-slate-300">{t.bank.transferReference}</span>
                  <input
                    value={transferRef}
                    onChange={event => setTransferRef(event.target.value)}
                    maxLength={100}
                    required
                    placeholder={t.bank.transferReferencePlaceholder}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="text-slate-300">{t.bank.transferDate}</span>
                  <input
                    type="date"
                    value={transferDate}
                    max={new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)}
                    onChange={event => setTransferDate(event.target.value)}
                    required
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="text-slate-300">{t.bank.receipt}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                    onChange={event => onFile(event.target.files?.[0] ?? null)}
                  />
                  <span className="text-xs text-slate-400">{t.bank.receiptHint}</span>
                </label>
                <button type="submit" className="btn" disabled={submitting}>
                  {submitting ? t.bank.submitting : t.bank.submit}
                </button>
              </form>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
