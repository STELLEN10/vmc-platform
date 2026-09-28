# VMC v0.6 — AI assistant

V0.6 adds VMC AI behind the existing server-side release-control system.

## Provider

The initial provider is Groq. The application calls Groq only from a server route and reads `GROQ_API_KEY` from server environment variables. The default model is `openai/gpt-oss-20b`; `GROQ_MODEL` can override it.

## What the assistant can do

Drivers can ask about their assigned motorcycle, their own payment status, and compatible parts.

Management can ask for fleet/driver/payment/maintenance/emergency/stock summaries and urgent operational items.

The model can call only the VMC tools defined in `src/lib/ai/tools.ts`. Tool execution runs on the VMC server and uses the current authenticated user's Supabase permissions.

## What it cannot do in V0.6

The assistant is read-only. It cannot change a payment, approve a driver, assign a bike, edit inventory, or resolve an emergency. State-changing AI commands should be implemented later with an explicit user confirmation step and a server-side authorization check.

AI output is not an authorization boundary. Existing role checks and Supabase RLS remain the source of access control.

## Environment

```text
GROQ_API_KEY=...
GROQ_MODEL=openai/gpt-oss-20b
```

Never expose `GROQ_API_KEY` through a `NEXT_PUBLIC_` variable.

## Release control

The `ai_assistant` feature flag is mapped to `v0.6.0-beta.1` and disabled by default. Deploying the code does not expose the VMC AI navigation item or API to users until Release Control enables the feature.

## Future V0.6/V0.7 extensions

- Human-reviewed AI document pre-check for driver applications.
- Confirmation-based operational commands.
- Provider abstraction for switching away from Groq without changing VMC UI or tool contracts.
- Usage/rate dashboards and durable rate limiting.
- Optional document/image pipeline only when the chosen AI model supports the required modality.
