-- Glimsey database schema. Run once in the Supabase SQL editor (or `supabase db push`).
-- Row Level Security is the security boundary: the browser talks to the database directly.

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'customer' check (role in ('customer', 'vendor', 'admin')),
  full_name text,
  created_at timestamptz not null default now()
);

-- Create a profile for every new sign-up. Role comes from sign-up metadata, but never 'admin'.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    case when new.raw_user_meta_data->>'role' = 'vendor' then 'vendor' else 'customer' end,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
$$;

create table public.categories (
  id int primary key,
  name_ar text not null,
  name_en text not null
);

insert into public.categories (id, name_ar, name_en) values
  (1, 'القاعات والأماكن', 'Venues'),
  (2, 'الديكور والتنسيق', 'Decor & Styling'),
  (3, 'الأثاث والخيام والمعدات', 'Furniture, Tents & Rental Equipment'),
  (4, 'الضيافة والتموين', 'Catering'),
  (5, 'تنظيم الفعاليات', 'Event Management'),
  (6, 'المكياج والشعر', 'Makeup & Hair'),
  (7, 'التصوير الفوتوغرافي والفيديو', 'Photography & Videography'),
  (8, 'الترفيه', 'Entertainment'),
  (9, 'الصوت والإضاءة والشاشات', 'Sound, Lighting & AV Production'),
  (10, 'النقل', 'Transportation'),
  (11, 'الدعوات والهدايا', 'Invitations & Stationery'),
  (12, 'الأمن والفاليه وخدمة الضيوف', 'Security, Valet & Guest Services');

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles on delete cascade,
  business_name text not null check (length(business_name) between 2 and 120),
  category_id int not null references public.categories,
  city text not null,
  description text check (length(description) <= 3000),
  whatsapp text not null check (whatsapp ~ '^9665[0-9]{8}$'),
  price_tier text not null default 'mid' check (price_tier in ('budget', 'mid', 'premium', 'luxury')),
  photos text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles on delete cascade,
  category_ids int[] not null check (cardinality(category_ids) between 1 and 12),
  event_type text not null,
  city text not null,
  event_date date,
  guest_count int check (guest_count > 0),
  budget_min int check (budget_min >= 0),
  budget_max int check (budget_max >= 0),
  description text not null check (length(description) between 10 and 3000),
  status text not null default 'open' check (status in ('open', 'closed')),
  vendor_id uuid references public.vendors on delete cascade, -- set for an inquiry sent to one supplier
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days'
);

create table public.bids (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests on delete cascade,
  vendor_id uuid not null references public.vendors on delete cascade,
  price int not null check (price >= 0),
  message text not null check (length(message) between 5 and 2000),
  includes text check (length(includes) <= 2000),
  valid_until date not null default current_date + 7, -- the quote can't be accepted after this date
  seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique (request_id, vendor_id) -- one bid per vendor per request
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors on delete cascade,
  customer_id uuid not null references public.profiles on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text check (length(body) <= 1500),
  vendor_reply text check (length(vendor_reply) <= 1500),
  reported_at timestamptz,
  created_at timestamptz not null default now(),
  unique (vendor_id, customer_id)
);

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

-- Rating summary used by listings and the "best match" order.
create view public.vendor_cards with (security_invoker = true) as
  select v.*, coalesce(avg(r.rating), 0)::numeric(2,1) as rating, count(r.id)::int as review_count
  from public.vendors v left join public.reviews r on r.vendor_id = v.id
  group by v.id;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.vendors enable row level security;
alter table public.requests enable row level security;
alter table public.bids enable row level security;
alter table public.reviews enable row level security;
alter table public.bookings enable row level security;

create policy "own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());

create policy "categories are public" on public.categories for select using (true);

create policy "approved vendors are public" on public.vendors for select
  using (status = 'approved' or owner_id = auth.uid() or public.is_admin());
create policy "vendors create own listing" on public.vendors for insert
  with check (owner_id = auth.uid() and status = 'pending' and verified = false
    and exists (select 1 from profiles where id = auth.uid() and role = 'vendor'));
-- Status and badge are admin-only, and key edits need re-approval; the trigger below enforces both.
create policy "vendors edit own listing" on public.vendors for update using (owner_id = auth.uid() or public.is_admin());

