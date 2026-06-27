# WEAA Logistics

Flutter Web landing site and CMS admin for WEAA.

## Supabase setup

1. Create a Supabase project.
2. Run the SQL migration in:
   `supabase/migrations/202606250001_weaa_cms.sql`
3. In Supabase Dashboard, create an admin user from Authentication > Users.
4. Copy `.env.example` to `.env` for local development:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
```

The anon key is public and is safe to ship in Flutter Web. Never place a
service-role key in this app.

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
- company data
- form labels
