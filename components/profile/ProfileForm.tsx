'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useT } from '@/lib/i18n/provider'

export default function ProfileForm({ userId }: { userId: string }) {
  const t = useT()
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      if (!supabase) {
        setError(t.common.supabase)
        setLoading(false)
        return
      }
      const { data, error: loadError } = await supabase
        .from('profiles')
        .select('display_name,bio')
        .eq('id', userId)
        .maybeSingle()
      if (!active) return
      if (loadError) setError(loadError.message)
      if (data) {
        setDisplayName(data.display_name || '')
        setBio(data.bio || '')
      }
      setLoading(false)
    }
    void load()
    return () => {
      active = false
    }
  }, [userId, t.common.supabase])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setSaving(true)
    setMessage('')
    setError('')
    const payload = {
      id: userId,
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
      updated_at: new Date().toISOString(),
    }
    const { error: saveError } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' })
    if (saveError) setError(saveError.message || t.profile.saveFailed)
    else setMessage(t.profile.saved)
    setSaving(false)
  }

  if (loading) return <p>{t.common.pleaseWait}</p>

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <h2 className="text-2xl font-bold">{t.profile.title}</h2>
      <p className="text-slate-300">{t.profile.intro}</p>
      <div>
        <label htmlFor="display-name" className="mb-2 block">
          {t.profile.displayName}
        </label>
        <input
          id="display-name"
          value={displayName}
          maxLength={80}
          onChange={event => setDisplayName(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="profile-bio" className="mb-2 block">
          {t.profile.bio}
        </label>
        <textarea
          id="profile-bio"
          rows={4}
          maxLength={1000}
          placeholder={t.profile.bioPlaceholder}
          value={bio}
          onChange={event => setBio(event.target.value)}
        />
      </div>
      {error ? <p className="text-rose-300">{error}</p> : null}
      {message ? <p className="text-green-300">{message}</p> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" disabled={saving} className="w-full sm:w-auto">
          {saving ? t.common.pleaseWait : t.profile.save}
        </button>
        <Link href={`/u/${userId}`} className="text-amber-300">
          {t.profile.publicPage}
        </Link>
      </div>
    </form>
  )
}
