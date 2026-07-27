# Click_first

SaaS Monsieur Click — génération de sites locaux (SEO) sur stack Cloudflare.

## Monorepo

```
apps/worker-api       Cloudflare Worker API
apps/astro-template   Template Astro (sites générés)
apps/dashboard        Admin Next.js (liste pages + publier)
packages/shared-types Contrats TypeScript
infra/d1              Migrations D1
infra/wrangler.toml   Référence Wrangler
```

Source de vérité produit : `spec-seo-templates-saas.md` + `claude-code-kickoff-brief.md`.

## Setup

```bash
pnpm install
pnpm db:migrate:local
```

Secrets Worker (jamais frontend) : copier `apps/worker-api/.dev.vars.example` → `.dev.vars`.

## Dev

```bash
pnpm dev:api          # http://127.0.0.1:8787
pnpm dev:astro        # http://127.0.0.1:4321
pnpm dev:dashboard    # http://127.0.0.1:3000
```

## Démo E2E (plombier fictif)

Terminal 1 : `pnpm dev:api`  
Terminal 2 :

```bash
pnpm --filter @click-first/worker-api demo:e2e
pnpm --filter @click-first/astro-template build
```

Ouvrir le dashboard avec le `site_id` affiché : `http://127.0.0.1:3000/?site_id=...`

## Lint / test / build

```bash
pnpm lint
pnpm test
pnpm build
```
