# AGENTS.md

## Cursor Cloud specific instructions

### Current repository state (read first)

Monorepo MVP scaffold is in place (`apps/`, `packages/`, `infra/`). Product contracts remain
defined by:

- `claude-code-kickoff-brief.md` — build order, stack, DoD
- `spec-seo-templates-saas.md` — data contracts, SEO/JSON-LD, endpoints

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

Project is initialized and Cursor MCP is configured:

- Config: `.cursor/mcp.json` + `.cursor/rules` (written by `vexp setup --agents cursor`)
- Index: `vexp.toml`, `.vexp/`
- License: activated on the VM under `~/.vexp/` (not in git) — requires a saved snapshot
  to persist across pods

Useful commands:

- `vexp daemon-cmd start` — background daemon + MCP HTTP (default `http://127.0.0.1:7821`)
- `vexp doctor` — diagnose daemon/MCP/license state
- `vexp capsule "<query>"` / `vexp setup --agents cursor` — capsule / re-wire Cursor MCP
- `vexp index` — re-index after large changes

Git hooks under `.git/hooks` (pre-commit / post-checkout / post-merge) auto-refresh the
index; they are local to the clone (not committed).

Note: this Cloud Agent session’s built-in MCP catalog may not include vexp; use the CLI
(`vexp capsule`, `vexp index`, …) here. Desktop Cursor picks up `.cursor/mcp.json`.

### Setup / run (monorepo scaffolded)

- Install: `pnpm install` (also in the startup update script).
- D1 local migrations: `pnpm db:migrate:local`
- Worker API: `pnpm dev:api` → `http://127.0.0.1:8787` (`/health`, `/gbp/diagnose`, `/site/extract`, `/generate-page`, `/generate-image`, `/publish-site`).
- Astro template: `pnpm dev:astro` → `http://127.0.0.1:4321` (fixture plombier by default; generated content under `apps/astro-template/src/data/generated/` after demo:e2e).
- Dashboard: `pnpm dev:dashboard` → `http://127.0.0.1:3000` (pass `?site_id=`). Auth intended via Cloudflare Access — no app auth in MVP.
- Demo E2E (API must be up): `pnpm --filter @click-first/worker-api demo:e2e`
- Without provider API keys, `generateContent` uses deterministic fixtures (still valid for Home + Service + JSON-LD).
- All provider API keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`,
  `FAL_AI_API_KEY`, `CLOUDFLARE_API_TOKEN`) are **Worker secrets only** — never expose them
  to any frontend bundle. Use `apps/worker-api/.dev.vars` for local wrangler.

### Setup / run once code is scaffolded (legacy note)

The monorepo above is now present. Prefer the commands in the previous section.

### Notes

- Prefer `pnpm` for the workspace to match the intended monorepo tooling.
- `npx wrangler` works without a global install; there is no need to `npm i -g wrangler`.
