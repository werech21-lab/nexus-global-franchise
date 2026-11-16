'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLocale, useT } from '@/lib/i18n/provider'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/format'

type Inquiry = {
  id: string
  listing_id: string
  status: string | null
  created_at: string
  message?: string | null
}

export default function MyInquiriesPage() {
  const t = useT()
  const locale = useLocale()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [items, setItems] = useState<Inquiry[]>([])
  const [titles, setTitles] = useState<Record<string, string>>({})

  useEffect(() => {
    let active = true

    async function load() {
      if (!supabase) {
        setMessage(t.common.supabase)
        setLoading(false)
        return
      }

      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) {
        router.replace('/login?next=/dashboard/my-inquiries')
        return
      }

      const { data, error } = await supabase
        .from('inquiries')
        .select('id,listing_id,status,created_at,message')
        .eq('investor_id', authData.user.id)
        .order('created_at', { ascending: false })

      if (!active) return

      if (error) {
        setMessage(error.message)
        setLoading(false)
        return
      }

      const rows = (data || []) as Inquiry[]
      setItems(rows)

      const listingIds = [...new Set(rows.map(row => row.listing_id))]
      if (listingIds.length > 0) {
        const { data: listings } = await supabase
          .from('listings')
          .select('id,title')
          .in('id', listingIds)
        const map: Record<string, string> = {}
        ;(listings || []).forEach(listing => {
          map[listing.id] = listing.title
        })
        if (active) setTitles(map)
      }

      setLoading(false)
    }

    void load()
    return () => {
      active = false
    }
  }, [router, t.common.supabase])

  return (
    <section className="space-y-8 py-8">
      <div className="space-y-3">
        <Link href="/dashboard" className="text-amber-300">
          <span className="inline-block rtl:rotate-180">←</span> {t.common.backToDashboard}
        </Link>
        <h1 className="text-3xl font-bold">{t.myInquiries.title}</h1>
        <p className="text-slate-300">{t.myInquiries.intro}</p>
      </div>

      {loading ? (
        <p>{t.myInquiries.loading}</p>
      ) : (
        <>
          {message ? <p role="status" className="text-amber-300">{message}</p> : null}
          {items.length === 0 ? (
            <EmptyState title={t.myInquiries.empty} />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-700">
              <table className="min-w-full text-start text-sm">
                <thead className="bg-slate-900 text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-semibold">{t.myInquiries.listing}</th>
                    <th className="px-4 py-3 font-semibold">{t.myInquiries.status}</th>
                    <th className="px-4 py-3 font-semibold">{t.listingForm.created}</th>
                    <th className="px-4 py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-t border-slate-700">
                      <td className="px-4 py-3">
                        {titles[item.listing_id] || t.messagesIndex.unknownListing}
                      </td>
                      <td className="px-4 py-3">
                        {item.status || t.myInquiries.sent}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatDate(item.created_at, locale)}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/listings/${item.listing_id}`} className="text-amber-300">
                          {t.myInquiries.openListing}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  )
}
