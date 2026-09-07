# Driver registration and onboarding review

## Public driver registration

`/driver/register` is VMC's permanent driver registration URL. It is safe for staff to share because the URL grants no role or data access.

The page uses Supabase email/password signup. It accepts only full name, email, phone number, password and password confirmation. There is no role field in the UI or request. The existing database Auth trigger creates `profiles.role = 'driver'`; it does not trust user metadata for authorization.

Admin and staff accounts cannot be created through this route.

## Required Supabase configuration

1. Apply migrations, including `20260904182017_driver_onboarding.sql`.
2. In Supabase **Authentication → Providers**, keep Email authentication enabled.
3. In Supabase **Authentication → URL Configuration**, allow these redirects:

   ```text
   http://localhost:3000/auth/callback?next=/driver/onboarding
   http://localhost:3000/auth/callback?next=/reset-password
   https://your-production-domain/auth/callback?next=/driver/onboarding
   https://your-production-domain/auth/callback?next=/reset-password
   ```

   Configure the matching Preview URL patterns separately as documented in `docs/vercel-deployment.md`.
4. For production, keep email confirmation enabled and configure SMTP. After signup, the driver receives a confirmation email, then signs in to continue onboarding. Local Supabase captures messages in Mailpit.

## New driver test flow

1. Start the app with `npm run dev`.
2. Visit `http://localhost:3000/driver/register`.
3. Register a clearly labelled test driver with a unique test email and a password of at least 12 characters.
4. If email confirmation is enabled, confirm the email, then sign in at `/login`.
5. Complete emergency contact, address and at least one delivery platform at `/driver/onboarding`.
6. Select **Submit for review**. The database validates required fields, changes status to `submitted`, and creates a management notification.
7. Sign in as Test Admin or Test Staff. Open `/management/drivers`, select the new driver, add an optional review note, then choose **Approve** or **Activate**.
8. Sign back in as the driver. `/driver/onboarding` shows the current status and review note. The VMC-managed motorcycle/contract area stays read-only.

## Security checks

- Submit a crafted browser request with `role=admin` or `role=staff`: it cannot change the database role because the Auth trigger always assigns `driver`, and profile RLS rejects role changes.
- As a driver, open `/management`: the server layout redirects to `/access-denied`.
- Run `npm run verify:dev-driver-rls` after provisioning test fixtures. It confirms the signed-in driver sees only their own profile, driver record, onboarding record and assigned bike, and no staff profiles.
- Enable `VMC_INCLUDE_SECOND_TEST_DRIVER=true` in the local development file, provision again, and rerun the verifier to confirm another driver's records are not enumerable.
- The browser only receives `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No secret/service key is used by registration or onboarding.

## VMC-managed vs driver-editable data

Drivers may edit their name, phone, emergency contact, address and delivery platforms while their application is editable. Bike identity fields, contract start date, payment day, review outcome and operational status are VMC-managed database fields. The current schema includes these fields as controlled extension points; it does not add documents, payments, maintenance, location tracking, AI, referrals or messaging.
