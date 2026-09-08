# Vercel deployment and remote development testing

The VMC web application is a standard Next.js App Router project and can be deployed directly to Vercel. It uses Supabase cookie-based SSR authentication; no Supabase administrative key is required by the deployed application.

## Required Vercel environment variables

Add these variables in **Vercel → Project → Settings → Environment Variables** for the current temporary **Production** deployment at `https://vmc-platform.vercel.app`. Use matching isolated Supabase projects if Preview is enabled later.

| Variable | Required | Safe in browser | Value source |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes | Supabase project Connect/API settings |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Yes | Supabase project Connect/API settings |
| `NEXT_PUBLIC_APP_URL` | Yes | Yes | `https://vmc-platform.vercel.app` |
| `NEXT_PUBLIC_DRIVER_URL` | Yes | Yes | `https://vmc-platform.vercel.app/driver` |
| `NEXT_PUBLIC_MANAGEMENT_URL` | Yes | Yes | `https://vmc-platform.vercel.app/management` |
| `VMC_SITE_URL` | Yes for staff invitations | Yes | `https://vmc-platform.vercel.app` |

The `NEXT_PUBLIC_` prefix is intentional: these values are used by the browser Supabase client. Database access remains protected by Supabase Auth and RLS.

Do **not** configure development-only values in Vercel:

- `VMC_DEV_TEST_MODE`, `VMC_ALLOW_REMOTE_DEVELOPMENT_SUPABASE`, or `VMC_TEST_*`
- `.env.development.local` values

`SUPABASE_SECRET_KEY` is required only when server-side staff invitations are enabled. It must remain an unprefixed Vercel server secret and must never be imported into browser code. See `docs/admin-bootstrap-and-staff-invitations.md`.

## Deploy from GitHub

1. Push the current branch to GitHub.
2. In Vercel, choose **Add New → Project**, import `STELLEN10/vmc-platform`, and keep the detected Next.js framework preset.
3. Add the listed variables to **Production** with the exact temporary Vercel URL above. Add matching Preview variables only if you create a Preview environment.
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

- Set **Site URL** to `https://vmc-platform.vercel.app`.
- Add `https://vmc-platform.vercel.app/**` to **Redirect URLs**.
- Add these exact callback URLs to **Redirect URLs**:
  - `https://vmc-platform.vercel.app/auth/callback?next=/driver/onboarding`
  - `https://vmc-platform.vercel.app/auth/callback?next=/reset-password`
  - `https://vmc-platform.vercel.app/auth/callback?next=/set-password`
- Add `http://localhost:3000/**` only for local development.
- Do not add a future VMC custom domain until it exists and DNS is configured.

These settings allow Supabase email confirmation, password-reset and staff-invitation links to return safely through the server-side Auth callback.

## Remote test checklist

1. Deploy a Preview build using the isolated Preview Supabase project.
2. Provision test accounts only with the guarded local command against that isolated project; never run development provisioning against production.
3. Sign in as Test Admin and Test Staff: both should reach `/management`.
4. Sign in as Test Driver: it should reach `/driver`; direct navigation to `/management` must reach `/access-denied`.
5. Run the RLS verifier locally against the same Preview Supabase project only when its explicit remote-development guard is enabled.
