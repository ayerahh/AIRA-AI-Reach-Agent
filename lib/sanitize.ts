/**
 * Lightweight input sanitization for customer data.
 * Strips HTML tags and trims whitespace to prevent stored XSS.
 * No external dependency — regex is sufficient for these fields.
 */

export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}

export function sanitizeEmail(email: string): string {
  return stripHtml(email).toLowerCase();
}

export function sanitizeName(name: string): string {
  // Allow letters, spaces, hyphens, apostrophes — block everything else
  return stripHtml(name).replace(/[^a-zA-Z\s\-'.]/g, "").trim();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
