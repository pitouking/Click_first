export interface Env {
  DB: D1Database;
  /** Optional until R2 is enabled on the Cloudflare account. */
  IMAGES?: R2Bucket;
  ENVIRONMENT: string;
  ASTRO_CONTENT_DIR?: string;
  /** Shared secret for dashboard/API access (Bearer). */
  TOOL_ACCESS_TOKEN?: string;
  /** Default AI provider: openai | deepseek | anthropic | auto */
  AI_PROVIDER?: string;
  /** OpenAI model id (default gpt-4o) */
  OPENAI_MODEL?: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  FAL_AI_API_KEY?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
}
