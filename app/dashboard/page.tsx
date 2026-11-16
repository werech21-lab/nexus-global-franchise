'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { interpolate } from '@/lib/i18n'
import { useLocale, useT } from '@/lib/i18n/provider'
import { formatDate } from '@/lib/format'

type Listing = {
  id: string
  title: string
  status: string
  created_at: string
  rejection_reason?: string | null
}

function statusLabel(status: string, t: ReturnType<typeof useT>): string {
  if (status === 'published') return t.listingForm.statusPublished
  if (status === 'pending_review') return t.listingForm.statusPending
  if (status === 'rejected') return t.listingForm.statusRejected
  return t.listingForm.statusDraft
}

function statusClass(status: string): string {
  if (status === 'published') return 'text-green-400'
  if (status === 'pending_review') return 'text-sky-300'
  if (status === 'rejected') return 'text-rose-300'
  return 'text-amber-400'
}

export default function Dashboard() {
  const t = useT()
  const locale = useLocale()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [items, setItems] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function load() {
      if (!supabase) {
        setMessage(t.common.supabase)
        setLoading(false)
        return
      }

      const client = supabase
      const { data: authData } = await client.auth.getUser()

      if (!authData.user) {
        router.replace('/login')
        return
      }

      setEmail(authData.user.email || '')

      const { data: adminFlag } = await client.rpc('is_nexus_admin')
      setIsAdmin(adminFlag === true)

      const { data, error } = await client
        .from('listings')
        .select('id,title,status,created_at,rejection_reason')
        .eq('owner_id', authData.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        setMessage(error.message)
      } else {
        setItems(data || [])
      }

      setLoading(false)
    }

    void load()
  }, [router, t.common.supabase])

  async function updateStatus(id: string, status: 'draft' | 'pending_review') {
    if (!supabase) return

    setBusyId(id)
    setMessage('')

    const { data, error } = await supabase
      .from('listings')
      .update({ status })
      .eq('id', id)
      .select('id')
      .single()

    if (error || !data) {
      setMessage(error?.message || t.dashboard.updateFailed)
    } else {
      setItems(prev => prev.map(item => (item.id === id ? { ...item, status } : item)))
      setMessage(interpolate(t.listingForm.statusUpdated, { status: statusLabel(status, t) }))
    }

    setBusyId(null)
  }

  async function deleteListing(id: string) {
    if (!supabase) return
    if (!window.confirm(t.listingForm.deleteConfirm)) return

    setBusyId(id)
    setMessage('')

    const { data, error } = await supabase
      .from('listings')
      .delete()
      .eq('id', id)
      .select('id')
      .single()

    if (error || !data) {
      setMessage(error?.message || t.dashboard.deleteFailed)
    } else {
      setItems(prev => prev.filter(item => item.id !== id))
      setMessage(t.listingForm.deleted)
    }

    setBusyId(null)
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isOwner = items.length > 0
  const published = items.filter(item => item.status === 'published').length
  const drafts = items.filter(item => item.status === 'draft').length
  const pending = items.filter(item => item.status === 'pending_review').length
  const rejected = items.filter(item => item.status === 'rejected').length

  if (loading) {
    return <p className="py-12">{t.dashboard.loading}</p>
  }

  return (
    <section className="space-y-8 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t.dashboard.title}</h1>
          <p className="mt-2 text-blue-300">{email}</p>
          <p className="mt-2 text-slate-300">
            {isOwner ? t.dashboard.ownerIntro : t.dashboard.investorIntro}
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
          <Link href="/listings/new" className="btn w-full text-center sm:w-auto">
            {t.dashboard.newOpportunity}
          </Link>
          <Link href="/account" className="btn w-full text-center sm:w-auto">
            {t.dashboard.changePassword}
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {isOwner ? (
          <Link href="/dashboard/inquiries" className="btn w-full text-center sm:w-auto">
            {t.dashboard.inquiries}
          </Link>
        ) : null}
        <Link href="/dashboard/my-inquiries" className="btn w-full text-center sm:w-auto">
          {t.dashboard.myInquiries}
        </Link>
        <Link href="/dashboard/saved" className="btn w-full text-center sm:w-auto">
          {t.dashboard.saved}
        </Link>
        <Link href="/dashboard/deals" className="btn w-full text-center sm:w-auto">
          {t.dashboard.deals}
        </Link>
        <Link href="/dashboard/messages" className="btn w-full text-center sm:w-auto">
          {t.dashboard.messages}
        </Link>
        <Link href="/deal-protection" className="btn w-full text-center sm:w-auto">
          {t.dashboard.dealProtection}
        </Link>
        {isAdmin && (
          <Link href="/admin" className="btn w-full text-center sm:w-auto">
            {t.dashboard.admin}
          </Link>
        )}
      </div>

      {isOwner ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="card !p-4 sm:!p-6">
            <p className="text-blue-300">{t.dashboard.total}</p>
            <p className="mt-2 text-3xl font-bold">{items.length}</p>
          </div>
          <div className="card !p-4 sm:!p-6">
            <p className="text-blue-300">{t.dashboard.published}</p>
            <p className="mt-2 text-3xl font-bold text-green-400">{published}</p>
          </div>
          <div className="card !p-4 sm:!p-6">
            <p className="text-blue-300">{t.dashboard.pendingReview}</p>
            <p className="mt-2 text-3xl font-bold text-sky-300">{pending}</p>
          </div>
          <div className="card !p-4 sm:!p-6">
            <p className="text-blue-300">{t.dashboard.drafts}</p>
            <p className="mt-2 text-3xl font-bold text-amber-400">{drafts + rejected}</p>
          </div>
        </div>
      ) : (
        <div className="card space-y-3">
          <h2 className="text-xl font-bold">{t.dashboard.investorWorkspace}</h2>
          <p className="text-slate-300">{t.dashboard.noOwnerListings}</p>
        </div>
      )}

      <h2 className="text-2xl font-bold">
        {isOwner ? t.dashboard.myOpportunities : t.dashboard.investorWorkspace}
      </h2>

      {message && (
        <p className="text-amber-300" role="status">
          {message}
        </p>
      )}

      {isOwner && items.length === 0 && (
        <p className="text-slate-400">{t.dashboard.empty}</p>
      )}

      <div className="space-y-4">
        {items.map(item => (
          <div
            key={item.id}
            className="card flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
          >
            <div>
              <h3 className="text-xl font-bold">{item.title}</h3>
              <p className="mt-2">
                {t.dashboard.status}:{' '}
                <span className={statusClass(item.status)}>{statusLabel(item.status, t)}</span>
              </p>
              {item.status === 'rejected' && item.rejection_reason ? (
                <p className="mt-2 text-sm text-rose-300">
                  {t.listingForm.rejectionReason}: {item.rejection_reason}
                </p>
              ) : null}
              <p className="mt-2 text-sm text-slate-400">
                {t.listingForm.created}: {formatDate(item.created_at, locale)}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {item.status === 'published' || item.status === 'pending_review' ? (
                <button
                  className="btn w-full sm:w-auto"
                  disabled={busyId === item.id}
                  onClick={() => updateStatus(item.id, 'draft')}
                >
                  {item.status === 'published'
                    ? t.dashboard.unpublish
                    : t.dashboard.cancelReview}
                </button>
              ) : (
                <button
                  className="btn w-full sm:w-auto"
                  disabled={busyId === item.id}
                  onClick={() => updateStatus(item.id, 'pending_review')}
                >
                  {t.dashboard.submitReview}
                </button>
              )}

              <Link href={`/listings/${item.id}/edit`} className="btn w-full text-center sm:w-auto">
                {t.dashboard.edit}
              </Link>

              <button
                className="w-full rounded-lg bg-red-600 px-4 py-2 font-bold text-white disabled:opacity-50 sm:w-auto"
                disabled={busyId === item.id}
                onClick={() => deleteListing(item.id)}
              >
                {t.dashboard.delete}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-700 pt-6">
        <button onClick={signOut} className="btn w-full sm:w-auto">
          {t.dashboard.signOut}
        </button>
      </div>
    </section>
  )
}
