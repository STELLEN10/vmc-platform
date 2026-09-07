# VMC platform architecture

The platform is organised as independently deployable product domains that share Supabase Auth, database-derived roles and RLS. Routes are UX entry points only; database policies and server-side `requireRole` calls remain the authorization boundaries.

## Implemented foundation

- Identity, roles, registration, password recovery and driver onboarding review
- Fleet, contracts and payment-record schema
- Internal notifications, maintenance reporting, inventory, audit and release-control schema

## Delivery domains

1. **Fleet and contracts** — bikes, non-destructive assignment history, contracts and schedule generation.
2. **Payments** — distinct payment periods, protected proof metadata, reviewed state transitions and immutable payment events.
3. **Operations** — internal notifications, bike reports and inventory movements.
4. **Control plane** — audit events, releases, feature flags and targeted release assignments.
5. **Integration boundaries** — invoice, MPG, messaging and AI interfaces. They are intentionally not live until VMC has official credentials and approvals.

## Ownership rules

- Drivers own their personal/onboarding information and may read only their own operational records.
- VMC owns bike identity, assignments, contracts, schedules, verification, inventory, release controls and audit history.
- Staff perform ordinary operations. Only admins control roles, global releases and feature flags.
- Financial history and audit events are append-only to authenticated application users.

## Extension points

Future document storage uses private Supabase Storage buckets with object paths scoped by driver/application IDs. External services are accessed only through server-side adapters; credentials never belong in a `NEXT_PUBLIC_` variable.
