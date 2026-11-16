-- Phase 3: admin listing approve / reject RPC.
-- APPLY MANUALLY. Idempotent. Requires public.is_nexus_admin().

create or replace function public.admin_review_listing(
  p_listing_id uuid,
  p_action text,
  p_reason text default null
)
returns public.listings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.listings;
  v_status text;
  v_reason text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if public.is_nexus_admin() is not true then
    raise exception 'Administrator access required';
  end if;

  if p_action not in ('approve', 'reject') then
    raise exception 'Action must be approve or reject';
  end if;

  select * into v_listing from public.listings where id = p_listing_id for update;
  if v_listing.id is null then
    raise exception 'Listing not found';
  end if;

  if p_action = 'approve' then
    v_status := 'published';
    v_reason := null;
  else
    if p_reason is null or length(trim(p_reason)) < 3 then
      raise exception 'A rejection reason is required';
    end if;
    v_status := 'rejected';
    v_reason := trim(p_reason);
  end if;

  update public.listings
    set status = v_status,
        rejection_reason = v_reason,
        reviewed_at = now(),
        reviewed_by = auth.uid()
    where id = p_listing_id
  returning * into v_listing;

  return v_listing;
end;
$$;

revoke all on function public.admin_review_listing(uuid, text, text) from public;
grant execute on function public.admin_review_listing(uuid, text, text) to authenticated;
