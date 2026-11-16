'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLocale, useT } from '@/lib/i18n/provider'
import { formatDateTime } from '@/lib/format'
import PageShell from '@/components/ui/PageShell'
import EmptyState from '@/components/ui/EmptyState'
import Alert from '@/components/ui/Alert'
import StatCard from '@/components/ui/StatCard'
import type { NexusUser } from '@/types/user'

export default function UsersPage() {
  const t = useT()
  const locale = useLocale()
  const [users, setUsers] = useState<NexusUser[]>([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      if (!supabase) throw new Error(t.users.unavailable)

      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!authData.user) throw new Error(t.users.loginAdmin)

      const { data, error: rpcError } = await supabase.rpc('nexus_admin_list_users')
      if (rpcError) {
        throw new Error(
          rpcError.message.toLowerCase().includes('access denied')
            ? t.users.accessDenied
            : rpcError.message
        )
      }

      setAuthorized(true)
      setUsers((data ?? []) as NexusUser[])
    } catch (err) {
      setAuthorized(false)
      setError(err instanceof Error ? err.message : t.users.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [t.users.accessDenied, t.users.loadFailed, t.users.loginAdmin, t.users.unavailable])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return users
    return users.filter(user =>
      user.email?.toLowerCase().includes(query) ||
      user.full_name?.toLowerCase().includes(query) ||
      user.id.toLowerCase().includes(query)
    )
  }, [users, search])

  const recentUsers = users.filter(user => {
    if (!user.created_at) return false
    const created = new Date(user.created_at).getTime()
    return Number.isFinite(created) && created >= Date.now() - 30 * 24 * 60 * 60 * 1000
  }).length

  const activeUsers = users.filter(user => user.last_sign_in_at !== null).length
  const withEmail = users.filter(user => Boolean(user.email)).length

  return (
    <PageShell
      title={t.users.title}
      intro={t.users.intro}
      backHref="/admin"
      backLabel={t.common.backToAdmin}
      actions={
        <button type="button" className="btn" onClick={() => void loadUsers()}>
          {loading ? t.common.loading : t.users.refresh}
        </button>
      }
    >
      {error ? <Alert tone="error" role="alert">{error}</Alert> : null}

      {loading ? (
        <p className="text-slate-400">{t.users.loading}</p>
      ) : authorized ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label={t.users.total} value={users.length} />
            <StatCard label={t.users.registeredRecently} value={recentUsers} tone="success" />
            <StatCard label={t.users.recentlyActive} value={activeUsers} tone="warning" />
          </div>
          <p className="text-sm text-slate-400">
            {t.users.withEmail}: {withEmail}
          </p>

          <div className="card space-y-4">
            <input
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={t.users.search}
              aria-label={t.users.search}
            />

            {filteredUsers.length === 0 ? (
              <EmptyState title={users.length === 0 ? t.users.none : t.users.empty} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start">
                  <thead>
                    <tr className="border-b border-slate-700 text-amber-300">
                      <th className="px-2 py-3 font-semibold">{t.users.name}</th>
                      <th className="px-2 py-3 font-semibold">{t.users.email}</th>
                      <th className="px-2 py-3 font-semibold">{t.users.registered}</th>
                      <th className="px-2 py-3 font-semibold">{t.users.lastSignIn}</th>
                      <th className="px-2 py-3 font-semibold">{t.users.userId}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="border-b border-slate-700">
                        <td className="px-2 py-3">{user.full_name || t.users.unnamed}</td>
                        <td className="px-2 py-3">{user.email || t.common.notAvailable}</td>
                        <td className="px-2 py-3">
                          {formatDateTime(user.created_at, locale, t.common.notAvailable)}
                        </td>
                        <td className="px-2 py-3">
                          {formatDateTime(user.last_sign_in_at, locale, t.common.notAvailable)}
                        </td>
                        <td className="px-2 py-3 font-mono text-sm text-slate-400">{user.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </PageShell>
  )
}
