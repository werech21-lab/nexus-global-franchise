
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
        .select('id,title,status,created_at')
        .eq('owner_id', authData.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        setMessage(error.message)
      } else {
        setItems(data || [])
      }

      setLoading(false)
    }

    load()
  }, [router])

  async function updateStatus(id: string, status: string) {
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
      setItems(prev =>
        prev.map(item =>
          item.id === id ? { ...item, status } : item
        )
      )
      setMessage(interpolate(t.listingForm.statusUpdated, { status }))
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

  const published = items.filter(
    item => item.status === 'published'
  ).length

  const drafts = items.filter(
    item => item.status === 'draft'
  ).length

  if (loading) {
    return <p className="py-12">{t.dashboard.loading}</p>
  }

  return (
    <section className="space-y-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t.dashboard.title}</h1>
          <p className="mt-2 text-blue-300">{email}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/listings/new" className="btn">
            {t.dashboard.newOpportunity}
          </Link>
          <Link href="/account" className="btn">
            {t.dashboard.changePassword}
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/inquiries" className="btn">
          {t.dashboard.inquiries}
        </Link>
        <Link href="/dashboard/deals" className="btn">
          {t.dashboard.deals}
        </Link>
        <Link href="/dashboard/messages" className="btn">
          {t.dashboard.messages}
        </Link>
        <Link href="/deal-protection" className="btn">
          {t.dashboard.dealProtection}
        </Link>
        {isAdmin && (
          <Link href="/admin" className="btn">
            {t.dashboard.admin}
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <p className="text-blue-300">{t.dashboard.total}</p>
          <p className="mt-2 text-3xl font-bold">{items.length}</p>
        </div>

        <div className="card">
          <p className="text-blue-300">{t.dashboard.published}</p>
          <p className="mt-2 text-3xl font-bold text-green-400">
            {published}
          </p>
        </div>

        <div className="card">
          <p className="text-blue-300">{t.dashboard.drafts}</p>
          <p className="mt-2 text-3xl font-bold text-amber-400">
            {drafts}
          </p>
        </div>
      </div>

      <h2 className="text-2xl font-bold">{t.dashboard.myOpportunities}</h2>

      {message && (
        <p className="text-amber-300" role="status">{message}</p>
      )}

      {items.length === 0 && (
        <p className="text-slate-400">{t.dashboard.empty}</p>
      )}

      <div className="space-y-4">
        {items.map(item => (
          <div
            key={item.id}
            className="card flex flex-wrap items-center justify-between gap-4"
          >
            <div>
              <h3 className="text-xl font-bold">{item.title}</h3>

              <p className="mt-2">
                {t.dashboard.status}:{' '}
                <span className={
                  item.status === 'published'
                    ? 'text-green-400'
                    : 'text-amber-400'
                }>
                  {item.status === 'published' ? t.listingForm.statusPublished : t.listingForm.statusDraft}
                </span>
              </p>

              <p className="mt-2 text-sm text-slate-400">
                {t.listingForm.created}:{' '}
                {formatDate(item.created_at, locale)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="btn"
                disabled={busyId === item.id}
                onClick={() =>
                  updateStatus(
                    item.id,
                    item.status === 'published' ? 'draft' : 'published'
                  )
                }
              >
                {item.status === 'published' ? t.dashboard.unpublish : t.dashboard.publish}
              </button>

              <Link
                href={`/listings/${item.id}/edit`}
                className="btn"
              >
                {t.dashboard.edit}
              </Link>

              <button
                className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white disabled:opacity-50"
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
        <button onClick={signOut} className="btn">
          {t.dashboard.signOut}
        </button>
      </div>
    </section>
  )
}
