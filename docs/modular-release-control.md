# VMC modular release control

VMC deploys source code through GitHub and Vercel. **Release Control never deploys source code**. It controls whether already-deployed, server-guarded modules are available to authorized users.

## Default state

The migration creates the version catalogue through `v0.9.0-beta.1` and these feature records:

- `core_platform` is enabled and mapped to active `v0.1.0`.
- Every other product capability is present in the schema but is disabled and mapped to a paused beta release.
- Each flag has independent development, preview and production state.

Changing a browser route or crafting a request does not activate a feature. Server code uses `hasFeatureAccess()` / `requireFeature()` in `src/lib/features/server.ts`; the database function resolves the caller's database-derived role, the active release, the environment state and optional beta assignments.

## Administrator workflow

1. Deploy the code and apply the migration.
2. Open **Management → Release control** as an administrator.
3. Move the relevant beta release to `testing` or `active` only when the deployment is ready.
4. Enable the matching catalogued feature flag.
5. Optionally assign a specific existing VMC account email, or an existing role, as a beta target.

An assigned feature is available only to the assigned profile/role. A driver cannot assign themselves beta access. Staff may view releases but cannot change releases, flags or assignments.

## Rollback

For a faulty beta, disable its feature flag first, then pause or roll back its release. This is non-destructive: data remains in PostgreSQL and the previous stable capability keeps running. The core platform cannot be disabled.

## Integration state

`integration_connections` and the server-only interfaces in `src/lib/integrations` are deliberate configuration boundaries. They do not contact Invoice System, MPG, AI, WhatsApp, email, SMS or push providers until VMC has approved provider credentials and a concrete adapter implementation. No integration credentials are stored in client-visible configuration.

## Environment variables

Existing Vercel variables remain required:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY                 # server-only; only invitations/admin operations
VMC_SITE_URL
```

Optional:

```text
VMC_FEATURE_ENVIRONMENT=production  # development | preview | production
GROQ_API_KEY                            # server-only V0.6 AI provider key
GROQ_MODEL=openai/gpt-oss-20b           # optional model override
```

When omitted, the app chooses `development` locally, `preview` for Vercel previews, and `production` otherwise. Never make `SUPABASE_SECRET_KEY`, `GROQ_API_KEY` or provider credentials `NEXT_PUBLIC_` variables.
