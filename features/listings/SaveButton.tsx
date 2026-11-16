'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useT } from '@/lib/i18n/provider'

export default function SaveButton({
  listingId,
  userId,
  initiallySaved,
}: {
  listingId: string
  userId: string | null
  initiallySaved: boolean
}) {
  const t = useT()
  const [saved, setSaved] = useState(initiallySaved)
  const [busy, setBusy] = useState(false)

  if (!userId) {
    return (
      <Link href={`/login?next=/listings/${listingId}`} className="btn">
        ♡ {t.listings.save}
      </Link>
    )
  }

  async function toggle() {
    if (!supabase || busy) return
    setBusy(true)
    try {
      if (saved) {
        const { error } = await supabase
          .from('saved_listings')
          .delete()
          .eq('listing_id', listingId)
          .eq('user_id', userId)
        if (!error) setSaved(false)
      } else {
        const { error } = await supabase.from('saved_listings').insert({
          listing_id: listingId,
          user_id: userId,
        })
        if (!error) setSaved(true)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={`btn ${saved ? '!bg-rose-500 !text-white' : ''}`}
      onClick={() => void toggle()}
      disabled={busy}
      aria-pressed={saved}
    >
      {saved ? `♥ ${t.listings.saved}` : `♡ ${t.listings.save}`}
    </button>
  )
}
