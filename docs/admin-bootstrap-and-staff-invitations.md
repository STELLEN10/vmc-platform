# Initial admin bootstrap and staff invitations

VMC Management does not have public staff/admin registration. The first administrator is deliberately created through a one-time trusted operator command; afterwards, that admin invites staff from **Management → Team access**.

## 1. Create the initial VMC admin

Copy the ignored template:

```powershell
Copy-Item .env.bootstrap.example .env.bootstrap.local
```

In `.env.bootstrap.local`, set your Supabase Project URL, **server-only Secret key**, and a password you choose. Keep the configured email as:

```text
VMC_BOOTSTRAP_ADMIN_EMAIL=valhallamotorcycles1@gmail.com
```

Run this once from a trusted computer:

```powershell
npm run bootstrap:admin
```

The script creates or updates only that account, confirms its email, and assigns `admin` server-side. It refuses to replace a different existing admin and never prints the password.

Sign in at `/login` with `valhallamotorcycles1@gmail.com` and the password you chose. You will be directed to `/management`.

## 2. Configure staff invitations

In Vercel, add these **server-side only** variables to Production (and the isolated Preview project if you use one):

```text
SUPABASE_SECRET_KEY
VMC_SITE_URL=https://vmc-platform.vercel.app
```

`SUPABASE_SECRET_KEY` must never use a `NEXT_PUBLIC_` prefix. It is used only by the server action to call Supabase's Admin invitation API; no browser bundle receives it.

In Supabase Authentication URL Configuration, allow:

```text
https://vmc-platform.vercel.app/auth/callback?next=/set-password
```

## 3. Invite staff

1. Sign in as the initial admin.
2. Open **Management → Team access**.
3. Enter the team member's name and email, choose Staff or Administrator, then select **Send invitation**.
4. The recipient opens the email link, chooses their own password, and then signs in at `/login`.

The invitation action is server-side and admin-only. It creates the staff profile and role before the invitee can enter the management area. Staff cannot invite staff, create admins, or change roles.

## Driver registration

Staff can share the permanent `/driver/register` URL. That public route creates only `driver` accounts; it cannot create staff or admins.
