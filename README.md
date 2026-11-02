# Glimsey

An Arabic-first directory of event vendors in Saudi Arabia, with Upwork-style requests and bids.
Customers browse vendors or post a request, vendors send quotes, and both sides talk on WhatsApp.
There are no payments, commissions or escrow in this version.

Stack: Next.js 16 (App Router, server actions), Supabase (Postgres, auth, photo storage), Tailwind. Hosting: Vercel.

## What's in this version

- Directory with filters (category, city, price tier, name) and vendor profiles with photos, reviews and a WhatsApp button
- Sign-up as a customer or a vendor (email and password), with password reset by email
- Vendor listing editor with photo upload; new listings wait for admin approval
- Requests: customers describe their event (several categories at once) and get bids
- Bids: approved vendors see open requests in their category, send one bid each, and see when the customer has seen it
- Inquiry to one supplier: "اطلب عرض سعر" on a vendor profile sends a request only that vendor sees
- Quotes: price, message, what's included and a valid-until date; vendors can revise a quote while the request is open
- Bookings: the customer accepts a quote, the supplier confirms (which hides them from search for that date), either side marks it done after the event date or cancels. Payment happens directly between them; the booking keeps the agreed price, date and terms
- Reviews: one per customer per vendor, only after a completed booking; the supplier can reply once and anyone signed in can report a review to the admin page
- Admin page to approve or reject vendors and mark the government freelance certificate as verified

## Setup

### 1. Create the Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a project.
2. Open **SQL Editor**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and run it once.
3. Under **Project Settings > API**, copy the project URL and the `anon` public key.
4. For quick local testing you can turn off **Authentication > Providers > Email > Confirm email**. Turn it back on before launch.
5. Under **Authentication > URL Configuration > Redirect URLs**, add `http://localhost:3000/auth/callback` so email links work locally.

### 2. Run it locally

```bash
cp .env.example .env.local   # then paste the URL and anon key into .env.local
npm install
npm run dev                  # http://localhost:3000
```

### 3. Make yourself an admin

Sign up in the app, then run this in the Supabase SQL editor with your email:

```sql
update profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
```

The **الإدارة** (Admin) link then appears in the menu.

### 4. Deploy to Vercel

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new).
2. Add the same two environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
3. Deploy. In Supabase, under **Authentication > URL Configuration**, set **Site URL** to your Vercel or custom domain and add `https://YOUR-DOMAIN/auth/callback` to **Redirect URLs**, so confirmation and password-reset emails sign people in.

## Checks

```bash
npm test        # unit tests (WhatsApp number handling)
npm run lint
npm run build
```

The database's access rules live in `supabase/schema.sql` (Row Level Security). They are the real security boundary, so after changing them run the RLS checks against a throwaway Postgres 16:

```bash
createdb glimsey_test
psql -d glimsey_test -v ON_ERROR_STOP=1 -f supabase/test/supabase_stub.sql -f supabase/schema.sql -f supabase/test/rls.sql
```

It prints `RLS checks passed` or stops at the first failing rule.

### Database changes

`supabase/schema.sql` always holds the full schema for a new project. Changes to an existing database are also saved in `supabase/migrations/`, one file per change, to run once in the SQL editor.

## Not in this version

Connects and vendor billing, PPC ads, in-app chat, phone OTP login, English UI, iOS and Android apps.
Bidding is free during the launch period.
