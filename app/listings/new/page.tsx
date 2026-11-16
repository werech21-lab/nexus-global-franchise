
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ListingForm from '@/components/listings/ListingForm'
import { supabase } from '@/lib/supabase'
import { useT } from '@/lib/i18n/provider'
import type { ListingFormValues } from '@/lib/listings'

export default function NewListingPage() {
  const router = useRouter()
  const t = useT()
  const [ready, setReady] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true

    async function checkAuth() {
      if (!supabase) {
        if (active) setReady(true)
        return
      }

      const { data } = await supabase.auth.getUser()
      if (!active) return

      if (!data.user) {
        router.replace('/login?next=/listings/new')
        return
      }

      setSignedIn(true)
      setReady(true)
    }

    void checkAuth()
    return () => {
      active = false
    }
  }, [router])

  async function handleSubmit(values: ListingFormValues) {
    if (!supabase) {
      setMessage(t.listingForm.configure)
      return
    }

    setSubmitting(true)
    setMessage('')

    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    if (!user) {
      router.replace('/login?next=/listings/new')
      return
    }

    const { error } = await supabase.from('listings').insert({
      owner_id: user.id,
      title: values.title,
      description: values.description,
      country: values.country,
      opportunity_type: values.opportunity_type,
      status: 'draft',
    })

    setSubmitting(false)

    if (error) {
      setMessage(error.message)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  if (!ready) {
    return <p className="py-12">{t.listingForm.loading}</p>
  }

  if (!signedIn) {
    return (
      <section className="card max-w-2xl space-y-4">
        <h1 className="text-3xl font-bold">{t.listingForm.newTitle}</h1>
        <p>{t.listingForm.signInRequired}</p>
        <Link href="/login?next=/listings/new" className="btn">
          {t.listingForm.signInLink}
        </Link>
      </section>
    )
  }

  return (
    <ListingForm
      mode="create"
      submitting={submitting}
      message={message}
      onSubmit={handleSubmit}
    />
  )
}
