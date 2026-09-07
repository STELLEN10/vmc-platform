# VMC Platform

Secure application foundation for Valhalla Motorcycles (VMC), supporting the HERO delivery-rider fleet in the Pretoria–Midrand area.

This phase intentionally provides only the foundation: Supabase authentication, profiles and roles, server-side authorization, RLS, and the initial VMC Driver and VMC Management shells. Payments, maintenance, inventory, applications, tracking, notifications and PWA installation are deliberately out of scope until later phases.

## Stack

- Next.js 16 App Router, TypeScript and Tailwind CSS
- Supabase Auth and PostgreSQL
- Supabase RLS for database enforcement

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and add values from Supabase **Project Settings → API**:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_project_key
   ```

3. Apply the database migration in `supabase/migrations/20260904150000_initial_vmc_foundation.sql`. With the Supabase CLI this is normally:

   ```bash
   supabase link --project-ref your-project-ref
   supabase db push
   ```

   Alternatively, run the migration once in the Supabase SQL Editor.

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`.

Validate the code before deployment with:

```bash
npm run build
```

For remote Preview and Production deployment, environment configuration, and Supabase Auth URL settings, see [docs/vercel-deployment.md](docs/vercel-deployment.md).

## Authentication and roles

There is no public registration UI. The login form only uses `signInWithPassword`; role routing happens on the server after the session is verified:

| Role | Destination | Database scope |
| --- | --- | --- |
| `admin` | `/management` | Full management access |
| `staff` | `/management` | Operational driver/bike access; no admin privilege management |
| `driver` | `/driver` | Own profile, own driver record and assigned bike only |

Each Auth user receives a profile through a database trigger. The trigger always creates the initial profile as `driver`; it never reads a client-provided `role` value from user metadata. There are no test users seeded in database migrations because credentials and real data must never be committed.

For local development, use the guarded server-side provisioning workflow in [docs/development-test-accounts.md](docs/development-test-accounts.md). It creates clearly labelled Test Admin, Test Staff, Test Driver and Test HERO Bike records only after an explicit development opt-in. Do not insert real VMC driver data into development, migrations or source code.

## Driver registration and onboarding

VMC Driver has a permanent public registration route at `/driver/register`. It creates only driver accounts through Supabase Auth; roles are assigned by the database, not by the browser. Drivers complete their own personal and delivery information, submit for VMC review, and staff/admin approve or request changes from Management. See [docs/driver-registration-and-review.md](docs/driver-registration-and-review.md) for required Auth setup and the full test flow.

## Management account provisioning

There is no public staff or admin registration route. Create the initial administrator through the guarded server-side bootstrap process, then use **Management → Team access** to invite staff. Invitees choose their own passwords through Supabase Auth. See [docs/admin-bootstrap-and-staff-invitations.md](docs/admin-bootstrap-and-staff-invitations.md).

## Role test checklist

1. Follow the [development test account guide](docs/development-test-accounts.md) to provision the three accounts server-side.
2. Sign in as `Test Admin` and confirm `/management` works.
3. Sign in as `Test Staff` and confirm `/management` works.
4. Sign in as `Test Driver` and confirm `/driver`, `/driver/profile` and `/driver/bike` work.
4. While signed in as the test driver, manually open `/management`. The server layout redirects to `/access-denied`; hiding navigation is not relied upon.
5. While signed in as a management user, open `/driver`. The server layout redirects to `/access-denied`.
6. In Supabase's RLS testing tools or with JWTs for the respective users, verify that a driver cannot select another `profiles`, `drivers`, `bikes` or any `staff_profiles` row.

## Security design

- Only the browser-safe Supabase URL and publishable key are used by the application. There is no service-role key in client or server app code.
- `.env*` is ignored by Git; `.env.example` contains placeholders only.
- `src/app/(driver)/driver/layout.tsx` and `src/app/(management)/management/layout.tsx` verify the authenticated user and database-derived role server-side. URLs are navigation, not authorization.
- `src/proxy.ts` refreshes Supabase SSR cookies. It is not the authorization boundary; layouts and RLS are.
- The migration enables RLS on `profiles`, `drivers`, `bikes` and `staff_profiles`, revokes anon access, and adds narrowly scoped policies rather than broad authenticated-user access.
- Drivers can update only their own profile while the RLS `WITH CHECK` compares their proposed role to the database-derived current role. They cannot promote themselves.
- Staff can operate on driver and bike records but cannot enumerate staff profiles or grant admin privileges. Admins have full management access.

## Important production configuration

Before production, configure Supabase Auth to match VMC's approved account-provisioning process. Keep public signup out of the VMC UI; use admin-controlled invitations/provisioning in the next phase. Set appropriate Auth redirect URLs for each deployment domain, enable email confirmation and MFA for privileged accounts where policy requires it, and keep the Supabase service-role key only in trusted server-side operational tooling.

The next phase should add a privileged invitation/provisioning workflow before any public onboarding work. It must use a server-only administrative boundary and preserve the RLS model in this migration.
