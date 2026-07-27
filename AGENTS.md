# AGENTS.md

## Cursor Cloud specific instructions

### Current repository state (read first)

This repository currently contains **only planning/specification documents** — there is
no application code, no monorepo scaffolding, and no dependency manifests yet:

- `README.md` — placeholder title only.
- `claude-code-kickoff-brief.md` — the build brief (French). Describes the mandated
  monorepo layout, stack, env vars, build order, and the "definition of done".
- `spec-seo-templates-saas.md` — the detailed product spec and **source of truth** for all
  data contracts, SEO/JSON-LD schemas, and business rules. Read it in full before writing
  code; do not improvise data contracts outside it.

Because nothing is scaffolded, there is **no application to build, run, lint, or test yet**.
An environment setup that "runs the app" is not possible until the monorepo described in
`claude-code-kickoff-brief.md` is created.

### Intended stack (per the kickoff brief)

Planned monorepo layout: `apps/worker-api` (Cloudflare Worker API), `apps/astro-template`
(Astro site renderer), `apps/dashboard` (React/Next.js admin), `packages/shared-types`,
`infra/d1` (D1 SQL migrations) + `infra/wrangler.toml`.

Stack is Cloudflare-first: **D1** (database), **R2** (image storage), **Workers** (API),
**Cloudflare Access** (dashboard auth), **Astro** (site rendering), **Cloudflare Pages**
(site hosting). AI providers: Anthropic (Claude), OpenAI, DeepSeek, fal.ai. JSON-LD schema
is always assembled by deterministic code, never by an AI model.

### Tooling already available in the VM

The Cloud VM ships with everything needed to develop the intended stack, so these do NOT
need to be installed by the update script:

- Node.js v22 and npm 10
- pnpm 10 (preferred; use for the future workspace)
- Wrangler (Cloudflare CLI) via `npx wrangler` (v10)
- Python 3.12
- `vexp-cli` (global) — Graph-RAG context engine; refreshed by the startup update script

### PATH gotcha (npm -g / vexp)

`/exec-daemon` is ahead of nvm on `PATH`, so bare `node`/`npm` can resolve to
`/exec-daemon/node` with global prefix `/` and break `npm install -g`. Prefer the nvm
binaries (already prepended in `~/.bashrc` for interactive shells), or call npm via:

`"$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" | tail -1)/bin/npm" …`

Same rule for invoking `vexp` if the shell PATH is wrong.

### vexp

Project is initialized (`vexp.toml`, `.vexp/`). Useful commands:

- `vexp daemon-cmd start` — background daemon + MCP HTTP (default `http://127.0.0.1:7821`)
- `vexp doctor` — diagnose daemon/MCP/license state
- `vexp capsule "<query>"` — context capsule for a task
- `vexp index` — re-index after large changes

Git hooks under `.git/hooks` (pre-commit / post-checkout / post-merge) auto-refresh the
index; they are local to the clone (not committed). Free plan limits apply without a
license JWT.

### Setup / run once code is scaffolded

- Install deps from the repo root once a root `package.json`/`pnpm-lock.yaml` exists:
  `pnpm install`. (The startup update script already runs this, guarded on the manifest
  existing, so it is a safe no-op today.)
- Worker API: run locally with `npx wrangler dev` from `apps/worker-api` (or the configured
  script). D1/R2 bindings come from `wrangler.toml`; use `wrangler d1 migrations apply` for
  `infra/d1` migrations against a local DB.
- Astro template: `pnpm --filter astro-template dev` (Astro dev server, default port 4321).
- Dashboard: `pnpm --filter dashboard dev`.
- All provider API keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`,
  `FAL_AI_API_KEY`, `CLOUDFLARE_API_TOKEN`) are **Worker secrets only** — never expose them
  to any frontend bundle. Provide them via Cloud Agent Secrets / `.dev.vars` for local dev.

### Notes

- Prefer `pnpm` for the workspace to match the intended monorepo tooling.
- `npx wrangler` works without a global install; there is no need to `npm i -g wrangler`.
