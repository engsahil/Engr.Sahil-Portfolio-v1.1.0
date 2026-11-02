# Reference portfolio + admin workspace

A lightweight React, Vite, and TypeScript portfolio shell built around the visual language in the supplied reference frames. The public content starts completely empty. No sample name, profession, biography, image, project, skill, employment record, social link, SEO metadata, logo, footer text, or contact detail is seeded.

## Reference analysis

The uploaded frames show a warm cream opening/hero with a compact hairline navigation, strong close-set sans-serif typography, a large left text column, a portrait on the right, and a small notebook-like profession card. The work sections switch to near-black charcoal. The services presentation is made from tall ribbed arched doors in muted blue, lilac, sage, and terracotta with small warm-yellow plaques. The work/project area uses restrained large type and monitor-like preview frames. The story/experience area uses an oversized year on the left and a thin vertical timeline on the right. The recreation keeps those proportions, palette, and section treatments as design defaults; actual content is entered by the administrator. Default header and footer are off, and an empty public site intentionally shows no filler copy.

## Run locally

```bash
npm install
npm run dev
```

Open `/` to enter the first-time setup flow when no administrator exists; after setup, `/` shows the public portfolio. `/admin/setup` is also available until the first administrator is created. With no Supabase variables, Vite development uses a **browser-local preview adapter** so the admin panels, draft/publish flow, and public visual preview can be explored. That adapter is not secure multi-user authentication or a production database. Its data is stored in this browser's local storage and can be cleared from browser settings.

Build check:

```bash
npm run build
```

## Supabase production setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor. It creates the admin membership table, private draft data, public published data, version history, contact submissions, storage policies, RLS, and the atomic publish RPC.
3. In Supabase Authentication settings, disable public sign-ups. The app does not implement public registration.
4. Deploy the one-time bootstrap function and set its private, high-entropy secret:

   ```bash
   supabase functions deploy bootstrap-admin
   supabase secrets set BOOTSTRAP_SECRET="<use-a-long-random-secret>"
   ```

   Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the Edge Function. The service-role key is never used in browser code. The function's status action only reports whether first setup is closed; the bootstrap action requires the secret, serializes the first-admin claim in Postgres, and closes permanently after an admin is created.
5. Copy `.env.example` to `.env` and set only the public browser URL and anon/publishable key:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
   ```

6. Start the app and open `/admin/setup`. Enter the one-time `BOOTSTRAP_SECRET` there once. It is not stored in the project. After setup, sign in at `/admin/login`; `/admin/setup` will refuse further account creation.
7. Build and deploy the Vite app to your static host. Keep all service-role credentials in Supabase only. RLS is required even though the UI also protects admin routes.

## Content workflow

- Admin edits update an in-memory draft.
- **Save draft** stores private draft content only.
- **Preview draft** renders that draft in a private admin preview.
- **Publish all** atomically saves the new public version, stores the previous published version, and updates the draft. **Publish selected content** applies chosen groups to the public document while preserving the saved draft and every unselected public group. Public visitors load the latest published JSON; active visitors subscribe to Supabase Realtime.
- Empty sections and empty records are omitted on the public site. No labels such as “Your Name Here” or demo project content are rendered.
- With Supabase connected, media uploads are stored in the `portfolio-media` bucket. In local preview, images are resized and stored as browser-local data URLs.

## Main routes

- `/` — public portfolio (published content only)
- `/admin/setup` — one-time administrator creation
- `/admin/login` — administrator sign-in
- `/admin` — dashboard
- `/admin/profile`, `/admin/hero`, `/admin/doors`, `/admin/experience`, `/admin/education`, `/admin/projects`, `/admin/skills`, `/admin/achievements`, `/admin/socials`, `/admin/contact`, `/admin/header`, `/admin/footer`, `/admin/navigation`, `/admin/sections`, `/admin/design`, `/admin/media`, `/admin/seo`, `/admin/publishing`, `/admin/settings`
- `/admin/preview` — authenticated draft preview

## Security notes

Supabase Auth owns password storage and sessions; the browser uses only the anon key. `admin_accounts` has no client insert/update/delete policy. The Edge Function holds the service-role key and uses a private setup secret for the one-time first-admin bootstrap. Drafts, versions, contact inbox reads, uploads, and publish operations are RLS-protected. The public can read only published portfolio JSON and public media, and can insert validated contact submissions. The local-preview adapter is intentionally labeled as non-production.
