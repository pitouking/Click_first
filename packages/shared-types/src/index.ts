/** Shared contracts — source of truth aligned with spec-seo-templates-saas.md */

export type PageStatus = "draft" | "published" | "a_completer";
export type PageType = "home" | "category" | "service" | "location" | "about" | "contact";
export type OptimizationStatus = "optimized" | "needs_action";
export type CriterionStatus = "ok" | "missing";
export type CloudflareTarget = "internal" | "client_delegated";
export type ImageSlot = "hero" | "team" | "og";
export type AiTask =
  | "home_copy"
  | "about_copy"
  | "service_copy"
  | "location_copy"
  | "gbp_diagnose"
  | "site_extract";

export interface Nap {
  address?: string;
  streetAddress?: string;
  addressLocality?: string;
  postalCode?: string;
  addressCountry?: string;
  phone?: string;
}

export interface BusinessProfile {
  site_id?: string;
  business_name: string;
  nap: Nap;
  primary_category?: string;
  secondary_categories?: string[];
  services: string[];
  locations: string[];
  hours?: OpeningHours[];
  description?: string;
  url?: string;
  priceRange?: string;
  geo?: { latitude?: number; longitude?: number };
  siret?: string;
  sameAs?: string[];
  /** Fields flagged missing — never invent values */
  missing_fields?: string[];
}

export interface OpeningHours {
  dayOfWeek: string[];
  opens: string;
  closes: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ServiceDetailSection {
  h2: string;
  content: string;
}

export interface PageSectionsHome {
  hero: {
    badge_h1: string;
    storybrand_title: string;
    subtitle: string;
    cta_label: string;
  };
  intro: string;
  services_overview: { name: string; summary: string }[];
  trust_building: string;
  faq: FaqItem[];
  cta: string;
}

export interface PageSectionsService {
  intro: string;
  service_details: ServiceDetailSection[];
  trust_building: string;
  faq: FaqItem[];
  cta: string;
}

export interface PageContentBase {
  page_type: PageType;
  slug: string;
  title_tag: string;
  meta_description: string;
  h1: string;
  schema: { type: string; auto_generated: true };
  images: { hero?: string; og?: string };
  internal_links?: { parent_category?: string; related_services?: string[] };
  status: PageStatus;
}

export interface HomePageContent extends PageContentBase {
  page_type: "home";
  sections: PageSectionsHome;
}

export interface ServicePageContent extends PageContentBase {
  page_type: "service";
  sections: PageSectionsService;
}

export type PageContent = HomePageContent | ServicePageContent | PageContentBase;

export interface GbpDiagnoseRequest {
  business_name: string;
  categories: { primary: string; secondary: string[] };
  services: string[];
  description_length: number;
  photos_count: number;
  attributes_completed: boolean;
  hours_provided: boolean;
  qa_count: number;
}

export interface GbpDiagnoseResponse {
  optimization_status: OptimizationStatus;
  score_breakdown: {
    categories: CriterionStatus;
    services: CriterionStatus;
    description: CriterionStatus;
    photos: CriterionStatus;
    attributes: CriterionStatus;
    qa: CriterionStatus;
  };
  gbp_action_checklist: string[];
}

export interface SiteExtractRequest {
  url: string;
}

export interface SiteExtractResponse {
  pages_crawled: number;
  nap_found: Nap;
  services_mentioned: string[];
  about_copy_candidate: string;
  testimonials_found: string[];
  certifications_mentioned: string[];
  images_found: string[];
  existing_schema: Record<string, unknown>;
  warnings: string[];
}

export interface GeneratePageRequest {
  business_profile: BusinessProfile;
  page_type: PageType;
  service?: string | null;
  location?: string | null;
  site_id?: string;
}

export interface GenerateImageRequest {
  slot: ImageSlot;
  prompt_context: Record<string, unknown>;
  site_id: string;
}

export interface GenerateImageResponse {
  image_url: string;
  storage: "r2";
}

export interface PublishSiteRequest {
  site_id: string;
  page_ids: string[];
  cloudflare_target: CloudflareTarget;
  client_cloudflare_account_id?: string | null;
}

export interface PublishSiteResponse {
  build_status: "success" | "failed";
  deployed_url: string;
  pages_published: string[];
  missing_fields?: string[];
}

export interface DashboardPageRow {
  id: string;
  site_id: string;
  page_type: PageType;
  slug: string;
  title_tag: string;
  status: PageStatus;
  updated_at: string;
}
