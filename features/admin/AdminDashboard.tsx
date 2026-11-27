'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLocale, useT } from '@/lib/i18n/provider'
import { formatMoney } from '@/lib/format'
import PageShell from '@/components/ui/PageShell'
import Alert from '@/components/ui/Alert'
import StatCard from '@/components/ui/StatCard'
import BankTransfersPanel from './BankTransfersPanel'

type Deal = {
  id: string
  amount: number | null
  currency: string | null
  status: string
  commission_amount: number | null
}

type Commission = {
  id: string
  status: string
  deal_id: string
}

type Listing = {
  id: string
  status: string
}

export default function AdminDashboard() {
  const t = useT()
  const locale = useLocale()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [error, setError] = useState('')
  const [deals, setDeals] = useState<Deal[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [listings, setListings] = useState<Listing[]>([])

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      if (!supabase) throw new Error(t.common.supabase)

      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!authData.user) throw new Error(t.common.signInFirst)

      const { data: adminFlag, error: adminError } = await supabase.rpc('is_nexus_admin')
      if (adminError) throw adminError
      if (adminFlag !== true) throw new Error(t.common.adminRequired)

      setAuthorized(true)

      const [dealsResult, paymentsResult, listingsResult] = await Promise.all([
        supabase.from('deals').select('id, amount, currency, status, commission_amount'),
        supabase.from('commission_payments').select('id, status, deal_id'),
        supabase.from('listings').select('id, status'),
      ])

      if (dealsResult.error) throw dealsResult.error
      if (paymentsResult.error) throw paymentsResult.error
      if (listingsResult.error) throw listingsResult.error

      setDeals((dealsResult.data ?? []) as Deal[])
      setCommissions((paymentsResult.data ?? []) as Commission[])
      setListings((listingsResult.data ?? []) as Listing[])
    } catch (err) {
      setAuthorized(false)
      setError(err instanceof Error ? err.message : t.admin.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [t.admin.loadFailed, t.common.adminRequired, t.common.signInFirst, t.common.supabase])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const completedDeals = deals.filter(deal => deal.status === 'completed').length
  const pendingCommissions = commissions.filter(payment => payment.status === 'pending').length
  const paidCommissions = commissions.filter(payment => payment.status === 'paid').length
  const published = listings.filter(listing => listing.status === 'published').length
  const kwdDealValue = deals
    .filter(deal => deal.currency === 'KWD')
    .reduce((sum, deal) => sum + Number(deal.amount ?? 0), 0)
  const kwdCommission = deals
    .filter(deal => deal.currency === 'KWD')
    .reduce((sum, deal) => sum + Number(deal.commission_amount ?? 0), 0)

  const links = [
    { title: t.admin.commissionsTitle, body: t.admin.commissionsBody, href: '/admin/commissions' },
    { title: t.admin.dealsTitle, body: t.admin.dealsBody, href: '/dashboard/deals' },
    { title: t.admin.listingsTitle, body: t.admin.listingsBody, href: '/admin/listings' },
    { title: t.admin.opportunitiesTitle, body: t.admin.opportunitiesBody, href: '/dashboard' },
    { title: t.admin.usersTitle, body: t.admin.usersBody, href: '/admin/users' },
  ]

  return (
    <PageShell
      title={t.admin.title}
      intro={t.admin.intro}
      backHref="/dashboard"
      backLabel={t.common.backToDashboard}
      actions={
        <button type="button" className="btn" onClick={() => void loadDashboard()}>
          {t.admin.refresh}
        </button>
      }
    >
      {error ? <Alert tone="error" role="alert">{error}</Alert> : null}
      {authorized ? <Alert tone="success" role="status">{t.admin.authorized}</Alert> : null}

      {loading ? (
        <p className="text-slate-400">{t.admin.loading}</p>
      ) : authorized ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label={t.admin.totalDeals} value={deals.length} />
            <StatCard label={t.admin.completedDeals} value={completedDeals} tone="success" />
            <StatCard label={t.admin.pendingCommissions} value={pendingCommissions} tone="warning" />
            <StatCard label={t.admin.paidCommissions} value={paidCommissions} tone="success" />
            <StatCard label={t.admin.totalOpportunities} value={listings.length} />
            <StatCard label={t.admin.publishedOpportunities} value={published} tone="success" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <StatCard
              label={t.admin.kwdDealValue}
              value={formatMoney(kwdDealValue, 'KWD', locale)}
            />
            <StatCard
              label={t.admin.kwdCommission}
              value={formatMoney(kwdCommission, 'KWD', locale)}
              tone="warning"
            />
          </div>

          <BankTransfersPanel />

          <div>
            <h2 className="mb-4 text-2xl font-bold">{t.admin.management}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {links.map(link => (
                <Link key={link.href} href={link.href} className="card block hover:border-amber-400">
                  <h3 className="mb-3 text-xl font-bold">{link.title}</h3>
                  <p className="text-slate-400">{link.body}</p>
                  <p className="mt-4 font-semibold text-amber-300">{t.admin.open}</p>
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </PageShell>
  )
}
