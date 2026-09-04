# Development test accounts

This guide provisions development-only VMC test accounts without adding a signup endpoint, changing RLS, or exposing an administrative key to the browser.

The provisioning script is a local Node process. It uses the Supabase service-role key only to create Auth users and fixture rows in the selected development database. The Next.js application never reads that key.

## Safety guardrails

The script refuses to run unless all of these are true:

- `VMC_ENVIRONMENT=development`
- `VMC_DEV_TEST_MODE=enabled`
- `NODE_ENV` is not `production`
- the Supabase URL is local, or `VMC_ALLOW_REMOTE_DEVELOPMENT_SUPABASE=true` is explicitly set

Never point this configuration at production. The remote override is for a separately isolated hosted development Supabase project only.

## 1. Prepare a local development database

From the repository root, start Supabase locally and apply migrations:

```powershell
npx supabase start
npx supabase db reset
```

Use a separate hosted development project only if local Supabase is not practical. Apply the VMC migrations to that project first and set the remote override described below.

## 2. Configure development-only secrets

Copy the template and edit the copy. It is excluded from Git.

```powershell
Copy-Item .env.development.example .env.development.local
```

Set the following values in `.env.development.local`:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Local Supabase URL, or a dedicated hosted development project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe local/development publishable key |
| `SUPABASE_SECRET_KEY` | Local/development secret key, available only to this local Node script |
| `VMC_TEST_*_EMAIL` / `VMC_TEST_*_PASSWORD` | Credentials for Test Admin, Test Staff and Test Driver |

Use unique development passwords of at least 16 characters. The example file contains placeholders, not usable passwords. Do not set `SUPABASE_SECRET_KEY` in a `NEXT_PUBLIC_*` variable. For older local Supabase projects without a secret key, the script also accepts the legacy `SUPABASE_SERVICE_ROLE_KEY`; use it only in the local file, never in browser code.

For local Supabase, retrieve the two keys with:

```powershell
npx supabase status
```

For a hosted development project, set `VMC_ALLOW_REMOTE_DEVELOPMENT_SUPABASE=true` only after confirming the URL belongs to that non-production project.

## 3. Create the required accounts

Run:

```powershell
npm run provision:dev-test-users
```

The script idempotently creates or updates these records server-side:

| Account | Email variable | Role | Application area |
| --- | --- | --- | --- |
| Test Admin | `VMC_TEST_ADMIN_EMAIL` | `admin` | VMC Management |
| Test Staff | `VMC_TEST_STAFF_EMAIL` | `staff` | VMC Management |
| Test Driver | `VMC_TEST_DRIVER_EMAIL` | `driver` | VMC Driver |

It also creates a `Test HERO Bike 1` and assigns it to Test Driver. Existing passwords are deliberately left unchanged on repeat runs. Set `VMC_RESET_DEV_TEST_PASSWORDS=true` only when you intentionally need to reset all test-account passwords, run the script, then set it back to `false`.

To exercise the "another driver" RLS case, set `VMC_INCLUDE_SECOND_TEST_DRIVER=true`, fill in the second driver credentials, and run the provisioning command again. This creates an optional `Test Driver Two` plus `Test HERO Bike 2`; it is not required for the three-role smoke test.

## 4. Run the application and test role redirects

```powershell
npm run dev
```

Open `http://localhost:3000/login` and sign in using the values from `.env.development.local`.

- **Test Admin** redirects to `/management` and can see the management dashboard.
- **Test Staff** redirects to `/management` and has staff-level operational access.
- **Test Driver** redirects to `/driver` and can view only their profile and assigned Test HERO Bike.

While signed in as Test Driver, manually open `http://localhost:3000/management`. The server must redirect to `/access-denied`. While signed in as Test Admin or Test Staff, opening `/driver` must also redirect to `/access-denied`.

## 5. Verify RLS as a real driver session

After provisioning, run:

```powershell
npm run verify:dev-driver-rls
```

This uses the **publishable** key and signs in as Test Driver. It passes only if the driver's JWT can read exactly one profile, one driver record and one assigned bike, while receiving no `staff_profiles` rows. If the optional second driver fixture is present, this also proves the driver cannot enumerate that other driver or their bike.

The verifier does not use the service-role key and does not bypass RLS.

## Cleanup

The script intentionally does not delete Auth users or fixtures. Delete them only from the local database or the isolated development project when you no longer need them. Never run fixture cleanup against production.
