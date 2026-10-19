
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Listing = {
  id: string
  title: string
  status: string
  created_at: string
}

export default function Dashboard() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [items, setItems] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    if (!supabase) {
      setMessage('Supabase is not configured.')
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const { data: { user }, error: authError } =
        await supabase.auth.getUser()

      if (authError || !user) {
        router.replace('/login')
        return
      }

      setEmail(user.email || '')
      setUserId(user.id)

      const { data, error } = await supabase
        .from('listings')
        .select('id,title,status,created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setItems(data || [])
      setMessage('')
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : 'Failed to load listings.'
      )
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    void load()
  }, [load])

  async function changeStatus(id: string, status: string) {
    if (!supabase || !userId) return

    setBusyId(id)
    setMessage('')

    try {
      const { data, error } = await supabase
        .from('listings')
        .update({ status })
        .eq('id', id)
        .eq('owner_id', userId)
        .select('id')

      if (error) throw error
      if (!data?.length) throw new Error('Update was not permitted.')

      setItems(prev =>
        prev.map(item =>
          item.id === id ? { ...item, status } : item
        )
      )
      setMessage(`Opportunity status updated to ${status}.`)
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : 'Update failed.'
      )
    } finally {
      setBusyId(null)
    }
  }

  async function deleteListing(id: string) {
    if (!supabase || !userId) return

    if (!window.confirm('Delete this opportunity permanently?')) {
      return
    }

    setBusyId(id)
    setMessage('')

    try {
      const { data, error } = await supabase
        .from('listings')
        .delete()
        .eq('id', id)
        .eq('owner_id', userId)
        .select('id')

      if (error) throw error
      if (!data?.length) throw new Error('Delete was not permitted.')

      setItems(prev => prev.filter(item => item.id !== id))
      setMessage('Opportunity deleted successfully.')
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : 'Delete failed.'
      )
    } finally {
      setBusyId(null)
    }
  }

  async function signOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) {
      setMessage(error.message)
      return
    }
    router.replace('/login')
    router.refresh()
  }

  const published = items.filter(
    item => item.status === 'published'
  ).length

  const drafts = items.filter(
    item => item.status === 'draft'
  ).length

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            My Dashboard
          </h1>
          <p className="text-slate-400 mt-2">{email}</p>
        </div>

        <Link href="/listings/new" className="btn">
          + New Opportunity
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-slate-400">Total Opportunities</p>
          <h2 className="text-3xl font-bold mt-2">
            {items.length}
          </h2>
        </div>

        <div className="card">
          <p className="text-slate-400">Published</p>
          <h2 className="text-3xl font-bold mt-2 text-green-400">
            {published}
          </h2>
        </div>

        <div className="card">
          <p className="text-slate-400">Drafts</p>
          <h2 className="text-3xl font-bold mt-2 text-yellow-400">
            {drafts}
          </h2>
        </div>
      </div>

      <h2 className="text-2xl font-bold">My Opportunities</h2>

      {message && (
        <p role="status" className="text-yellow-300">
          {message}
        </p>
      )}

      {loading ? (
        <p>Loading opportunities...</p>
      ) : items.length === 0 ? (
        <div className="card">
          <p>No opportunities found.</p>
          <Link href="/listings/new" className="btn mt-4">
            Create Your First Opportunity
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <div className="card" key={item.id}>
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">
                    {item.title}
                  </h3>
                  <p className="mt-2">
                    Status:{' '}
                    <span className={
                      item.status === 'published'
                        ? 'text-green-400'
                        : 'text-yellow-400'
                    }>
                      {item.status}
                    </span>
                  </p>
                  <p className="text-sm text-slate-400 mt-2">
                    Created: {new Date(
                      item.created_at
                    ).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {item.status === 'draft' && (
                    <button
                      disabled={busyId !== null}
                      onClick={() =>
                        changeStatus(item.id, 'published')
                      }
                    >
                      Publish
                    </button>
                  )}

                  {item.status === 'published' && (
                    <button
                      disabled={busyId !== null}
                      onClick={() =>
                        changeStatus(item.id, 'draft')
                      }
                    >
                      Unpublish
                    </button>
                  )}

                  <Link
                    href={`/listings/${item.id}/edit`}
                    className="btn"
                  >
                    Edit
                  </Link>

                  <button
                    disabled={busyId !== null}
                    onClick={() => deleteListing(item.id)}
                    className="!bg-red-600 !text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-6 border-t border-slate-700">
        <button onClick={signOut}>Sign Out</button>
      </div>
    </div>
  )
}
