# Vercel deployment and remote development testing

The VMC web application is a standard Next.js App Router project and can be deployed directly to Vercel. It uses Supabase cookie-based SSR authentication; no Supabase administrative key is required by the deployed application.

## Required Vercel environment variables

Add these variables in **Vercel → Project → Settings → Environment Variables** for both **Preview** and **Production**. Use the matching isolated Supabase project for each environment.

| Variable | Required | Safe in browser | Value source |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes | Supabase project Connect/API settings |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Yes | Supabase project Connect/API settings |

The `NEXT_PUBLIC_` prefix is intentional: these values are used by the browser Supabase client. Database access remains protected by Supabase Auth and RLS.

Do **not** configure development-only values in Vercel:

- `VMC_DEV_TEST_MODE`, `VMC_ALLOW_REMOTE_DEVELOPMENT_SUPABASE`, or `VMC_TEST_*`
- `.env.development.local` values

`SUPABASE_SECRET_KEY` is required only when server-side staff invitations are enabled. It must remain an unprefixed Vercel server secret and must never be imported into browser code. See `docs/admin-bootstrap-and-staff-invitations.md`.

## Deploy from GitHub

1. Push the current branch to GitHub.
2. In Vercel, choose **Add New → Project**, import `STELLEN10/vmc-platform`, and keep the detected Next.js framework preset.
3. Add the two required variables above to **Preview** and **Production**. Use a dedicated non-production Supabase project for Preview rather than production data.
4. Deploy the preview. Vercel runs `npm run build`, which is the project build command.
5. Confirm the preview login page loads, then promote or merge to the production branch when ready.

The current project requires no `vercel.json`; Vercel detects Next.js automatically.

## Deploy with the Vercel CLI

```powershell
npm install --global vercel
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY preview
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
vercel
vercel --prod
```

Enter variable values only at the interactive prompt. Do not paste or commit them into source files.

To test the exact production environment configuration locally after linking the project:

```powershell
vercel env run -e production -- npm run build
```

## Supabase Auth URL configuration

In each Supabase project, open **Authentication → URL Configuration**.

- Set **Site URL** to that environment's canonical Vercel URL.
- Add `http://localhost:3000/**` for local development.
- For Preview, add the narrow Vercel preview pattern for your Vercel account/team, such as `https://*-your-team-slug.vercel.app/**`.
- Add the exact production domain separately.
- Permit the registration and password-reset callback URLs documented in `docs/driver-registration-and-review.md`, plus `/auth/callback?next=/set-password` for staff invitations.

These settings allow Supabase email confirmation, password-reset and staff-invitation links to return safely through the server-side Auth callback.

## Remote test checklist

1. Deploy a Preview build using the isolated Preview Supabase project.
2. Provision test accounts only with the guarded local command against that isolated project; never run development provisioning against production.
3. Sign in as Test Admin and Test Staff: both should reach `/management`.
4. Sign in as Test Driver: it should reach `/driver`; direct navigation to `/management` must reach `/access-denied`.
5. Run the RLS verifier locally against the same Preview Supabase project only when its explicit remote-development guard is enabled.
