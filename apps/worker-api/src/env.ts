export interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
  ENVIRONMENT: string;
  ASTRO_CONTENT_DIR?: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  FAL_AI_API_KEY?: string;
  CLOUDFLARE_API_TOKEN?: string;
}
