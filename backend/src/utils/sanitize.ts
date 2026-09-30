/**
 * Strip HTML/script tags and trim whitespace from user input.
 * Prevents stored XSS in receipt footers, product names, etc.
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/<[^>]*>/g, '')          // remove HTML tags
    .replace(/[<>]/g, '')              // remove stray angle brackets
    .trim();
}

/**
 * Sanitize optional string — returns undefined if empty.
 */
export function sanitizeOptionalString(
  input: string | null | undefined
): string | undefined {
  if (!input) return undefined;
  const cleaned = sanitizeString(input);
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Normalize phone number to Kenya format digits.
 * "0712 345 678" → "0712345678"
 * "+254712345678" → "0712345678"
 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) {
    return '0' + digits.slice(3);
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return digits;
  }
  return digits;
}

/**
 * Normalize email — lowercase + trim.
 */
export function normalizeEmail(input: string): string {
  return input.toLowerCase().trim();
}