-- Runs as the caller (no security definer): website users are the 'authenticated' role,
-- while the Supabase dashboard and service key run as other roles and are trusted.
create function public.guard_vendor_admin_fields() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user <> 'authenticated' or public.is_admin() then
    return new;
  end if;
  if new.status <> old.status or new.verified <> old.verified then
    raise exception 'only admins can change status or verified';
  end if;
  -- A rejected listing that its owner fixes goes back in the queue;
  -- edits that change what customers see send an approved listing back for review.
  if old.status = 'rejected' or (old.status = 'approved' and (new.category_id, new.business_name, new.photos)
     is distinct from (old.category_id, old.business_name, old.photos)) then
    new.status := 'pending';
  end if;
  return new;
end $$;
create trigger vendors_guard before update on public.vendors
  for each row execute function public.guard_vendor_admin_fields();

create function public.my_vendor_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from vendors where owner_id = auth.uid() and status = 'approved'
$$;

-- Lets a vendor keep seeing a request they bid on after it closes. A function, because a bids
-- subquery inside this policy would loop through the bids policy back into requests.
create function public.i_bid_on(req uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from bids where request_id = req and vendor_id = public.my_vendor_id())
$$;

create policy "requests visible to owner and matching vendors" on public.requests for select
  using (
    customer_id = auth.uid() or public.is_admin() or public.i_bid_on(id)
    or (status = 'open' and expires_at > now() and (vendor_id = public.my_vendor_id() or (vendor_id is null and exists (
      select 1 from vendors v where v.owner_id = auth.uid() and v.status = 'approved' and v.category_id = any (category_ids)))))
  );
-- shortcut: the cap of 5 open requests per customer can be passed by simultaneous posts; fine against casual spam.
create function public.my_open_request_count() returns bigint
language sql stable security definer set search_path = public as $$
  select count(*) from requests where customer_id = auth.uid() and status = 'open' and expires_at > now()
$$;
create policy "customers post requests" on public.requests for insert
  with check (customer_id = auth.uid() and public.my_open_request_count() < 5);
create policy "admins edit requests" on public.requests for update using (public.is_admin());

-- Customers may only close their own request, so this is a function rather than an update policy.
create function public.close_request(req uuid) returns void
language sql security definer set search_path = public as $$
  update requests set status = 'closed' where id = req and (customer_id = auth.uid() or public.is_admin())
$$;

create policy "bid visible to its vendor and the request owner" on public.bids for select
  using (
    vendor_id = public.my_vendor_id() or public.is_admin()
    or exists (select 1 from requests r where r.id = request_id and r.customer_id = auth.uid())
  );
create policy "approved vendors bid on visible open requests" on public.bids for insert
  with check (
    vendor_id = public.my_vendor_id() and seen_at is null
    and exists (select 1 from requests r where r.id = request_id and r.status = 'open' and r.expires_at > now())
  );

-- The request owner may only stamp seen_at; done through this function rather than an update policy.
create function public.mark_bids_seen(req uuid) returns void
language sql security definer set search_path = public as $$
  update bids set seen_at = now()
  where request_id = req and seen_at is null
    and exists (select 1 from requests r where r.id = req and r.customer_id = auth.uid())
$$;

create policy "reviews are public" on public.reviews for select using (true);
-- Only after a completed booking, which can only be completed once the event date has passed.
create policy "customers review after a completed booking" on public.reviews for insert
  with check (customer_id = auth.uid() and vendor_reply is null and reported_at is null and exists (
    select 1 from bookings b where b.customer_id = auth.uid() and b.vendor_id = reviews.vendor_id and b.status = 'completed'));
create policy "admins remove reviews" on public.reviews for delete using (public.is_admin());

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

-- Public bucket for vendor portfolio photos; each vendor writes only under a folder named after their user id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('vendor-photos', 'vendor-photos', true, 5242880, '{image/jpeg,image/png,image/webp}');
create policy "vendors upload own photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'vendor-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "vendors delete own photos" on storage.objects for delete to authenticated
  using (bucket_id = 'vendor-photos' and (storage.foldername(name))[1] = auth.uid()::text);
