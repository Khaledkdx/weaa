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

## Hosting

The live site, www.weaa-sa.com, is a Node app on Hostinger. It runs
`npm start`, which starts `server.js`. That server serves the built React site
from `site/` and answers the assistant and service-inquiry API routes.

To publish a change:

1. Build the React site in `frontend/` with `npm run build`, then copy
   `frontend/dist/` over `site/`.
2. Commit and push to `main`.
3. In Hostinger hPanel, open the Node app for weaa-sa.com and redeploy it from
   `main`, unless automatic deployment is turned on there.

Set these environment variables on the Hostinger Node app:

```text
OPENROUTER_API_KEY        the assistant's AI brain, voice and form extraction
RESEND_API_KEY            email for new service inquiries
NOTIFICATION_EMAIL
NOTIFICATION_FROM_EMAIL
```

The workflow in `.github/workflows/check-site.yml` runs the server tests, the
site tests and a production build on every push to `main`. It uploads nothing.
GitHub Pages is turned off; the domain points to Hostinger.

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
