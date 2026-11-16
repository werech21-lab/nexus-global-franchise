
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import ListingForm from '@/components/listings/ListingForm'
import { supabase } from '@/lib/supabase'
import { useT } from '@/lib/i18n/provider'
import {
  isOpportunityType,
  type ListingFormValues,
  type ListingStatus,
} from '@/lib/listings'

export default function EditListingPage() {
  const params = useParams()
  const router = useRouter()
  const t = useT()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [initialValues, setInitialValues] = useState<ListingFormValues | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      if (!supabase) {
        if (active) {
          setError(t.listingForm.configure)
          setLoading(false)
        }
        return
      }

      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) {
        router.replace(`/login?next=/listings/${id}/edit`)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('listings')
        .select('id,title,description,country,opportunity_type,status,owner_id')
        .eq('id', id)
        .maybeSingle()

      if (!active) return

      if (fetchError) {
        setError(fetchError.message)
      } else if (!data) {
        setError(t.listingForm.notFound)
      } else if (data.owner_id !== authData.user.id) {
        setError(t.listingForm.notOwner)
      } else {
        setInitialValues({
          title: data.title || '',
          description: data.description || '',
          country: data.country || '',
          opportunity_type: isOpportunityType(data.opportunity_type)
            ? data.opportunity_type
            : 'franchise',
          status: data.status === 'published' ? 'published' : 'draft',
        })
      }

      setLoading(false)
    }

    if (id) {
      void load()
    } else {
      setError(t.listingForm.notFound)
      setLoading(false)
    }

    return () => {
      active = false
    }
  }, [id, router])

  async function handleSubmit(values: ListingFormValues) {
    if (!supabase) {
      setMessage(t.listingForm.configure)
      return
    }

    setSubmitting(true)
    setMessage('')

    const payload: {
      title: string
      description: string
      country: string
      opportunity_type: string
      status: ListingStatus
    } = {
      title: values.title,
      description: values.description,
      country: values.country,
      opportunity_type: values.opportunity_type,
      status: values.status,
    }

    const { data, error: updateError } = await supabase
      .from('listings')
      .update(payload)
      .eq('id', id)
      .select('id')
      .single()

    setSubmitting(false)

    if (updateError || !data) {
      setMessage(updateError?.message || t.listingForm.saveFailed)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  if (loading) {
    return <p className="py-12">{t.listingForm.loading}</p>
  }

  if (error || !initialValues) {
    return (
      <section className="space-y-5 py-12">
        <h1 className="text-2xl font-bold">
          {error || t.listingForm.notFound}
        </h1>
        <Link href="/dashboard" className="btn">
          {t.common.backToDashboard}
        </Link>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      <Link href="/dashboard" className="text-amber-300">
        {t.common.backToDashboard}
      </Link>
      <ListingForm
        key={id}
        mode="edit"
        initialValues={initialValues}
        submitting={submitting}
        message={message}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
