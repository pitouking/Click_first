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
- Worker API: `pnpm dev:api` → `http://127.0.0.1:8787`
  - Core: `/gbp/diagnose`, `/site/extract`, `/generate-page`, `/generate-image`, `/publish-site`
  - Sites: `GET/POST /sites`, `GET /sites/:id`, `GET /sites/:id/pages`, `GET /sites/:id/export`, `POST /sites/:id/sync-gbp`
  - Matrix: `POST /generate-matrix` (core pages + Services × Locations)
- Astro template: `pnpm dev:astro` → `http://127.0.0.1:4321` (fixture by default; after `demo:e2e`, uses `apps/astro-template/src/data/generated/site.json`).
- Dashboard: `pnpm dev:dashboard` → onboarding + checklist GBP + matrice S×L + publish (`?site_id=`).
- Demo E2E (API must be up): `pnpm --filter @click-first/worker-api demo:e2e` (7 services × 3 locations + pages core → ~35 pages).
- Without provider API keys, `generateContent` uses deterministic fixtures (still valid for all page types + JSON-LD).
- All provider API keys are **Worker secrets only** — use `apps/worker-api/.dev.vars`.

### Setup / run once code is scaffolded (legacy note)

The monorepo above is now present. Prefer the commands in the previous section.

### Deployed tool (Monsieur Click Cloudflare account)

Production URLs (account `d6ea7833b7415d26c328c64195a46352`):

- **Dashboard:** https://click-first-dashboard.pages.dev/ — enter `TOOL_ACCESS_TOKEN` (Bearer) to unlock
- **API (Worker):** https://click-first-api.jean-pierre-michael.workers.dev — `/health` public; other routes need Bearer token
- **API (Pages fallback):** https://click-first-api.pages.dev/ — same handlers/D1 if Worker Scripts deploy is unavailable
- **Demo customer site:** https://bati-energie-marcel-test.pages.dev/

Primary deploy (token has Workers Scripts:Edit):

```bash
pnpm --filter @click-first/worker-api exec wrangler deploy
# secrets: wrangler secret put TOOL_ACCESS_TOKEN (and AI/CF keys)
```

Fallback Pages Advanced Mode (`_worker.js`): `pnpm --filter @click-first/worker-api deploy:pages-api`.

Dashboard static export:

```bash
NEXT_PUBLIC_API_BASE=https://click-first-api.jean-pierre-michael.workers.dev \
  pnpm --filter @click-first/dashboard build
wrangler pages deploy apps/dashboard/out --project-name=click-first-dashboard --branch=main
```

Remote D1: `click-first-db` (`c456106a-46ca-478e-b8b1-9e5d6b084ae5`). R2 is **not** enabled on
the account yet — image/publish handlers skip R2 when `IMAGES` is unbound.

Page corrections: `GET/PATCH /pages/:id` (title, meta, h1, intro/sections, status).

### Notes

- Prefer `pnpm` for the workspace to match the intended monorepo tooling.
- `npx wrangler` works without a global install; there is no need to `npm i -g wrangler`.
- Never commit `TOOL_ACCESS_TOKEN` or provider keys; keep them in `.dev.vars` / Pages secrets.
