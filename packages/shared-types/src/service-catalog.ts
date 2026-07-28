/**
 * Catalog of local services used by the demo / intake profiles.
 * Grouped by métier — GBP `services` stays a flat list of exact labels.
 */
export const SERVICE_CATALOG = {
  "Énergie & Isolation": ["Photovoltaïque", "Isolation"],
  "Construction & Rénovation": [
    "Maçonnerie",
    "Rénovation",
    "Terrassement",
    "Piscines",
    "Revêtement des sols",
  ],
} as const;

export const ALL_CATALOG_SERVICES = Object.values(SERVICE_CATALOG).flat();
