# Spec SEO complète — Moteur de templates du SaaS local

Ce document consolide l'ensemble de vos procédures (Core 30, Jordan Pearce, StoryBrand sémantique) et les croise avec The Website Specification (specification.website, consultée en direct) pour servir de **contrat de référence** au moteur de génération de sites. Chaque section = ce que le moteur doit produire automatiquement pour chaque site généré.

---

## 1. Architecture du site — nombre de pages exact

### Formule Core 30 (mono-localisation)

| Type de page | Nombre | Règle |
|---|---|---|
| Home (GBP Landing) | 1 | Catégorie principale + ville, bloc de 50-100 mots par catégorie GBP |
| Pages Catégories | 3 à 5 | Une par catégorie GBP (primaire + secondaires) |
| Pages Services | 11 à 25+ | Une par service listé dans le GBP |
| Pages essentielles | 3 | À propos, Contact, Zones desservies |
| **Total Core 30** | **~28-34 pages** | Le chiffre exact importe moins que la couverture complète des catégories/services GBP |

### Extension multi-localisation (matrice Services × Locations)

```
Nombre de pages géo = Nombre de services × Nombre de zones ciblées
```
Exemple observé chez un concurrent : 6 services × 3 zones = 18 pages géographiques, en plus des 9 pages Core 30 = 27 pages totales. C'est la structure à répliquer dans le moteur : chaque croisement Service × Location est une page indépendante avec son propre statut (not_created / generating / created / published).

### Dimensionnement par scope de concurrence

| Timeline | Pages cibles | Rythme |
|---|---|---|
| 3 mois | 60 pages | 20/mois |
| 6 mois | 60 pages | 10/mois |
| 6 mois | 30 pages | 5/mois |

Calcul du volume cible : moyenne du nombre de pages indexées (`site:concurrent.fr`) des 3 concurrents en Top 3 Maps.

### Pages topicales et géographiques (Phase 5, au-delà du Core 30)

- **Pages géographiques** (quartiers, landmarks) : ciblent les positions 4-6 de la rank map, jamais 15+. Structure : Title `[Service] [Quartier/Zone] [Ville]`, H1 `[Service] à [Quartier], [Ville]`, intro sur les spécificités du quartier, 300-400 mots
- **Pages topicales / FAQ détaillées** : 1 page par question PAA/Reddit qui mérite une réponse complète (300-500 mots), liée depuis la page service parente via une FAQ courte (30-50 mots) + lien éditorial

### Blog et pages de support

- **Blog** : pages topicales de fond (guides, comparatifs), format citation-ready (voir section 4)
- **Support/FAQ globale** : agrégée à part, en plus des mini-FAQ par page service
- **Pages légales** : mentions légales, politique de confidentialité (requis, voir section 5), CGV si e-commerce/devis en ligne

---

## 2. SEO on-page — règles exactes

### Title tag
- Maximum **55 caractères** (convention Monsieur Click, plus strict que le max technique de 60)
- Formule : `[Service/Catégorie] + [Ville] + [USP/Offre]`
- Générer 10 variantes scorées (SEO / Engagement / Overall sur 10) avant de choisir

### Meta description
- **155-160 caractères**, jamais plus
- Mot-clé exact + offre si disponible, pas de point d'exclamation ni d'emoji
- 10 variantes scorées également

### Structure de headings
- **Hiérarchie obligatoire, jamais de saut de niveau** (H1 → H2 → H3, jamais H1 → H3)
- Un seul H1 par page
- Terminologie StoryBrand appliquée : H1 = le "badge" (mot-clé + ville + positionnement), H2 juste en dessous = le "titre" (accroche émotionnelle)

### Volume de contenu
| Type de page | Volume |
|---|---|
| Page service | 800 à 1 000 mots |
| Page catégorie | 1 500 à 2 500 mots |
| Page géographique | 300 à 400 mots |
| Page FAQ détaillée | 300 à 500 mots |

### Structure section par section (pages service/catégorie)
1. **Introduction** (200-250 mots) : 1ère personne, ancrage local réel (quartier/landmark), mot-clé primaire
2. **Détails du service** (H2) : composantes, considérations locales, FAQ intégrée, garanties
3. **Trust Building** : expérience locale réelle, certifications, témoignages géo-référencés
4. **Call-to-Action** : offre localisée, coordonnées, zone couverte

### Maillage interne
- Home → lien vers chaque page catégorie
- Catégorie → lien vers chaque service rattaché
- Service → lien vers catégorie mère + services complémentaires
- Page géographique → lien éditorial vers la page service principale

---

## 3. Schema markup — matrice complète par type de page

Convention Monsieur Click : regrouper tous les schemas d'une page dans un seul bloc JSON-LD via `@graph`. NAP identique caractère pour caractère entre schema et GBP.

