-- 2026-11-02: inquiry to one supplier, quote fields, bookings, booking-gated reviews with supplier reply and reports,
-- and closing the publicly callable functions. Already folded into schema.sql; run this once on an existing database.

alter table public.requests add column vendor_id uuid references public.vendors on delete cascade;
alter table public.bids add column includes text check (length(includes) <= 2000),
  add column valid_until date not null default current_date + 7;
alter table public.reviews add column vendor_reply text check (length(vendor_reply) <= 1500),
  add column reported_at timestamptz;

-- What customer and supplier agreed. Price, terms and date are copied from the quote so later edits don't change the record.
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  bid_id uuid not null references public.bids on delete cascade,
  vendor_id uuid not null references public.vendors on delete cascade,
  customer_id uuid not null references public.profiles on delete cascade,
  price int not null,
  terms text not null,
  event_date date not null,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index bookings_one_live_per_bid on public.bookings (bid_id) where status <> 'cancelled';

alter table public.bookings enable row level security;

drop policy "requests visible to owner and matching vendors" on public.requests;
create policy "requests visible to owner and matching vendors" on public.requests for select
  using (
    customer_id = auth.uid() or public.is_admin() or public.i_bid_on(id)
    or (status = 'open' and expires_at > now() and (vendor_id = public.my_vendor_id() or (vendor_id is null and exists (
      select 1 from vendors v where v.owner_id = auth.uid() and v.status = 'approved' and v.category_id = any (category_ids)))))
  );
drop policy "customers review once" on public.reviews;
-- Only after a completed booking, which can only be completed once the event date has passed.
create policy "customers review after a completed booking" on public.reviews for insert
  with check (customer_id = auth.uid() and vendor_reply is null and reported_at is null and exists (
    select 1 from bookings b where b.customer_id = auth.uid() and b.vendor_id = reviews.vendor_id and b.status = 'completed'));
-- The vendor revises a quote (customer asked for changes); it shows as unseen again.
create function public.revise_bid(bid uuid, new_price int, new_message text, new_includes text, new_valid_until date) returns void
language plpgsql security definer set search_path = public as $$
begin
  update bids b set price = new_price, message = new_message, includes = new_includes, valid_until = new_valid_until, seen_at = null
  where b.id = bid and b.vendor_id = public.my_vendor_id()
    and exists (select 1 from requests r where r.id = b.request_id and r.status = 'open' and r.expires_at > now());
  if not found then raise exception 'cannot revise this quote' using errcode = '42501'; end if;
end $$;

create policy "bookings visible to both sides" on public.bookings for select
  using (customer_id = auth.uid() or public.is_admin()
    or exists (select 1 from vendors v where v.id = vendor_id and v.owner_id = auth.uid()));

-- The customer accepts a quote; the supplier then confirms. No insert/update policies: these functions are the only writers.
create function public.accept_bid(bid uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare b record; booking_id uuid;
begin
  select bids.*, r.customer_id, r.event_date into b from bids join requests r on r.id = bids.request_id
  where bids.id = bid and r.customer_id = auth.uid();
  if not found then raise exception 'not your request' using errcode = '42501'; end if;
  if b.valid_until < current_date then raise exception 'quote expired' using errcode = 'P0001'; end if;
  if b.event_date is null then raise exception 'request has no event date' using errcode = 'P0002'; end if;
  insert into bookings (bid_id, vendor_id, customer_id, price, terms, event_date)
  values (b.id, b.vendor_id, b.customer_id, b.price, concat_ws(E'\n\n', b.message, b.includes), b.event_date)
  returning id into booking_id;
  return booking_id;
end $$;

create function public.set_booking_status(booking uuid, new_status text) returns void
language plpgsql security definer set search_path = public as $$
declare bk bookings; is_vendor boolean;
begin
  select * into bk from bookings where id = booking;
  if not found then raise exception 'no such booking' using errcode = '42501'; end if;
  is_vendor := exists (select 1 from vendors where id = bk.vendor_id and owner_id = auth.uid());
  if not (public.is_admin()
    or (is_vendor and bk.status = 'requested' and new_status in ('confirmed', 'cancelled'))
    or ((is_vendor or bk.customer_id = auth.uid()) and bk.status = 'confirmed' and new_status = 'cancelled')
    or (bk.customer_id = auth.uid() and bk.status = 'requested' and new_status = 'cancelled')
    or ((is_vendor or bk.customer_id = auth.uid()) and bk.status = 'confirmed' and new_status = 'completed' and bk.event_date <= current_date))
  then raise exception 'not allowed' using errcode = '42501'; end if;
  update bookings set status = new_status, updated_at = now() where id = booking;
end $$;

-- Suppliers with a confirmed booking on a date; search hides them for that date.
create function public.busy_vendor_ids(d date) returns setof uuid
language sql stable security definer set search_path = public as $$
  select vendor_id from bookings where event_date = d and status = 'confirmed'
$$;

-- The supplier replies once, publicly.
create function public.reply_review(review uuid, reply text) returns void
language sql security definer set search_path = public as $$
  update reviews set vendor_reply = left(reply, 1500) where id = review and vendor_reply is null
    and vendor_id in (select id from vendors where owner_id = auth.uid())
$$;

-- Any signed-in user can flag a review; flagged reviews show on the admin page.
create function public.report_review(review uuid) returns void
language sql security definer set search_path = public as $$
  update reviews set reported_at = now() where id = review and reported_at is null and auth.uid() is not null
$$;

-- Supabase lets anyone call public functions over /rest/v1/rpc. Trigger code must not be callable at all,
-- and actions are for signed-in users only. The helpers used inside policies stay callable: they only answer about the caller.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.close_request(uuid), public.mark_bids_seen(uuid), public.revise_bid(uuid, int, text, text, date),
  public.accept_bid(uuid), public.set_booking_status(uuid, text), public.reply_review(uuid, text), public.report_review(uuid) from public, anon;
grant execute on function public.close_request(uuid), public.mark_bids_seen(uuid), public.revise_bid(uuid, int, text, text, date),
  public.accept_bid(uuid), public.set_booking_status(uuid, text), public.reply_review(uuid, text), public.report_review(uuid) to authenticated;

-- Added from the Supabase dashboard; it is an event-trigger helper and should not be callable over the API.
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
