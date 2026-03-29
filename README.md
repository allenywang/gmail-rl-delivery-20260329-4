# Gmail RL Environment

A standalone Gmail-like reinforcement-learning environment delivery for the Google aglit repo.

## What it ships

- Gmail-inspired inbox, thread detail, draft compose, archive, star, unread, label, and send flows
- JSON-backed persisted state with reset and snapshot restore semantics
- OpenAPI-defined HTTP surface under `openapi/gmail-rl.openapi.yaml`
- Automated API and smoke tests with Node's built-in test runner
- Vercel-ready configuration for deployment, including writable runtime state in the Vercel function tmp directory

## Quick start

```bash
cd deliveries/gmail-rl-4
pnpm test
pnpm start
```

The local server defaults to `http://127.0.0.1:4010`.
