'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLocale, useT } from '@/lib/i18n/provider'
import PageShell from '@/components/ui/PageShell'
import EmptyState from '@/components/ui/EmptyState'
import Alert from '@/components/ui/Alert'
import { formatDate } from '@/lib/format'

type Row = {
  id: string
  title: string
  status: string
  country: string | null
  city: string | null
  industry: string | null
  created_at: string
  rejection_reason: string | null
  owner_id: string
}

export default function ListingsModeration() {
  const t = useT()
  const locale = useLocale()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [pendingOnly, setPendingOnly] = useState(true)
  const [items, setItems] = useState<Row[]>([])
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    if (!supabase) {
      setError(t.common.supabase)
      setLoading(false)
      return
    }

    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) {
      router.replace('/login?next=/admin/listings')
      return
    }

    const { data: adminFlag, error: adminError } = await supabase.rpc('is_nexus_admin')
    if (adminError || adminFlag !== true) {
      setAuthorized(false)
      setError(t.admin.loadFailed)
      setLoading(false)
      return
    }

    setAuthorized(true)
    let query = supabase
      .from('listings')
      .select('id,title,status,country,city,industry,created_at,rejection_reason,owner_id')
      .order('created_at', { ascending: false })
    if (pendingOnly) query = query.eq('status', 'pending_review')

    const { data, error: listError } = await query
    if (listError) setError(listError.message)
    else setItems((data || []) as Row[])
    setLoading(false)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOnly])

  async function review(id: string, action: 'approve' | 'reject') {
    if (!supabase || busyId) return
    const reason = (reasons[id] || '').trim()
    if (action === 'reject' && reason.length < 3) {
      setError(t.admin.reasonRequired)
      return
    }
    setBusyId(id)
    setError('')
    setMessage('')
    const { error: rpcError } = await supabase.rpc('admin_review_listing', {
      p_listing_id: id,
      p_action: action,
      p_reason: action === 'reject' ? reason : null,
    })
    if (rpcError) {
      setError(rpcError.message)
    } else {
      setMessage(action === 'approve' ? t.admin.approvedOk : t.admin.rejectedOk)
      await load()
    }
    setBusyId(null)
  }

  return (
    <PageShell
      title={t.admin.listingsTitle}
      intro={t.admin.listingsBody}
      backHref="/admin"
      backLabel={t.admin.title}
    >
      {error ? <Alert tone="error">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn"
          onClick={() => setPendingOnly(true)}
          disabled={pendingOnly}
        >
          {t.admin.pendingOnly}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setPendingOnly(false)}
          disabled={!pendingOnly}
        >
          {t.admin.allListings}
        </button>
      </div>

      {loading ? (
        <p>{t.admin.loading}</p>
      ) : !authorized ? null : items.length === 0 ? (
        <EmptyState title={t.admin.noPending} />
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.id} className="card space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold">{item.title}</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {item.status} · {[item.city, item.country].filter(Boolean).join(', ')} ·{' '}
                    {formatDate(item.created_at, locale)}
                  </p>
                </div>
                <Link href={`/listings/${item.id}`} className="text-amber-300">
                  {t.listings.view}
                </Link>
              </div>
              {item.status === 'pending_review' ? (
                <div className="space-y-3">
                  <textarea
                    rows={2}
                    placeholder={t.admin.rejectReason}
                    value={reasons[item.id] || ''}
                    onChange={event =>
                      setReasons(current => ({ ...current, [item.id]: event.target.value }))
                    }
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      className="btn"
                      disabled={busyId === item.id}
                      onClick={() => void review(item.id, 'approve')}
                    >
                      {t.admin.approve}
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-lg bg-rose-700 px-4 py-2 font-bold text-white sm:w-auto"
                      disabled={busyId === item.id}
                      onClick={() => void review(item.id, 'reject')}
                    >
                      {t.admin.reject}
                    </button>
                  </div>
                </div>
              ) : item.rejection_reason ? (
                <p className="text-sm text-rose-300">
                  {t.listingForm.rejectionReason}: {item.rejection_reason}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </PageShell>
  )
}
