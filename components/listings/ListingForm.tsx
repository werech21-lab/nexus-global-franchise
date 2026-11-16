'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useT } from '@/lib/i18n/provider'
import { interpolate } from '@/lib/i18n'
import {
  COUNTRIES,
  INDUSTRIES,
  MAX_LISTING_IMAGES,
  OPPORTUNITY_TYPES,
  emptyListingFormValues,
  listingImageUrl,
  toOptionalNumber,
  type Industry,
  type ListingFormValues,
  type ListingImage,
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
  const t = useT()
  const defaults = { ...emptyListingFormValues(), ...initialValues }
  const [title, setTitle] = useState(defaults.title)
  const [description, setDescription] = useState(defaults.description)
  const [country, setCountry] = useState(defaults.country || 'Kuwait')
  const [city, setCity] = useState(defaults.city)
  const [type, setType] = useState<OpportunityType>(defaults.opportunity_type)
  const [industry, setIndustry] = useState<Industry | ''>(defaults.industry)
  const [investmentMin, setInvestmentMin] = useState(defaults.investment_min)
  const [investmentMax, setInvestmentMax] = useState(defaults.investment_max)
  const [franchiseFee, setFranchiseFee] = useState(defaults.franchise_fee)
  const [royalty, setRoyalty] = useState(defaults.royalty_percent)
  const [years, setYears] = useState(defaults.years_in_business)
  const [currency, setCurrency] = useState(defaults.currency || 'KWD')
  const [existingImages, setExistingImages] = useState<ListingImage[]>(
    defaults.existingImages || []
  )
  const [removedImageIds, setRemovedImageIds] = useState<string[]>(
    defaults.removedImageIds || []
  )
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [filePreviews, setFilePreviews] = useState<string[]>([])
  const [coverIndex, setCoverIndex] = useState(defaults.coverIndex || 0)
  const [error, setError] = useState('')

  const visibleExisting = useMemo(
    () => existingImages.filter(image => !removedImageIds.includes(image.id)),
    [existingImages, removedImageIds]
  )
  const previews = [
    ...visibleExisting.map(image => listingImageUrl(image) || ''),
    ...filePreviews,
  ]
  const currentStatus = (initialValues?.status || 'draft') as ListingStatus

  function buildValues(status: ListingStatus): ListingFormValues {
    return {
      title: title.trim(),
      description: description.trim(),
      country,
      city: city.trim(),
      opportunity_type: type,
      industry,
      investment_min: investmentMin,
      investment_max: investmentMax,
      franchise_fee: franchiseFee,
      royalty_percent: royalty,
      years_in_business: years,
      currency,
      status,
      imageFiles,
      coverIndex,
      existingImages,
      removedImageIds,
    }
  }

  function validate(values: ListingFormValues): string | null {
    if (values.title.length < 3 || values.title.length > 200) {
      return t.listingForm.titleLength
    }
    if (values.description.length < 10 || values.description.length > 10000) {
      return t.listingForm.descriptionLength
    }
    if (!values.country) return t.listingForm.countryRequired
    if (!values.city) return t.listingForm.cityRequired
    if (!values.industry) return t.listingForm.industryRequired
    const min = toOptionalNumber(values.investment_min)
    const max = toOptionalNumber(values.investment_max)
    if (
      (values.investment_min && min === null) ||
      (values.investment_max && max === null) ||
      (min !== null && max !== null && min > max)
    ) {
      return t.listingForm.investmentInvalid
    }
    const total = visibleExisting.length + values.imageFiles.length
    if (total > MAX_LISTING_IMAGES) {
      return interpolate(t.listingForm.tooManyImages, { max: MAX_LISTING_IMAGES })
    }
    return null
  }

  async function submitWithStatus(status: ListingStatus) {
    setError('')
    const values = buildValues(status)
    const issue = validate(values)
    if (issue) {
      setError(issue)
      return
    }
    await onSubmit(values)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await submitWithStatus('draft')
  }

  function onFilesSelected(files: FileList | null) {
    if (!files) return
    const images = Array.from(files).filter(file => file.type.startsWith('image/'))
    if (images.length !== files.length) {
      setError(t.listingForm.imageType)
    }
    const room = MAX_LISTING_IMAGES - visibleExisting.length - imageFiles.length
    if (images.length > room) {
      setError(interpolate(t.listingForm.tooManyImages, { max: MAX_LISTING_IMAGES }))
    }
    const accepted = images.slice(0, Math.max(0, room))
    setImageFiles(current => [...current, ...accepted])
    setFilePreviews(current => [
      ...current,
      ...accepted.map(file => URL.createObjectURL(file)),
    ])
  }

  function removeExisting(id: string) {
    setRemovedImageIds(current => [...current, id])
    setCoverIndex(0)
  }

  function removeFile(index: number) {
    setImageFiles(current => current.filter((_, i) => i !== index))
    setFilePreviews(current => {
      const url = current[index]
      if (url) URL.revokeObjectURL(url)
      return current.filter((_, i) => i !== index)
    })
    setCoverIndex(0)
  }

  return (
    <form onSubmit={handleSubmit} className="card max-w-3xl space-y-4">
      <h1 className="text-3xl font-bold">
        {mode === 'create' ? t.listingForm.newTitle : t.listingForm.editTitle}
      </h1>

      {currentStatus === 'pending_review' ? (
        <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200">
          {t.listingForm.pendingHint}
        </p>
      ) : null}
      {currentStatus === 'rejected' ? (
        <p className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-200">
          {t.listingForm.rejectedHint}
        </p>
      ) : null}

      <div>
        <label htmlFor="listing-title" className="mb-2 block">
          {t.listingForm.titleLabel}
        </label>
        <input
          id="listing-title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={t.listingForm.titlePlaceholder}
          required
          minLength={3}
          maxLength={200}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="listing-type" className="mb-2 block">
            {t.listingForm.typeLabel}
          </label>
          <select
            id="listing-type"
            value={type}
            onChange={e => setType(e.target.value as OpportunityType)}
          >
            {OPPORTUNITY_TYPES.map(value => (
              <option key={value} value={value}>
                {t.types[value]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="listing-industry" className="mb-2 block">
            {t.listingForm.industryLabel}
          </label>
          <select
            id="listing-industry"
            value={industry}
            onChange={e => setIndustry(e.target.value as Industry | '')}
            required
          >
            <option value="">{t.listingForm.industryPlaceholder}</option>
            {INDUSTRIES.map(value => (
              <option key={value} value={value}>
                {t.industries[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="listing-country" className="mb-2 block">
            {t.listingForm.countryLabel}
          </label>
          <select
            id="listing-country"
            value={country}
            onChange={e => setCountry(e.target.value)}
            required
          >
            {COUNTRIES.map(value => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="listing-city" className="mb-2 block">
            {t.listingForm.cityLabel}
          </label>
          <input
            id="listing-city"
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder={t.listingForm.cityPlaceholder}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="listing-currency" className="mb-2 block">
            {t.listingForm.currencyLabel}
          </label>
          <select
            id="listing-currency"
            value={currency}
            onChange={e => setCurrency(e.target.value)}
          >
            {['KWD', 'SAR', 'AED', 'QAR', 'BHD', 'OMR', 'USD', 'EUR', 'GBP'].map(
              value => (
                <option key={value} value={value}>
                  {value}
                </option>
              )
            )}
          </select>
        </div>
        <div>
          <label htmlFor="listing-years" className="mb-2 block">
            {t.listingForm.yearsLabel}
          </label>
          <input
            id="listing-years"
            type="number"
            min={0}
            value={years}
            onChange={e => setYears(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="listing-min" className="mb-2 block">
            {t.listingForm.investmentMinLabel}
          </label>
          <input
            id="listing-min"
            type="number"
            min={0}
            step="0.001"
            value={investmentMin}
            onChange={e => setInvestmentMin(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="listing-max" className="mb-2 block">
            {t.listingForm.investmentMaxLabel}
          </label>
          <input
            id="listing-max"
            type="number"
            min={0}
            step="0.001"
            value={investmentMax}
            onChange={e => setInvestmentMax(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="listing-fee" className="mb-2 block">
            {t.listingForm.franchiseFeeLabel}
          </label>
          <input
            id="listing-fee"
            type="number"
            min={0}
            step="0.001"
            value={franchiseFee}
            onChange={e => setFranchiseFee(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="listing-royalty" className="mb-2 block">
            {t.listingForm.royaltyLabel}
          </label>
          <input
            id="listing-royalty"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={royalty}
            onChange={e => setRoyalty(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label htmlFor="listing-description" className="mb-2 block">
          {t.listingForm.descriptionLabel}
        </label>
        <textarea
          id="listing-description"
          rows={6}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={t.listingForm.descriptionPlaceholder}
          required
          minLength={10}
          maxLength={10000}
        />
      </div>

      <div>
        <p className="mb-2 font-semibold">{t.listingForm.imagesLabel}</p>
        <p className="mb-3 text-sm text-slate-400">
          {interpolate(t.listingForm.imagesHint, { max: MAX_LISTING_IMAGES })}
        </p>
        <input
          id="listing-images"
          type="file"
          accept="image/*"
          multiple
          onChange={event => onFilesSelected(event.target.files)}
        />
        {previews.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {visibleExisting.map((image, index) => (
              <figure key={image.id} className="relative overflow-hidden rounded-xl border border-slate-600">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={listingImageUrl(image) || ''} alt="" className="aspect-square w-full object-cover" />
                <figcaption className="flex items-center justify-between gap-1 p-2 text-xs">
                  <button type="button" className="!px-2 !py-1 !text-xs" onClick={() => setCoverIndex(index)}>
                    {coverIndex === index ? t.listingForm.cover : t.listingForm.setCover}
                  </button>
                  <button type="button" className="!bg-rose-700 !px-2 !py-1 !text-xs !text-white" onClick={() => removeExisting(image.id)}>
                    {t.listingForm.removeImage}
                  </button>
                </figcaption>
              </figure>
            ))}
            {imageFiles.map((file, index) => {
              const coverPos = visibleExisting.length + index
              return (
                <figure key={`${file.name}-${index}`} className="relative overflow-hidden rounded-xl border border-slate-600">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={filePreviews[index]} alt="" className="aspect-square w-full object-cover" />
                  <figcaption className="flex items-center justify-between gap-1 p-2 text-xs">
                    <button type="button" className="!px-2 !py-1 !text-xs" onClick={() => setCoverIndex(coverPos)}>
                      {coverIndex === coverPos ? t.listingForm.cover : t.listingForm.setCover}
                    </button>
                    <button type="button" className="!bg-rose-700 !px-2 !py-1 !text-xs !text-white" onClick={() => removeFile(index)}>
                      {t.listingForm.removeImage}
                    </button>
                  </figcaption>
                </figure>
              )
            })}
          </div>
        ) : null}
      </div>

      {(error || message) && (
        <p role="status" className="text-amber-300">
          {error || message}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={submitting} className="w-full sm:w-auto">
          {submitting ? t.listingForm.saving : t.listingForm.saveDraft}
        </button>
        <button
          type="button"
          disabled={submitting}
          className="w-full sm:w-auto"
          onClick={() => void submitWithStatus('pending_review')}
        >
          {submitting ? t.listingForm.saving : t.listingForm.submitReview}
        </button>
      </div>
    </form>
  )
}
