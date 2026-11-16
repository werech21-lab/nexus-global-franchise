-- Audit fixes H1 + H2: limit which columns signed-in users can write.
-- Matches what the app writes (lib/listings.ts listingWritePayload,
-- app/listings/new, app/dashboard, features/listings/InquiryForm,
-- app/dashboard/inquiries). RLS policies are unchanged. SECURITY DEFINER
-- RPCs (admin_review_listing, accept_inquiry) are unaffected.
-- Note: a new column added later must be granted here explicitly
-- before the app can write it.

-- inquiries: investors insert their inquiry; listing owners change status only.
revoke insert, update on public.inquiries from anon, authenticated;
grant insert (listing_id, investor_id, message, status)
  on public.inquiries to authenticated;
grant update (status) on public.inquiries to authenticated;

-- listings: owners cannot write review fields (reviewed_by, reviewed_at,
-- rejection_reason), created_at, id, or reassign owner_id on update.
revoke insert, update on public.listings from anon, authenticated;
grant insert (
  owner_id, title, description, country, city, opportunity_type, industry,
  investment_min, investment_max, franchise_fee, royalty_percent,
  years_in_business, currency, status
) on public.listings to authenticated;
grant update (
  title, description, country, city, opportunity_type, industry,
  investment_min, investment_max, franchise_fee, royalty_percent,
  years_in_business, currency, status
) on public.listings to authenticated;