| Type de page | Schemas requis |
|---|---|
| Homepage / GBP Landing | Organization (header global, toutes pages) + LocalBusiness (uniquement l'URL liée au GBP) + WebSite + FAQPage (si FAQ) + BreadcrumbList |
| Page Catégorie | Organization + Service (serviceType = catégorie) + FAQPage + BreadcrumbList (Home > Catégorie) |
| Page Service | Organization + Service (serviceType = service exact) + FAQPage + BreadcrumbList (Home > Catégorie > Service) |
| Page géographique | Organization + Service (areaServed = zone) + FAQPage + BreadcrumbList (Home > Service > Zone) |
| Article / Blog | Organization + Article + FAQPage (si applicable) + BreadcrumbList |
| Page About | Organization + AboutPage |

**Règle critique** : LocalBusiness uniquement sur l'unique URL pointée par le GBP, jamais dupliqué sur d'autres pages.

### Squelette LocalBusiness (à générer automatiquement, jamais par l'IA générative — génération déterministe à partir du `business_profile`)

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "[nom exact GBP]",
  "image": "[photo réelle]",
  "url": "[URL du site]",
  "telephone": "[téléphone réel]",
  "priceRange": "$$",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "[rue réelle]",
    "addressLocality": "[ville]",
    "postalCode": "[code postal]",
    "addressCountry": "FR"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": "[lat]", "longitude": "[lng]" },
  "areaServed": [{ "@type": "City", "name": "[ville]" }],
  "openingHoursSpecification": [{
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
    "opens": "09:00", "closes": "18:00"
  }],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Services",
    "itemListElement": [{ "@type": "Offer", "itemOffered": { "@type": "Service", "name": "[service]" } }]
  }
}
```

**Point de vigilance** : ne jamais inventer NAP, avis, note ou statistiques. Le moteur doit bloquer la génération de schema tant que le NAP réel n'est pas fourni par le client.

---

## 4. Signaux LLM / IA (GEO — Generative Engine Optimization)

### Les 4 signaux de contenu (méthode Jordan Pearce, à appliquer phrase par phrase)

1. **NLP** — couvrir la topic map complète (entités + relations), pas la densité de mots-clés
2. **BERT** — chaque phrase clé répond à au moins 2 des 5 questions Qui/Quoi/Où/Pourquoi/Comment
3. **MUVERA** — couvrir 6 dimensions obligatoires + 2 bonus : Problème, Solution, Processus, Contexte local, Signaux de confiance, Résultat final, + Tarification, + FAQ
4. **Sentiment positif** — aucune phrase fondée sur la peur ou l'urgence artificielle

### Citation-readiness (pour les pages blog/topicales, méthode cite-me)
- Une question par H2, une réponse extractible de 2 phrases en tête de section
- Une source par affirmation, citée en ligne sur le mot-clé (jamais de bloc "Sources" en fin de page)
- Un tableau, une anecdote de première main par section qui le justifie

### Agent-readiness technique (confirmé via The Website Specification, specification.website)

| Item | Statut | Ce que le moteur doit générer |
|---|---|---|
| Structured data (JSON-LD) | recommended | Voir section 3 |
| `/llms.txt` | recommended | Fichier markdown à la racine, index curé des pages importantes |
| `/llms-full.txt` | optional | Utile pour petits sites uniquement (coûteux à grande échelle) |
| robots.txt pour crawlers IA | recommended | User-agents nommés par vendeur IA (GPTBot, ClaudeBot, etc.), allow/disallow explicite |
| Structured data for agents | recommended | Même JSON-LD que le SEO classique, les agents s'appuient dessus autant que les moteurs |
| **OKF (Open Knowledge Format) bundle** | optional | Arborescence de fichiers Markdown à front-matter typée, permet à un agent d'ingérer tout le corpus en un seul fetch. Pertinent si vous voulez aller au-delà du concurrent observé |
| Machine-readable formats (JSON/RSS) | recommended | À prévoir pour le blog au minimum (flux RSS) |
| Stable URLs | **required** | Les slugs ne doivent jamais changer après publication |

Je reste factuel ici : `/llms.txt`, l'OKF bundle et les schémas pour agents sont tous des conventions émergentes, pas des standards ratifiés. Ce sont des différenciateurs à valeur ajoutée, pas des obligations techniques au sens strict.

---

## 5. Fondations techniques obligatoires (non négociables, confirmées via The Website Specification)

### Required — le contrat casse sans ça
- Doctype `<!doctype html>`, `<html lang="fr">`, `<meta charset="utf-8">`, `<meta viewport>`, un unique `<title>` non vide
- Redirections propres (301/308 permanentes), politique d'indexation explicite par page (meta robots)
- Hiérarchie de headings sans saut de niveau
- HTTPS/TLS 1.2+, HSTS, `X-Content-Type-Options: nosniff`, protection clickjacking, cookies Secure/HttpOnly/SameSite
- Core Web Vitals : LCP ≤ 2,5s, INP ≤ 200ms, CLS ≤ 0,1 (75e percentile)
- Images en formats modernes (WebP/AVIF), dimensions explicites, Cache-Control adapté, compression brotli/gzip
- Accessibilité : alt text sur toutes les images, labels de formulaire réels, navigation clavier complète, indicateurs de focus visibles, contraste suffisant, landmarks sémantiques (`header`, `nav`, `main`, `footer`), texte de lien descriptif (jamais "cliquez ici")
- Politique de confidentialité + consentement cookies (obligatoire UE/UK pour cookies non essentiels)
- Pages d'erreur personnalisées (404/500)

### Recommended — un site moderne doit le faire
- robots.txt + sitemap XML (+ index de sitemaps si plus de 50 000 URLs)
- URLs en minuscules, avec tirets, courtes et descriptives
- Rendu server-side (SSG ou SSR, pas de contenu assemblé uniquement en JS côté client — critique pour être lu par les crawlers ET les agents IA)
- Maillage interne systématique
- Breadcrumbs visibles + BreadcrumbList JSON-LD

---

## 6. Structure HTML moderne — tokens, classes, entités

### Système de tokens (variables CSS, pas de valeurs codées en dur)
```css
:root {
  --color-primary: [issu de la recherche secteur/concurrent];
  --color-secondary: [...];
  --color-accent: [...];
  --font-heading: [...];
  --font-body: [...];
  --spacing-unit: 8px;
  --radius-base: [...];
}
```
Chaque preset esthétique (Minimaliste, Moderne, Industriel) = un jeu de valeurs différent sur les mêmes variables, jamais un template HTML dupliqué.

### Squelette sémantique obligatoire
```html
<body>
  <a class="skip-link" href="#main">Aller au contenu principal</a>
  <header>...</header>
  <nav aria-label="Navigation principale">...</nav>
  <main id="main">
    <h1>...</h1>
    <section>...</section>
  </main>
  <footer>...</footer>
