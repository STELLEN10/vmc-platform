-- VMC v0.6 AI assistant feature registration.
-- The assistant stays disabled until an administrator explicitly activates
-- the v0.6 beta release and feature flag.

insert into public.feature_flags(key, description, enabled)
values (
  'ai_assistant',
  'Groq-powered VMC assistant with controlled operational read tools.',
  false
)
on conflict (key) do nothing;

insert into public.release_features(release_id, feature_flag_id)
select r.id, f.id
from public.releases r
join public.feature_flags f on f.key = 'ai_assistant'
where r.version = 'v0.6.0-beta.1'
on conflict do nothing;

insert into public.feature_flag_environments(feature_flag_id, environment, enabled)
select f.id, e.environment, false
from public.feature_flags f
cross join (
  values
    ('development'::public.feature_environment),
    ('preview'::public.feature_environment),
    ('production'::public.feature_environment)
) e(environment)
where f.key = 'ai_assistant'
on conflict (feature_flag_id, environment) do nothing;

insert into public.audit_logs(actor_id, action, entity_type, entity_id, new_values)
select null, 'ai_assistant_feature_registered', 'feature_flag', f.id,
       jsonb_build_object('key', f.key, 'release', 'v0.6.0-beta.1')
from public.feature_flags f
where f.key = 'ai_assistant'
  and not exists (
    select 1 from public.audit_logs a
    where a.action = 'ai_assistant_feature_registered'
      and a.entity_id = f.id
  );
