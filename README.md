# WEAA Logistics

Flutter Web landing site and CMS admin for WEAA.

## Supabase setup

1. Create a Supabase project.
2. Run the SQL migration in:
   `supabase/migrations/202606250001_weaa_cms.sql`
3. Run the payments SQL migration in:
   `supabase/migrations/202607250001_weaa_payments.sql`
4. In Supabase Dashboard, create an admin user from Authentication > Users.
5. Copy `.env.example` to `.env` for local development:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
```

The anon key is public and is safe to ship in Flutter Web. Never place a
service-role key in this app.

## Stripe payments

Payments are configured from `/admin > المدفوعات`. The Flutter Web app only
uses the public Supabase anon key. Stripe secret keys must stay in Supabase
Edge Function secrets.

Deploy the functions:

```bash
supabase functions deploy create-service-checkout
supabase functions deploy stripe-webhook
```

Set the required function secrets:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_or_test_key
supabase secrets set SITE_URL=https://your-domain.com
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_from_stripe
```

In Stripe Dashboard, create a webhook endpoint pointing to:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
```

Listen for `checkout.session.completed`.

## Local run

```bash
flutter pub get
flutter run -d chrome \
  --dart-define=SUPABASE_URL=YOUR_URL \
  --dart-define=SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

If the Supabase values are missing, the site falls back to seeded in-memory
content so the public pages still render.

## GitHub Pages build

```bash
flutter build web --base-href /weaa/ \
  --dart-define=SUPABASE_URL=YOUR_URL \
  --dart-define=SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Then copy `build/web/` to the repository root, keep `.nojekyll`, copy
`index.html` to `404.html`, commit, and push to `main`.

## Admin

Open `/admin`, sign in with the Supabase Auth admin user, then edit:

- site pages
- services/models
- general info sectors
- videos
- reviews
- customer service requests
- payment prices
- company data
- form labels