</body>
```

### Entités et triple entités (SEO sémantique)
Construire la topic map **avant** de rédiger, pas après :
- **15 à 30 entités métier réelles** (ex. pour un couvreur : shingles, flashing, fascia, dégât des eaux, sinistre assurance)
- **10 à 15 entités géographiques réelles** de la zone (quartiers, rues, communes voisines, département)
- **Entités de confiance** : certifications, labels, garanties

Une "triple entité" = trois entités liées dans une même phrase pour renforcer une relation sémantique explicite (ex. "Notre équipe certifiée RGE intervient à Malakoff et dans tout le Vaucluse pour vos travaux d'isolation" relie service + certification + zone géographique en une phrase).

---

## 7. Contrat JSON de template par type de page (pour l'appel IA structuré)

Squelette de slots que l'appel de génération IA doit remplir, un par type de page. Exemple pour une page Service :

```json
{
  "page_type": "service",
  "slug": "",
  "title_tag": "",
  "meta_description": "",
  "h1": "",
  "sections": {
    "intro": "",
    "service_details": [{ "h2": "", "content": "" }],
    "trust_building": "",
    "faq": [{ "question": "", "answer": "" }],
    "cta": ""
  },
  "schema": { "type": "Service", "auto_generated": true },
  "images": { "hero": "", "og": "" },
  "internal_links": { "parent_category": "", "related_services": [] },
  "status": "draft"
}
```

Chaque type de page (home, catégorie, service, location, about, contact, blog) a son propre contrat de ce type. Le générateur IA ne reçoit jamais de prompt libre : il reçoit ce schéma + le contexte business et retourne un JSON conforme, jamais du texte libre à parser après coup.

---

## 8. Synergie GBP ↔ Site — le GBP comme source de vérité unique

C'est une règle fondatrice, pas une option : **le GBP n'est jamais un input parmi d'autres, c'est le Master Record**. Tout écart entre le GBP et le site est un signal de méfiance direct pour Google (Phase 0.5 de votre méthode local-SEO : même un seul caractère de différence peut bloquer le ranking, peu importe la qualité du contenu produit ensuite).

### 8.0 Premier diagnostic obligatoire : le GBP est-il déjà optimisé ?

Avant toute génération de site, le moteur doit scorer le GBP fourni sur les critères exacts de votre méthode (`core30-gbp-optimization`) :

| Critère | Seuil optimal |
|---|---|
| Catégories | 2 à 10 (jamais 1 seule) |
| Services | 20 à 30+ (marchés compétitifs : 30-40+) |
| Description | 750 caractères, utiliser tout l'espace |
| Photos | 20 minimum |
| Attributs | Tous cochés (oui/non), aucun laissé vide |
| Horaires | Complets, y compris jours fériés |
| Q&R | Au moins 5 questions/réponses proactives |
| Posts | 1/semaine minimum |

**Deux scénarios possibles, à traiter différemment :**

**Scénario A — GBP déjà bien rempli** (la majorité des critères ci-dessus sont validés)
- Le moteur importe directement le GBP comme Master Record (section 8.1 ci-dessous)
- Le site est généré en miroir immédiat : mêmes catégories, mêmes services, même NAP

**Scénario B — GBP incomplet ou sous-optimisé** (un ou plusieurs critères manquants, notamment moins de 20 services ou 1 seule catégorie)
- Le moteur ne se contente pas d'importer un GBP pauvre tel quel : il **calcule d'abord la cible optimale** (catégories manquantes suggérées, liste de services à ajouter pour atteindre 20-30+, description reformulée à 750 caractères) en utilisant les mêmes prompts que votre méthode existante
- Il produit une **checklist d'actions GBP** à donner au client, séparée du plan de site : "Voici ce qu'il faut ajouter sur votre fiche Google avant/en parallèle de la génération du site"
- Le site est alors généré sur la base de cette **cible optimisée**, pas sur la base du GBP pauvre existant — sinon le site répliquerait les mêmes trous que le profil GBP incomplet
- Objectif final : que le client mette à jour son GBP pour qu'il rejoigne le site, les deux convergent vers le même profil complet

> Le principe reste le même dans les deux cas : GBP et site doivent finir identiques. Scénario A part du GBP existant. Scénario B part d'une cible calculée, avec un livrable d'action pour que le GBP réel rattrape cette cible.

### 8.1 Le moteur doit fonctionner en 2 sens (après le diagnostic initial)

**A. Génération depuis le GBP (sens normal)**
- Le point de départ de tout nouveau site n'est jamais un formulaire vierge, c'est un **import GBP** : nom exact, adresse, téléphone, catégorie principale, catégories secondaires (max 10), et surtout **la liste complète des services GBP**
- Un service GBP = une page Service générée, sans exception. Le nombre de pages Service du site (section 1) découle directement du nombre de services déclarés au GBP, pas d'une estimation à part
- Le NAP du schema LocalBusiness (section 3) est copié caractère pour caractère depuis le GBP, jamais retapé manuellement

**B. Détection d'écarts (sens continu, après génération)**
- Réutiliser le modèle Master Record + sévérité de votre `site-consistency-auditor` : à chaque synchronisation, comparer service par service et champ par champ
- Deux directions d'anomalie possibles, à distinguer clairement dans le rapport :
  - **Manque sur le site** : un service existe au GBP mais n'a pas de page dédiée → priorité CRITIQUE, dilue la pertinence topique
  - **Manque au GBP** : le site parle d'un service absent du GBP → priorité MAJEUR, signal d'incohérence entité pour Google et pour les moteurs IA
- Champs à surveiller en continu : Nom, Adresse, Téléphone, Horaires, Liste des services, Catégories

### Ce que ça implique pour le modèle de données du SaaS

```json
{
  "gbp_source": {
    "business_name": "",
    "nap": { "address": "", "phone": "" },
    "categories": { "primary": "", "secondary": [] },
    "services": [],
    "hours": [],
    "last_synced": "",
    "optimization_status": "optimized | needs_action",
    "gbp_action_checklist": []
  },
  "site_services": [],
  "sync_status": {
    "missing_on_site": [],
    "missing_on_gbp": [],
    "nap_mismatch": false,
    "last_check": ""
  }
}
```

Concrètement : `site_services` doit toujours être un sous-ensemble parfaitement aligné de `gbp_source.services`. Le tableau de bord de l'utilisateur (comme la matrice Services × Locations vue chez le concurrent) doit afficher en clair, à côté de chaque service, s'il vient du GBP ou s'il a été ajouté manuellement côté site sans équivalent GBP.

### Recommandation d'implémentation
- Si une API GBP est disponible et autorisée par le client, automatiser l'import et la resynchronisation périodique
- Sinon (cas le plus courant pour des TPE), prévoir un formulaire d'import structuré où l'utilisateur colle les données de sa fiche GBP, avec un bouton "Vérifier la synergie" qui lance la comparaison à la demande
- Ne jamais publier une page Service sans confirmation que son libellé correspond exactement à un service du GBP

---

## 9. Copie de la Home — mixte StoryBrand × Jordan Pearce

Structure spécifique à la homepage (et transposable aux pages catégorie), combinant votre convention badge/titre et le layout Geo Hub 8 sections. Le moteur doit générer chaque section avec ce rôle précis.

### Hero — badge + titre StoryBrand

| Élément | Niveau HTML | Rôle | Contenu |
|---|---|---|---|
| Badge | `<h1>` | Pertinence topique + géo immédiate pour Google | `[Catégorie/Service] à [Ville]` — exact match, sobre, pas d'émotion |
| Titre StoryBrand | `<h2>` (visuellement plus grand que le H1 via token `--font-size-hero-title`, jamais via le niveau de heading) | Accroche émotionnelle SB7 — beat "Character" | Phrase émotionnelle centrée sur le résultat désiré du client, pas sur l'entreprise |
| Sous-titre | `<p>` | Situe le lecteur (fin du beat Character) + 1ère triple entité | `[Business] aide [type de client] à [Ville] à [résultat désiré]` |
| CTA primaire | bouton | Répété en haut et en bas de page | Verbe d'action + zéro friction ("Devis gratuit en 2 minutes") |

> Le H2 ne remplace jamais le H1 dans la hiérarchie sémantique : le badge reste le premier heading structurel (SEO), le titre StoryBrand est le second niveau mais domine visuellement (UX/conversion). C'est une séparation volontaire entre hiérarchie SEO et hiérarchie visuelle, à piloter uniquement par les tokens CSS.

### Déclinaison SB7 mappée sur le layout Geo Hub

| # Section Geo Hub | Beat StoryBrand | Ce qu'il faut y injecter |
|---|---|---|
| 1. Hero | Character | Badge H1 + titre H2 + sous-titre (voir tableau ci-dessus) |
| 2. Services détaillés | Plan (aperçu) | Une phrase BERT par service (répond à ≥2 de Qui/Quoi/Où/Pourquoi/Comment) + triple entité `[Business] + [Service] + [Ville]` par carte |
| 3. Processus (How It Works) | Plan (détaillé, 3-4 étapes) | Aucune friction perçue, ton positif (signal 4 Jordan Pearce), jamais de peur |
| 4. Témoignages | Guide (preuve sociale) | Géo-référencés : quartier + service + résultat concret |
| 5. À propos | Guide (empathie + autorité) | Ancienneté, certifications, E-E-A-T — directement alimenté par les credentials collectés (section 10) |
| 6. FAQ (7+ Q/R) | Avoid Failure (objections) | Reformuler la peur en réassurance factuelle, jamais d'urgence artificielle |
| 7. Zone de service (Geo Hub) | (renforcement géo, transverse) | Entités géo réelles : quartiers, villes voisines, distances — triples entités `[Service] + [Quartier] + [Ville]` |
| 8. Tarification transparente | Success + CTA final | Vision concrète du résultat + 3 paliers de prix qui lèvent le risque perçu |

### Règle d'écriture commune aux deux méthodes
Chaque phrase clé de chaque section doit satisfaire simultanément : au moins 2 des 5 questions BERT, au moins une triple entité quand c'est naturel, et le ton positif du signal 4 Jordan Pearce (jamais l'un des deux styles au détriment de l'autre).

---

## 10. Schema markup approfondi — au-delà de LocalBusiness/Organization

Vous avez raison de pousser plus loin : LocalBusiness/Organization couvre la structure de base, mais l'autorité perçue (par Google comme par les LLM) vient des **credentials, de l'ancienneté et des signaux de confiance vérifiables**. Objectif : un schema unique et développé, décliné en deux niveaux.

### 10.1 Schema niveau SITE (dans le `@graph` global, header, toutes pages)

Étendre l'Organization/LocalBusiness de la section 3 avec ces blocs supplémentaires :

| Propriété schema.org | Rôle | Origine de la donnée |
|---|---|---|
| `@type` précis (pas juste `LocalBusiness`) | Ex. `Electrician`, `Plumber`, `HomeAndConstructionBusiness`, `ProfessionalService`, `MedicalBusiness`... | Déduit de la catégorie GBP principale |
| `identifier` (array de `PropertyValue`) | Numéros légaux : SIRET/SIREN (FR), EIN (US), n° RCS, TVA intracommunautaire | **À demander au client** |
| `foundingDate` | Date de création → calcul automatique du nombre d'années d'existence | **À demander au client** |
| `founder` (Person) | Fondateur, avec son propre `hasCredential` si pertinent | **À demander au client** |
| `employee[]` (Person) | Équipe avec `jobTitle`, `hasCredential`, `alumniOf`, `award` | **À demander au client**, section détaillée ci-dessous |
| `hasCredential` (au niveau Organization) | Certifications pro de l'entreprise (RGE, Qualibat, licence professionnelle, accréditation) | **À demander au client** |
| `memberOf` | Chambre de commerce, association professionnelle, syndicat de métier | **À demander au client** |
| `award` | Récompenses reçues | **À demander au client** |
| `knowsAbout` | Liste d'entités d'expertise (relié à la topic map section 6) | Généré depuis la liste de services + catégories GBP |
| `sameAs` (array) | Toutes les URLs de profils : GBP, Facebook, Instagram, LinkedIn, Yelp, Apple Maps, Bing Places | **À demander au client**, doit matcher l'audit NAP cross-platform existant |
| `additionalProperty` (array de `PropertyValue`) | Tout ce qui n'a pas de propriété schema.org dédiée : assurance (type + assureur), garanties spécifiques, labels non standards | **À demander au client**, jamais inventé |
| `disambiguatingDescription` | Description courte qui désambiguïse l'entité pour les LLM (utile si nom d'entreprise générique) | Généré à partir du profil business |
| `aggregateRating` + `review` | Uniquement si des avis réels existent | **Jamais généré ni estimé** |

### 10.2 Squelette Person pour les credentials d'équipe

```json
{
  "@type": "Person",
  "name": "[Nom]",
  "jobTitle": "[Poste]",
  "hasCredential": [{
    "@type": "EducationalOccupationalCredential",
    "credentialCategory": "certification",
    "name": "[Nom du diplôme/certification]",
    "recognizedBy": { "@type": "Organization", "name": "[Organisme émetteur]" },
    "dateCreated": "[année]"
  }],
  "alumniOf": { "@type": "EducationalOrganization", "name": "[École/université]" },
  "award": ["[Récompense individuelle]"]
}
```

### 10.3 Informations légales et assurance — pas de propriété schema.org dédiée

Pour SIRET/EIN/RCS/TVA : utiliser `identifier` avec un objet `PropertyValue` par numéro (`name`: "SIRET", `value`: "..."). Pour l'assurance, aucune propriété schema.org standard n'existe : passer par `additionalProperty` (`PropertyValue` avec `name`: "Assurance", `value`: "Responsabilité civile professionnelle — [Assureur]"). Je le signale explicitement pour éviter toute confusion : ce sont des conventions d'usage, pas des propriétés schema.org officiellement documentées pour cet usage précis, mais elles sont lisibles par Google et par les LLM au même titre que le reste du JSON-LD.

### 10.4 Schema niveau PAGE (en plus du niveau site, spécifique à chaque page)

Étend la matrice de la section 3 : chaque page peut désormais porter un sous-ensemble enrichi de credentials pertinents pour son sujet précis.

| Page | Ajout au-delà de la matrice section 3 |
|---|---|
| About | `mainEntity` pointant vers l'Organization complète avec tout le tableau `employee[]` et leurs `hasCredential` — c'est la page où l'EEAT est le plus développé |
| Service | `provider` (lien vers l'Organization) + `hasCredential` spécifique si ce service précis exige une licence particulière (ex. habilitation électrique pour une page "installation électrique") |
| Contact | `ContactPage` + reprise du NAP identique caractère pour caractère au schema site |

### 10.5 Champs à ajouter à l'intake client (formulaire d'onboarding du SaaS)

En plus des champs GBP (section 8), le moteur doit demander explicitement, avant de générer le schema complet :

```
[ ] Numéro SIRET/SIREN (FR) ou EIN (US) ou équivalent local
[ ] Numéro RCS et TVA intracommunautaire (si applicable)
[ ] Date de création de l'entreprise
[ ] Assurance(s) : type + nom de l'assureur (jamais de n° de police sans autorisation explicite)
[ ] Certifications/diplômes de l'entreprise (RGE, Qualibat, labels métier)
[ ] Pour chaque membre d'équipe à afficher : nom, poste, diplôme(s), organisme émetteur, année, école/université
[ ] Récompenses ou distinctions reçues
[ ] Adhésions professionnelles (chambre de commerce, syndicat, association)
[ ] Toutes les URLs de profils sociaux et d'annuaires (sameAs)
```

**Garde-fou strict** : si un champ est absent, le moteur ne l'invente jamais et ne le laisse pas vide silencieusement — il l'omet du JSON-LD et le signale dans le tableau de bord comme "à compléter", exactement comme la règle déjà appliquée au NAP et aux avis.

---

## 11. Architecture technique

### Composants

- **Dashboard admin (React/Next.js)** : formulaires 1:1 avec les contrats JSON des sections précédentes, matrice Services × Locations, éditeur de pages, statut de synergie GBP/site (section 8/12). Aucun appel direct aux API tierces (IA, GBP, extraction de site) depuis le navigateur : tout transite par l'API backend, conformément à la contrainte de ne jamais exposer de clé API côté frontend.
- **API backend (fonctions serverless)** : trois routes séparées, pas un monolithe
  - `POST /gbp/diagnose` : reçoit les données GBP brutes, retourne `optimization_status` + `gbp_action_checklist` (section 8.0)
  - `POST /site/extract` : reçoit une URL, retourne les données extraites du site existant (section 12)
  - `POST /generate-page` : reçoit `{business_profile, page_type, service?, location?}`, appelle le modèle en structured output avec le contrat JSON exact du type de page, retourne un JSON validé
  - `POST /publish-site` : déclenche le build statique + déploiement
- **Cloudflare D1 (base de données)** : tables `sites`, `pages`, `services`, `locations`, `gbp_source`, `site_scrape_source`, `sync_status`, `testimonial_bank`, `team_members` (avec `credentials`). SQLite à l'edge, colocalisé avec les Workers, cohérent avec un compte Cloudflare déjà utilisé pour l'hébergement (voir section 14.2 pour l'arbitrage D1 vs Supabase)
- **Cloudflare R2** : stockage des images (hero, team, OG), pas dans D1 (une ligne D1 est plafonnée à 2 Mo, inadapté à des fichiers image)
- **Cloudflare Workers** : couche API, remplace les fonctions serverless génériques évoquées plus haut, tourne nativement avec D1
- **Génération IA (structured output)** : jamais de prompt libre, toujours le contrat JSON du type de page en sortie contrainte. Le schema JSON-LD n'est **jamais généré par l'IA** : assemblage déterministe à partir des données structurées, pour éliminer tout risque d'invention.
- **Build Astro + Cloudflare Pages** : chaque site publié est un projet Astro à composants réutilisables (pas du HTML mono-fichier), compilé à partir du contenu D1 puis déployé. Détail complet en section 15, qui remplace l'approche mono-fichier Jordan Pearce pour ce SaaS.
- **Jobs de synchronisation** (GBP et site existant) : déclenchés à la demande (bouton "Vérifier la synergie") plutôt qu'en cron automatique pour la V1.

### Ordre de construction MVP

| Étape | Livrable | Dépend de |
|---|---|---|
| 1 | Modèle de données D1 (tables + Cloudflare Access) | — |
| 2 | `/gbp/diagnose` + `/site/extract` + formulaire d'intake unifié | 1 |
| 3 | `/generate-page` pour Home + Service (2 types seulement) | 1, 2 |
| 4 | Génération JSON-LD déterministe (site + page) | 3 |
| 5 | Squelette Astro (layout + composants de base) + build/déploiement Cloudflare Pages | 3, 4 |
| 6 | Dashboard admin minimal (liste pages, statuts) | 3, 5 |
| 7 | Extension aux autres types de page + matrice Services × Locations | 3-6 validés |

Ne pas commencer par le dashboard ou par un type de page exotique. Tant que Home et Service ne tournent pas de bout en bout (intake → génération → schema → publication), le reste ne sert à rien.

---

## 12. Point d'entrée de l'onboarding — URL existante, GBP, ou formulaire vierge

Le moteur doit accepter **trois sources d'intake**, combinables, pas un choix exclusif. Ça complète le diagnostic GBP de la section 8 avec une troisième source : le site existant du client, s'il en a un.

### 12.1 Extraction depuis une URL existante

Réutilise directement la méthodologie de votre `site-consistency-auditor` (mode AUTO) :

1. Récupérer `sitemap.xml` (ou `/sitemap_index.xml`, `/page-sitemap.xml` en repli), sinon crawler les liens internes depuis la page d'accueil
2. Cap à 50 pages pour un site TPE/PME, signaler et demander confirmation au-delà
3. Extraire par page : NAP (balises `<address>`, footer, `tel:`, `itemprop`), tout JSON-LD existant (parsé et typé), headings + premier paragraphe (candidats de copy pour About/Services), horaires, mentions légales/certifications, témoignages détectés, images candidates pour les slots hero/team
4. Ne **jamais publier tel quel** : chaque champ extrait alimente un formulaire de pré-remplissage, jamais directement une page publiée sans validation humaine — c'est un brouillon de départ, pas un import définitif

### 12.2 Les 4 scénarios d'onboarding possibles

| Scénario | Site existant | GBP | Comportement du moteur |
|---|---|---|---|
| 1 | Oui | Oui | Extraction du site en parallèle du diagnostic GBP (section 8.0). Réconciliation : le GBP reste prioritaire pour NAP/services (section 8), le site existant enrichit la copy (about, témoignages, ton) et signale les écarts entre les deux |
| 2 | Oui | Non | Extraction du site, puis recommandation explicite de créer/réclamer un GBP avant de continuer — le GBP reste la pièce qui fait ranker, pas le site (principe de la section 8) |
| 3 | Non | Oui | Flux déjà décrit en section 8 : génération depuis le GBP |
| 4 | Non | Non | Formulaire vierge complet (business profile, services, credentials de la section 10), avec la même recommandation de créer un GBP en parallèle |

### 12.3 Réconciliation à 3 sources — priorité des champs

Étendre le modèle de Master Record (déjà utilisé pour le NAP en section 8) à une troisième source :

```json
{
  "gbp_source": { "...": "voir section 8" },
  "site_scrape_source": {
    "url": "",
    "extracted_at": "",
    "nap_found": {},
    "services_mentioned": [],
    "about_copy_candidate": "",
    "testimonials_found": [],
    "certifications_mentioned": [],
    "images_found": [],
    "existing_schema": {}
  },
  "field_priority": "gbp > site_scrape > manual_form"
}
```

**Règle de priorité par défaut** : le GBP l'emporte toujours sur le site existant pour NAP et liste de services (c'est la source de ranking). Le site existant l'emporte sur une génération IA pure pour tout ce qui est ton/voix/contenu déjà validé par le client (about, témoignages). Le formulaire manuel comble ce qu'aucune des deux sources automatiques n'a fourni. Tout champ où les trois sources divergent est signalé à l'utilisateur pour arbitrage, jamais résolu silencieusement.

---

## 13. Flux d'onboarding — écran par écran

### Écran 1 — Point d'entrée
Deux boutons, pas de formulaire vierge par défaut : **"J'ai un site existant"** (champ URL) ou **"Je n'ai pas de site"** (passe direct à l'écran 2). Si URL fournie → appel `/site/extract` (section 12.1), état de chargement, puis retour à l'utilisateur : liste des champs trouvés vs absents, jamais publiés tel quel.

### Écran 2 — GBP
Question unique : **"Avez-vous une fiche Google Business Profile ?"**
- Oui → coller les infos ou connecter l'API si le client l'autorise → déclenche `/gbp/diagnose` (section 8.0)
- Non → recommandation d'en créer un avant de continuer (scénario 2/4 de la section 12.2), non bloquant mais signalé en priorité

### Écran 3 — Réconciliation à 3 sources
Tableau champ par champ (Nom, NAP, Services, Horaires, Catégories) avec pour chaque ligne : la valeur retenue, sa source (GBP / site existant / à saisir), et un badge de statut :
- 🟢 Confirmé (une seule source, ou sources d'accord)
- 🟡 À arbitrer (les sources divergent — jamais résolu silencieusement, section 12.3)
- 🔴 Manquant (aucune des sources automatiques ne l'a fourni)

Si scénario B de la section 8.0 (GBP incomplet) : affichage de la checklist d'actions GBP à part, dans un encart distinct, non mélangée au reste du formulaire.

### Écran 4 — Complétion manuelle
Formulaire limité aux champs encore 🔴 ou 🟡 après réconciliation. Regroupé en 3 blocs : identité légale (SIRET/EIN, RCS, TVA), credentials et équipe (section 10.5), esthétique (choix du preset Minimaliste/Moderne/Industriel). Jamais de champ déjà rempli en 🟢 réaffiché ici, pour ne pas faire ressaisir ce qui est confirmé.

### Écran 5 — Génération
Déclenche `/generate-page` uniquement pour Home + pages essentielles dans un premier temps (ordre MVP de la section 11), pas la matrice complète Services × Locations d'un coup. Chaque page générée arrive en statut `draft`, jamais `published` automatiquement.

### Écran 6 — Revue et publication
Reprend le pattern déjà vu chez le concurrent analysé (section 2) : liste des pages avec statut, bouton "Publier" par page ou groupé, aperçu avant publication. C'est seulement à cette étape que la matrice Services × Locations complète devient accessible pour extension.

---

## 14. Endpoints API — payloads exacts, recommandation IA, mise en place infra

Décisions actées : usage 100% interne Monsieur Click (pas de multi-tenant client, pas de billing), tout l'hébergement passe par votre API Cloudflare (votre compte + accès délégué aux comptes Cloudflare de vos clients).

### 14.0 D1 (Cloudflare) plutôt que Supabase — est-ce viable sur un compte gratuit ?

Important : les chiffres donnés précédemment étaient ceux du plan **Workers Paid**. Sur un compte **gratuit**, les plafonds sont nettement plus bas. Revérifié en direct sur la documentation et des sources récentes (juin-juillet 2026) :

| Ressource | Plan gratuit | Plan Workers Paid (5$/mois) |
|---|---|---|
| D1 — taille max par base | 500 Mo | 10 Go |
| D1 — stockage total compte | 5 Go | 1 To |
| D1 — bases par compte | 10 | 50 000 |
| Workers — requêtes/jour | 100 000 | Illimité |
| Workers — temps CPU par requête | 10 ms | 30 s par défaut (jusqu'à 5 min) |
| Workers — sous-requêtes externes par invocation | 50 | 10 000 (configurable) |
| Workers — Cron Triggers par Worker | 3 | 5 |
| R2 — stockage | 10 Go/mois | payant au-delà |
| Cloudflare Pages — builds | 500/mois | payant au-delà |

**Verdict pour votre cas (usage interne, un seul utilisateur) : le plan gratuit suffit largement pour démarrer**, avec un point de vigilance réel et un ajustement d'architecture nécessaire :

- **500 Mo par base D1** : largement suffisant pour du texte/JSON de sites locaux (pas d'images, elles vont en R2). Aucun risque à court/moyen terme, à surveiller si le nombre de sites clients devient important sur plusieurs années
- **10 ms de temps CPU par requête Worker** : c'est la vraie contrainte. Les appels aux API externes (Claude, fal.ai, DeepSeek) n'entrent pas dans ce budget CPU pendant qu'ils attendent la réponse — seul le traitement local (parsing JSON, validation) compte. Mais ça impose un **ajustement de conception** : ne jamais assembler tout un site (toutes les pages) en une seule invocation Worker. Le build statique doit être **découpé page par page**, une invocation = une page, jamais un job monolithique qui boucle sur 30 pages d'affilée
- **50 sous-requêtes externes par invocation** : suffisant pour un appel IA + quelques requêtes D1 par invocation, mais ne pas faire du fan-out vers plusieurs fournisseurs IA dans le même appel

**Recommandation** : démarrer sur le plan gratuit, concevoir dès maintenant le build statique en pipeline page-par-page (pas de refonte nécessaire plus tard si un jour vous passez au plan payant à 5$/mois, ce qui reste une option bon marché si une limite devient réellement gênante).

**Ce que vous gagnez à passer sur D1 plutôt que Supabase** : un seul fournisseur/API pour toute l'infra (base + hébergement + stockage), colocalisation avec les Workers (latence quasi nulle entre l'API et la base), cohérent avec le fait que vous pilotez déjà tout via votre compte Cloudflare et vos accès délégués clients.

**Ce que vous perdez** : Supabase inclut un service d'Auth prêt à l'emploi et un client SQL plus riche (Postgres, JSONB natif). En usage interne mono-utilisateur, l'Auth complet ne sert à rien — **Cloudflare Access** (Zero Trust) suffit largement pour protéger le dashboard, sans code d'authentification à écrire. Pour le SQL, D1 (SQLite) couvre tout ce que ce projet nécessite : pas de requêtes JSONB complexes ici, juste des tables relationnelles classiques.

**Verdict** : D1 + R2 + Workers + Cloudflare Access, pas de Supabase.

### 14.1 Recommandation de modèles IA — approche multi-fournisseurs

Vous avez raison de vouloir regarder ChatGPT et DeepSeek en plus de Claude — répartir par nature de tâche et par volume plutôt qu'un seul fournisseur pour tout :

| Tâche | Modèle recommandé | Pourquoi |
|---|---|---|
| Copy Home + About (StoryBrand, sensible) | Claude Sonnet 5 | Qualité et nuance les plus critiques, faible volume d'appels |
| Pages Service/Location en masse (matrice complète) | DeepSeek ou Claude Haiku 4.5 | Fort volume (potentiellement des dizaines par site), coût par appel déterminant, exigence qualité plus tolérante à cette échelle |
| Diagnostic GBP + extraction de site existant | Claude Haiku 4.5 | Classification/extraction factuelle, peu coûteux |
| Génération d'images (hero, team, OG) | **fal.ai** | Génération rapide, catalogue de modèles image (SDXL/Flux et équivalents), s'intègre bien à un pipeline par appel API sans gérer d'infra GPU |
| Schema JSON-LD | Aucun modèle | Toujours déterministe par code |

Architecture recommandée : une **couche d'abstraction IA** dans le backend (un seul point d'appel interne type `generateContent(task, payload)`) qui route vers Claude, ChatGPT ou DeepSeek selon la tâche — pas de dépendance codée en dur à un seul fournisseur. Ça permet de tester ChatGPT/DeepSeek sur les pages en masse sans toucher au reste du pipeline.

Point de prudence : je n'ai pas de comparatif qualité/prix à jour et fiable entre Claude Haiku, DeepSeek et ChatGPT sur ce cas d'usage précis (copy SEO locale). C'est une hypothèse de répartition raisonnable, à valider par un test réel sur quelques pages avant de généraliser.

### 14.2 Mise en place infrastructure

1. **Base D1** créée dans votre compte Cloudflare (plan gratuit), un schéma unique reprenant les tables listées en section 11
2. **Bucket R2** pour les images générées (fal.ai) et celles éventuellement extraites d'un site existant (section 12.1) — 10 Go/mois gratuits, largement suffisant pour démarrer
3. **Worker API** exposant les 4 endpoints (section 14.3), avec toutes les clés (Anthropic, OpenAI, DeepSeek, fal.ai) stockées en secrets Worker, jamais côté frontend
4. **Cloudflare Access** devant le dashboard admin pour l'authentification, plutôt qu'un système d'auth applicatif à coder
5. **Build statique conçu page par page dès le départ** (contrainte des 10 ms CPU/requête sur le plan gratuit, section 14.0) : le job `/publish-site` orchestre plusieurs invocations, une par page, jamais une boucle unique sur tout le site
6. **Déploiement des sites générés** : deux cas selon le compte cible (voir 14.3bis)

### 14.3 Endpoints — payloads exacts

**`POST /gbp/diagnose`**
```json
// Request
{
  "business_name": "",
  "categories": { "primary": "", "secondary": [] },
  "services": [],
  "description_length": 0,
  "photos_count": 0,
  "attributes_completed": true,
  "hours_provided": true,
  "qa_count": 0
}
// Response
{
  "optimization_status": "optimized | needs_action",
  "score_breakdown": { "categories": "ok|missing", "services": "ok|missing", "description": "ok|missing", "photos": "ok|missing", "attributes": "ok|missing", "qa": "ok|missing" },
  "gbp_action_checklist": []
}
```

**`POST /site/extract`**
```json
// Request
{ "url": "" }
// Response
{
  "pages_crawled": 0,
  "nap_found": {},
  "services_mentioned": [],
  "about_copy_candidate": "",
  "testimonials_found": [],
  "certifications_mentioned": [],
  "images_found": [],
  "existing_schema": {},
  "warnings": []
}
```

**`POST /generate-page`**
```json
// Request
{
  "business_profile": {},
  "page_type": "home | category | service | location | about | contact",
  "service": null,
  "location": null
}
// Response : le contrat JSON exact du type de page (section 7/9), status "draft"
```

**`POST /generate-image`**
```json
// Request
{ "slot": "hero | team | og", "prompt_context": {}, "site_id": "" }
// Response
{ "image_url": "", "storage": "r2" }
```

### 14.3bis — `POST /publish-site` : cible Cloudflare selon le compte

Puisque vous gérez à la fois votre propre compte Cloudflare et un accès délégué sur celui de vos clients, l'endpoint doit choisir la bonne cible :

```json
// Request
{
  "site_id": "",
  "page_ids": [],
  "cloudflare_target": "internal | client_delegated",
  "client_cloudflare_account_id": null
}
// Response
{ "build_status": "success | failed", "deployed_url": "", "pages_published": [] }
```

Les tokens d'accès délégué par client sont stockés chiffrés (secrets Worker ou KV chiffré), jamais en clair en base ni côté frontend — même règle que pour la clé API IA. Le choix du modèle IA (Sonnet/Haiku/DeepSeek/ChatGPT) est toujours décidé côté backend selon `page_type`, jamais transmis par le client dans le payload.

---

## 15. Rendu Astro — composants réutilisables plutôt que HTML mono-fichier

Changement de cap assumé pour ce SaaS : la méthode Jordan Pearce (un fichier HTML/CSS/JS autonome) reste valable pour une landing one-shot ponctuelle, mais **pour ce SaaS, chaque site généré est un vrai projet Astro** — composants réutilisables, CSS moderne à classes et tokens, growable dans le temps.

### 15.1 Pourquoi Astro spécifiquement
- Rendu HTML statique par défaut (zero JS envoyé au client sauf composants explicitement hydratés) → excellent pour Core Web Vitals (section 5)
- Compatible avec un adapter Cloudflare officiel, cohérent avec toute la stack déjà posée (D1, R2, Pages)
- Architecture par composants sans imposer un framework JS lourd côté client, contrairement à du Next.js complet pour un simple site vitrine

### 15.2 Structure du projet Astro (un seul repo template, réutilisé pour tous les sites)

```
src/
├── components/
│   ├── Header.astro
│   ├── Footer.astro
│   ├── Hero.astro              # badge H1 + titre StoryBrand H2 (section 9)
│   ├── ServiceCard.astro
│   ├── TestimonialCard.astro
│   ├── FaqAccordion.astro
│   ├── TrustBadges.astro
│   ├── StatsBar.astro
│   ├── ProcessSteps.astro
│   ├── PricingTiers.astro
│   ├── Breadcrumbs.astro
│   └── SchemaScript.astro      # injecte le JSON-LD (site ou page)
├── layouts/
│   └── BaseLayout.astro        # Header + Footer partout, meta tags, schema site-level
├── pages/
│   └── [...slug].astro         # génère toutes les pages à partir du contenu D1
└── styles/
    └── tokens.css              # variables CSS : couleurs, fonts, spacing (section 6)
