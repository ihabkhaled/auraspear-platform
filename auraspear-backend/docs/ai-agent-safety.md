# AI Agent Safety

## Goal

AI agent features in AuraSpear must improve SOC workflows without weakening tenant isolation, rate limiting, auditability, or operator trust.

## Required guardrails

- Validate tenant ownership before investigating alerts or running agent actions.
- Rate limit AI endpoints.
- Audit log prompts, actions, and outcomes with sensitive fields redacted.
- Never return secrets, connector configs, or internal URLs in agent responses.
- Keep AI dashboards read-driven and evidence-backed; do not invent status or success metrics on the frontend.

## Implementation notes

- Prefer explicit execution endpoints over hidden side effects.
- Store agent session metrics that can power operational reporting: volume, duration, success/failure, and tokens.
- Localize user-facing AI error messages through `messageKey`.
- Add tests for denied access, missing tenant ownership, and sanitized failures.
