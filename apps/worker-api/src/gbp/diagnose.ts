import type { GbpDiagnoseRequest, GbpDiagnoseResponse, CriterionStatus } from "@click-first/shared-types";

/** Deterministic GBP scoring — thresholds from spec §8.0 */
export function diagnoseGbp(input: GbpDiagnoseRequest): GbpDiagnoseResponse {
  const secondary = input.categories.secondary || [];
  const categoryCount = (input.categories.primary ? 1 : 0) + secondary.length;

  const categories: CriterionStatus =
    categoryCount >= 2 && categoryCount <= 10 ? "ok" : "missing";
  const services: CriterionStatus = input.services.length >= 20 ? "ok" : "missing";
  const description: CriterionStatus = input.description_length >= 750 ? "ok" : "missing";
  const photos: CriterionStatus = input.photos_count >= 20 ? "ok" : "missing";
  const attributes: CriterionStatus = input.attributes_completed ? "ok" : "missing";
  const qa: CriterionStatus = input.qa_count >= 5 ? "ok" : "missing";

  const checklist: string[] = [];
  if (categories === "missing") {
    checklist.push("Ajouter 2 à 10 catégories GBP (primaire + secondaires), jamais une seule.");
  }
  if (services === "missing") {
    checklist.push(
      `Passer de ${input.services.length} à au moins 20 services GBP (cible compétitive 30+).`,
    );
  }
  if (description === "missing") {
    checklist.push("Réécrire la description GBP pour utiliser ~750 caractères.");
  }
  if (photos === "missing") {
    checklist.push(`Publier au moins 20 photos (actuellement ${input.photos_count}).`);
  }
  if (attributes === "missing") {
    checklist.push("Renseigner tous les attributs GBP (aucun laissé vide).");
  }
  if (qa === "missing") {
    checklist.push("Ajouter au moins 5 questions/réponses proactives sur la fiche.");
  }

  const optimization_status =
    checklist.length === 0 ? ("optimized" as const) : ("needs_action" as const);

  return {
    optimization_status,
    score_breakdown: { categories, services, description, photos, attributes, qa },
    gbp_action_checklist: checklist,
  };
}
