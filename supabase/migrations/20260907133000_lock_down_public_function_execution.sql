-- SECURITY: PostgreSQL grants EXECUTE on new functions to PUBLIC by default.
-- Revoke that implicit access from every existing public-schema function so the
-- anonymous Supabase role cannot invoke SECURITY DEFINER functions over RPC.
-- Trigger-only functions intentionally receive no application-role grant.

revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;

-- These helpers are evaluated by RLS policies for signed-in requests. They
-- return only database-derived authorization facts and never grant a role.
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_management() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.driver_can_edit_onboarding(uuid) to authenticated;
grant execute on function public.is_driver_owner(uuid) to authenticated;

-- These are authenticated application RPCs. Every mutating function performs
-- its own database role/ownership check before writing data. They remain
-- unavailable to anon/public callers.
grant execute on function public.review_driver_onboarding(uuid, public.driver_onboarding_status, text) to authenticated;
grant execute on function public.generate_contract_payment_schedule(uuid) to authenticated;
grant execute on function public.transition_payment_period(uuid, public.payment_status, text) to authenticated;
grant execute on function public.create_release(text, public.release_channel, text) to authenticated;
grant execute on function public.transition_release(uuid, public.release_status, text) to authenticated;
grant execute on function public.set_feature_flag(text, boolean, text) to authenticated;

-- Future migration rule: every new public-schema function must immediately
-- revoke PUBLIC execution and grant only the exact role that needs it.
