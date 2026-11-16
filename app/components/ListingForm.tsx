
'use client'

import { useState, type FormEvent } from 'react'
import { copy, opportunityTypeLabels } from '@/lib/copy'
import {
  OPPORTUNITY_TYPES,
  type ListingFormValues,
  type ListingStatus,
  type OpportunityType,
} from '@/lib/listings'

type Props = {
  mode: 'create' | 'edit'
  initialValues?: Partial<ListingFormValues>
  submitting?: boolean
  message?: string
  onSubmit: (values: ListingFormValues) => void | Promise<void>
}

export default function ListingForm({
  mode,
  initialValues,
  submitting = false,
  message,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [country, setCountry] = useState(initialValues?.country ?? '')
  const [type, setType] = useState<OpportunityType>(
    initialValues?.opportunity_type ?? 'franchise'
  )
  const [status, setStatus] = useState<ListingStatus>(
    initialValues?.status ?? 'draft'
  )
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const values: ListingFormValues = {
      title: title.trim(),
      description: description.trim(),
      country: country.trim(),
      opportunity_type: type,
      status,
    }

    if (values.title.length < 3 || values.title.length > 200) {
      setError(copy.listingForm.titleLength)
      return
    }
    if (values.description.length < 10 || values.description.length > 10000) {
      setError(copy.listingForm.descriptionLength)
      return
    }
    if (!values.country) {
      setError(copy.listingForm.countryRequired)
      return
    }

    await onSubmit(values)
  }

  const submitLabel =
    submitting
      ? copy.listingForm.saving
      : mode === 'create'
        ? copy.listingForm.saveDraft
        : copy.listingForm.saveChanges

  return (
    <form onSubmit={handleSubmit} className="card max-w-2xl space-y-4">
      <h1 className="text-3xl font-bold">
        {mode === 'create' ? copy.listingForm.newTitle : copy.listingForm.editTitle}
      </h1>

      <div>
        <label htmlFor="listing-title" className="mb-2 block">
          {copy.listingForm.titleLabel}
        </label>
        <input
          id="listing-title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={copy.listingForm.titlePlaceholder}
          required
          minLength={3}
          maxLength={200}
        />
      </div>

      <div>
        <label htmlFor="listing-type" className="mb-2 block">
          {copy.listingForm.typeLabel}
        </label>
        <select
          id="listing-type"
          value={type}
          onChange={e => setType(e.target.value as OpportunityType)}
        >
          {OPPORTUNITY_TYPES.map(value => (
            <option key={value} value={value}>
              {opportunityTypeLabels[value]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="listing-country" className="mb-2 block">
          {copy.listingForm.countryLabel}
        </label>
        <input
          id="listing-country"
          value={country}
          onChange={e => setCountry(e.target.value)}
          placeholder={copy.listingForm.countryPlaceholder}
          required
        />
      </div>

      <div>
        <label htmlFor="listing-description" className="mb-2 block">
          {copy.listingForm.descriptionLabel}
        </label>
        <textarea
          id="listing-description"
          rows={6}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={copy.listingForm.descriptionPlaceholder}
          required
          minLength={10}
          maxLength={10000}
        />
      </div>

      {mode === 'edit' && (
        <div>
          <label htmlFor="listing-status" className="mb-2 block">
            {copy.listingForm.statusLabel}
          </label>
          <select
            id="listing-status"
            value={status}
            onChange={e => setStatus(e.target.value as ListingStatus)}
          >
            <option value="draft">{copy.listingForm.statusDraft}</option>
            <option value="published">{copy.listingForm.statusPublished}</option>
          </select>
        </div>
      )}

      {(error || message) && (
        <p role="status" className="text-amber-300">
          {error || message}
        </p>
      )}

      <button type="submit" disabled={submitting}>
        {submitLabel}
      </button>
    </form>
  )
}
