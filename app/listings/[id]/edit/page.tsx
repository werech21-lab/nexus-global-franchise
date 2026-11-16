'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import ListingForm from '@/components/listings/ListingForm'
import { supabase } from '@/lib/supabase'
import { useT } from '@/lib/i18n/provider'
import {
  isIndustry,
  isListingStatus,
  isOpportunityType,
  listingWritePayload,
  numberToInput,
  type ListingFormValues,
  type ListingImage,
} from '@/lib/listings'
import { syncListingImages } from '@/lib/listing-images'

const EDIT_COLUMNS =
  'id,title,description,country,city,opportunity_type,industry,investment_min,investment_max,franchise_fee,royalty_percent,years_in_business,currency,status,owner_id,rejection_reason,listing_images(id,path,sort_order,is_cover)'

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
        .select(EDIT_COLUMNS)
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
        const images = ((data.listing_images || []) as ListingImage[]).sort(
          (a, b) => a.sort_order - b.sort_order
        )
        const coverIndex = Math.max(
          0,
          images.findIndex(image => image.is_cover)
        )
        setInitialValues({
          title: data.title || '',
          description: data.description || '',
          country: data.country || 'Kuwait',
          city: data.city || '',
          opportunity_type: isOpportunityType(data.opportunity_type)
            ? data.opportunity_type
            : 'franchise',
          industry: isIndustry(data.industry) ? data.industry : '',
          investment_min: numberToInput(data.investment_min),
          investment_max: numberToInput(data.investment_max),
          franchise_fee: numberToInput(data.franchise_fee),
          royalty_percent: numberToInput(data.royalty_percent),
          years_in_business: numberToInput(data.years_in_business),
          currency: data.currency || 'KWD',
          status: isListingStatus(data.status) ? data.status : 'draft',
          imageFiles: [],
          coverIndex: coverIndex === -1 ? 0 : coverIndex,
          existingImages: images,
          removedImageIds: [],
        })
        if (data.status === 'rejected' && data.rejection_reason) {
          setMessage(`${t.listingForm.rejectionReason}: ${data.rejection_reason}`)
        }
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
  }, [id, router, t.listingForm.configure, t.listingForm.notFound, t.listingForm.notOwner, t.listingForm.rejectionReason])

  async function handleSubmit(values: ListingFormValues) {
    if (!supabase) {
      setMessage(t.listingForm.configure)
      return
    }

    setSubmitting(true)
    setMessage('')

    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) {
      router.replace(`/login?next=/listings/${id}/edit`)
      return
    }

    const nextStatus = values.status === 'pending_review' ? 'pending_review' : 'draft'
    const payload = listingWritePayload(values, nextStatus)

    const { data, error: updateError } = await supabase
      .from('listings')
      .update(payload)
      .eq('id', id)
      .select('id')
      .single()

    if (updateError || !data) {
      setSubmitting(false)
      setMessage(updateError?.message || t.listingForm.saveFailed)
      return
    }

    const images = await syncListingImages(supabase, id, authData.user.id, values)
    setSubmitting(false)

    if (images.error) {
      setMessage(images.error)
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
        <h1 className="text-2xl font-bold">{error || t.listingForm.notFound}</h1>
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
