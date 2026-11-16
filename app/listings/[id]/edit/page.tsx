
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import ListingForm from '@/app/components/ListingForm'
import { supabase } from '@/lib/supabase'
import { copy } from '@/lib/copy'
import {
  isOpportunityType,
  type ListingFormValues,
  type ListingStatus,
} from '@/lib/listings'

export default function EditListingPage() {
  const params = useParams()
  const router = useRouter()
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
          setError(copy.listingForm.configure)
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
        setError(copy.listingForm.notFound)
      } else if (data.owner_id !== authData.user.id) {
        setError(copy.listingForm.notOwner)
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
      setError(copy.listingForm.notFound)
      setLoading(false)
    }

    return () => {
      active = false
    }
  }, [id, router])

  async function handleSubmit(values: ListingFormValues) {
    if (!supabase) {
      setMessage(copy.listingForm.configure)
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
      setMessage(updateError?.message || 'Update failed.')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  if (loading) {
    return <p className="py-12">{copy.listingForm.loading}</p>
  }

  if (error || !initialValues) {
    return (
      <section className="space-y-5 py-12">
        <h1 className="text-2xl font-bold">
          {error || copy.listingForm.notFound}
        </h1>
        <Link href="/dashboard" className="btn">
          {copy.listingForm.back}
        </Link>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      <Link href="/dashboard" className="text-amber-300">
        ← {copy.listingForm.back}
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
