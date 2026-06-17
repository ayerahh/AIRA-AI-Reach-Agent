/**
 * Validates required environment variables at startup.
 * Logs clear warnings for missing values so misconfiguration is obvious in logs.
 */

export function validateEnv(): void {
  const warnings: string[] = [];

  if (!process.env.GROQ_API_KEY) {
    warnings.push("GROQ_API_KEY is not set — AI reasoning will fall back to deterministic mode.");
  }

  if (!process.env.CHANNEL_SERVICE_URL) {
    warnings.push("CHANNEL_SERVICE_URL is not set — defaulting to http://localhost:3001.");
  }

  if (!process.env.WEBHOOK_SECRET) {
    warnings.push("WEBHOOK_SECRET is not set — webhook callbacks are unauthenticated.");
  }

  for (const w of warnings) {
    console.warn(`[AIRA env] ${w}`);
  }
}
