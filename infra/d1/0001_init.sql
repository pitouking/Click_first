-- Click_first D1 schema (MVP) — tables from kickoff brief / spec §11
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  primary_category TEXT,
  url TEXT,
  price_range TEXT,
  aesthetic_preset TEXT DEFAULT 'moderne',
  cloudflare_target TEXT DEFAULT 'internal',
  client_cloudflare_account_id TEXT,
  client_cloudflare_token_encrypted TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  page_type TEXT NOT NULL,
  slug TEXT NOT NULL,
  title_tag TEXT,
  meta_description TEXT,
  h1 TEXT,
  content_json TEXT NOT NULL DEFAULT '{}',
  schema_json TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'a_completer')),
  service_name TEXT,
  location_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (site_id, slug)
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'gbp' CHECK (source IN ('gbp', 'manual', 'site_scrape')),
  has_gbp_equivalent INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (site_id, name)
);

CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (site_id, name)
);

CREATE TABLE IF NOT EXISTS gbp_source (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL UNIQUE REFERENCES sites(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  nap_json TEXT NOT NULL DEFAULT '{}',
  categories_json TEXT NOT NULL DEFAULT '{}',
  services_json TEXT NOT NULL DEFAULT '[]',
  hours_json TEXT NOT NULL DEFAULT '[]',
  description TEXT,
  photos_count INTEGER DEFAULT 0,
  qa_count INTEGER DEFAULT 0,
  attributes_completed INTEGER DEFAULT 0,
  optimization_status TEXT DEFAULT 'needs_action',
  gbp_action_checklist_json TEXT NOT NULL DEFAULT '[]',
  last_synced TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS site_scrape_source (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  pages_crawled INTEGER DEFAULT 0,
  nap_json TEXT NOT NULL DEFAULT '{}',
  services_json TEXT NOT NULL DEFAULT '[]',
  about_copy_candidate TEXT,
  testimonials_json TEXT NOT NULL DEFAULT '[]',
  certifications_json TEXT NOT NULL DEFAULT '[]',
  images_json TEXT NOT NULL DEFAULT '[]',
  existing_schema_json TEXT NOT NULL DEFAULT '{}',
  warnings_json TEXT NOT NULL DEFAULT '[]',
  scraped_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_status (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL UNIQUE REFERENCES sites(id) ON DELETE CASCADE,
  missing_on_site_json TEXT NOT NULL DEFAULT '[]',
  missing_on_gbp_json TEXT NOT NULL DEFAULT '[]',
  nap_mismatch INTEGER NOT NULL DEFAULT 0,
  last_check TEXT
);

CREATE TABLE IF NOT EXISTS testimonial_bank (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  author_name TEXT,
  quote TEXT NOT NULL,
  rating INTEGER,
  source TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role_title TEXT,
  bio TEXT,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS credentials (
  id TEXT PRIMARY KEY,
  team_member_id TEXT NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL,
  label TEXT NOT NULL,
  issuer TEXT,
  year INTEGER,
  school TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pages_site ON pages(site_id);
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(site_id, status);
CREATE INDEX IF NOT EXISTS idx_services_site ON services(site_id);
CREATE INDEX IF NOT EXISTS idx_locations_site ON locations(site_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_site ON testimonial_bank(site_id);
CREATE INDEX IF NOT EXISTS idx_team_site ON team_members(site_id);
