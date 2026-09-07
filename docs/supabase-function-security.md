# Supabase function execution security

PostgreSQL gives newly created functions `EXECUTE` permission to `PUBLIC` unless a migration explicitly revokes it. In Supabase, `PUBLIC` includes the anonymous API role. A `SECURITY DEFINER` function with that default permission may be callable through PostgREST RPC even when its purpose is only a trigger or RLS helper.

`20260907133000_lock_down_public_function_execution.sql` removes that implicit access for all existing functions in the `public` schema. It grants `authenticated` execution only to functions needed by RLS evaluation or authenticated application RPCs. Trigger-only functions receive no API grant.

The remaining Supabase linter warnings for signed-in execution are expected for the intentionally callable RPCs. They are defended in depth: each mutating RPC checks `public.is_management()` or `public.is_admin()` internally, and the caller’s role is read from `profiles`, not submitted by the browser.

For every new function:

1. Set a fixed `search_path` on `SECURITY DEFINER` functions.
2. Revoke `EXECUTE` from `PUBLIC` immediately after creating it.
3. Grant execution only to the minimum required database role.
4. Recheck the Supabase Security Advisor after the migration is applied.
