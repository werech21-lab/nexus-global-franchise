'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ListingForm from '@/components/listings/ListingForm'
import { supabase } from '@/lib/supabase'
import { useT } from '@/lib/i18n/provider'
import { listingWritePayload, type ListingFormValues } from '@/lib/listings'
import { syncListingImages } from '@/lib/listing-images'

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

    const status = values.status === 'pending_review' ? 'pending_review' : 'draft'

    const { data, error } = await supabase
      .from('listings')
      .insert({
        owner_id: user.id,
        ...listingWritePayload(values, status === 'pending_review' ? 'draft' : 'draft'),
        status: 'draft',
      })
      .select('id')
      .single()

    if (error || !data) {
      setSubmitting(false)
      setMessage(error?.message || t.listingForm.saveFailed)
      return
    }

    const images = await syncListingImages(supabase, data.id, user.id, values)
    if (images.error) {
      setSubmitting(false)
      setMessage(images.error)
      return
    }

    if (status === 'pending_review') {
      const { error: reviewError } = await supabase
        .from('listings')
        .update({ status: 'pending_review' })
        .eq('id', data.id)
        .eq('owner_id', user.id)
      if (reviewError) {
        setSubmitting(false)
        setMessage(reviewError.message)
        return
      }
    }

    setSubmitting(false)
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
