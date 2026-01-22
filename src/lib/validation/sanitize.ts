import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content - allows basic formatting tags
 * Use for: Quest descriptions, Habit notes, Profile bios
 *
 * @param input - HTML string to sanitize (can be null/undefined)
 * @returns Sanitized HTML string (empty string if input is null/undefined)
 *
 * @example
 * sanitizeHtml('<script>alert(1)</script><b>Safe text</b>')
 * // Returns: '<b>Safe text</b>'
 */
export function sanitizeHtml(input: string | undefined | null): string {
  if (!input) return '';

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br'],
    ALLOWED_ATTR: ['href'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize text - strips ALL HTML tags
 * Use for: Titles, names, single-line inputs
 *
 * @param input - Text that may contain HTML (can be null/undefined)
 * @returns Plain text with all HTML removed (empty string if input is null/undefined)
 *
 * @example
 * sanitizeText('<script>alert(1)</script>Hello')
 * // Returns: 'Hello'
 */
export function sanitizeText(input: string | undefined | null): string {
  if (!input) return '';

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Check if input contains potentially dangerous content
 * Returns true if input is safe, false if suspicious
 *
 * @param input - String to check for XSS patterns
 * @returns true if input appears safe, false if suspicious patterns detected
 *
 * @example
 * isSafeInput('Normal text')
 * // Returns: true
 *
 * isSafeInput('<script>alert(1)</script>')
 * // Returns: false
 */
export function isSafeInput(input: string): boolean {
  const dangerous = /<script|javascript:|on\w+=/i;
  return !dangerous.test(input);
}
