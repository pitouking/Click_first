# Brief de lancement — SaaS de génération de sites locaux (Monsieur Click)

**À donner à Claude Code avec `spec-seo-templates-saas.md` présent dans le repo.** Ce document est la source de vérité pour tous les contrats de données, schémas SEO, et règles métier — le lire en entier avant de coder, ne rien improviser en dehors.

## Objectif de ce lot

Scaffold complet du monorepo, toutes les briques du plan MVP, fonctionnel de bout en bout sur Home + Service pour un business fictif de test avant toute extension.

## Structure du monorepo (imposée)

```
/apps
  /worker-api       → Cloudflare Worker : tous les endpoints API
  /astro-template   → projet Astro : composants, layout, tokens (rendu des sites générés)
  /dashboard        → dashboard admin (React/Next.js)
/packages
  /shared-types     → types TypeScript partagés : contrats JSON de page, business_profile, schema
/infra
  /d1               → migrations SQL D1
  wrangler.toml
```

## Stack imposée — ne pas dévier

| Brique | Choix | Ne pas remplacer par |
|---|---|---|
| Base de données | Cloudflare D1 | Supabase, Postgres |
| Stockage images | Cloudflare R2 | Supabase Storage |
| API | Cloudflare Workers | Fonctions serverless génériques |
| Auth dashboard | Cloudflare Access | Auth applicative custom |
| Rendu des sites | Astro, composants réutilisables | HTML mono-fichier, CSS inline |
| Hébergement des sites | Cloudflare Pages (compte interne ou compte client délégué) | — |
| IA copy sensible (Home/About) | Claude (API Anthropic) | — |
| IA volume (Services/Locations) | DeepSeek ou Claude Haiku | — |
| Génération d'images | fal.ai | — |
| Schema JSON-LD | Code déterministe uniquement | Génération par un modèle IA |

## Variables d'environnement (secrets Worker, jamais frontend)

```
ANTHROPIC_API_KEY
OPENAI_API_KEY
DEEPSEEK_API_KEY
FAL_AI_API_KEY
CLOUDFLARE_API_TOKEN          # compte interne Monsieur Click
```

Les tokens Cloudflare des comptes clients (accès délégué) sont stockés par site, pas en variable globale — voir modèle de données `cloudflare_target` dans le spec.

## Ordre de construction — ne pas sauter d'étape

1. **Schéma D1** complet : `sites`, `pages`, `services`, `locations`, `gbp_source`, `site_scrape_source`, `sync_status`, `testimonial_bank`, `team_members` (avec table liée `credentials`)
2. **Endpoints Worker** : `/gbp/diagnose`, `/site/extract`, `/generate-page`, `/generate-image`, `/publish-site` — payloads exacts dans le spec, section 14.3
3. **Couche d'abstraction IA** : une seule fonction `generateContent(task, payload)` qui route vers Claude/DeepSeek/ChatGPT selon la tâche, jamais un appel direct à un SDK depuis le code métier
4. **Squelette Astro** : `BaseLayout.astro` (Header + Footer partout, injection schema site-level), `tokens.css`, et au minimum les composants `Hero`, `ServiceCard`, `FaqAccordion` pour couvrir Home + Service
5. **Génération JSON-LD déterministe** : fonction séparée, jamais mêlée à l'appel IA
6. **Dashboard minimal** : liste des pages avec statut (draft/published), bouton publier
7. **Test de bout en bout** sur un business fictif (ex. un plombier fictif, une ville fictive) : intake → génération Home + un Service → schema → build Astro → publication Cloudflare Pages, avant d'étendre à la matrice complète Services × Locations

## Règles non négociables

- Jamais de clé API côté frontend, sous aucun prétexte
- Le schema JSON-LD est toujours assemblé par du code déterministe, jamais généré par un modèle IA
- Aucune donnée (NAP, avis, credentials, chiffres) n'est inventée : un champ absent devient un statut "à compléter" dans le dashboard, jamais une valeur générée
- Design tokens CSS uniquement — jamais de couleur ou de police codée en dur dans un composant Astro
- La génération de contenu via les endpoints Worker doit rester découpée page par page (contrainte 10 ms CPU du plan Cloudflare gratuit) ; le build Astro lui-même peut compiler tout un site en une seule passe, ce n'est pas soumis à la même contrainte
- Le GBP reste toujours prioritaire sur le site existant et sur le formulaire manuel pour NAP et liste de services

## Definition of done pour ce premier lot

- [ ] Un site fictif complet créé de bout en bout (intake → 2 pages générées → publié)
- [ ] Schema JSON-LD valide (vérifiable sur validator.schema.org)
- [ ] Aucune clé API visible dans le bundle frontend
- [ ] Composants Astro réutilisés sans duplication entre Home et Service
- [ ] Dashboard affiche correctement le statut de chaque page