```

Chaque composant correspond directement à un bloc du contrat JSON de page (sections 7 et 9) : `ServiceCard` reçoit les props d'un item de `service_details`, `FaqAccordion` reçoit le tableau `faq`, `TestimonialCard` reçoit un item de `testimonial_bank`, etc. Aucun contenu codé en dur dans un composant : tout arrive en props depuis les données.

### 15.3 Tokens et design system
`tokens.css` reprend exactement le système de la section 6, mais comme fichier Astro global plutôt que style inline :
```css
:root {
  --color-primary: var(--site-primary, #1D9E75);
  --color-secondary: var(--site-secondary, #0C447C);
  --font-heading: var(--site-font-heading, 'Inter', sans-serif);
  --spacing-unit: 8px;
  --radius-base: 8px;
}
```
Les valeurs `--site-*` sont injectées au build selon le preset esthétique choisi (Minimaliste/Moderne/Industriel) et la palette issue de la recherche secteur. Un seul design system, décliné par site via ces variables, jamais un fichier CSS dupliqué par site.

### 15.4 D'où vient le contenu au build — pas de binding Worker classique
Le build Astro tourne dans l'environnement de build Cloudflare Pages, **pas** dans le runtime Workers : il n'a donc pas accès à D1 via binding direct comme le ferait un Worker. Il interroge D1 via l'**API HTTP de requête D1** (authentifiée par token, appelée depuis le script de build Astro comme un fetch classique), pour récupérer tout le contenu du site à builder (pages, services, testimonials, schema) avant de générer les fichiers statiques.

### 15.5 Ce que ça change à la contrainte des 10 ms CPU (section 14.0)
Point de clarification important : la limite de 10 ms de CPU par requête s'applique aux **Workers** (vos endpoints `/generate-page`, `/gbp/diagnose`, etc.), **pas au build Astro lui-même**, qui tourne dans le pipeline de build Cloudflare Pages avec ses propres limites (nombre de builds/mois, pas de plafond CPU par requête de ce type). Le conseil de découper la génération de contenu page par page (section 14.0) reste valable pour les appels IA, mais le build Astro peut tout à fait compiler un site complet en une seule opération de build, ce n'est pas soumis à la même contrainte.

### 15.6 Pipeline `/publish-site` révisé
1. L'endpoint récupère toutes les pages `draft` prêtes du site depuis D1
2. Déclenche un build Astro (le script de build interroge D1 via l'API HTTP, section 15.4) avec les tokens du preset esthétique du site
3. Déploie l'output statique sur Cloudflare Pages — compte interne ou compte client délégué selon `cloudflare_target` (section 14.3bis)
4. Marque les pages publiées comme `published` en retour

---

## Sources consultées pour ce document
- Vos skills internes : core30-structure, core30-scope-estimate, core30-links-schema, core30-page-writing, core30-gbp-optimization, local-seo-ranking-system, jordan-pearce-landing, cite-me, semantic-storybrand-skill, site-consistency-auditor, storybrand-landing-page
- The Website Specification (specification.website), interrogée en direct via son MCP pour les catégories foundations, SEO, accessibility, security, agent-readiness, performance, privacy, resilience
- Documentation et limites Cloudflare (D1, Workers, R2), plans gratuit et payant, vérifiées en direct pour les plafonds à jour (juin-juillet 2026)
