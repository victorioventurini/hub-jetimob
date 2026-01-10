/**
 * Name utilities for consistent name handling across the system
 * 
 * STANDARD: Always use first name only in greetings and informal contexts.
 * Nobody says "Olá, Nome Sobrenome" - it's always "Olá, Nome"
 */

/**
 * Extracts the first name from a full name or display name.
 * Handles null/undefined gracefully.
 * 
 * @example
 * getFirstName("Victorio Venturini") // "Victorio"
 * getFirstName("Maria") // "Maria"
 * getFirstName(null) // undefined
 */
export function getFirstName(name: string | null | undefined): string | undefined {
  if (!name) return undefined;
  return name.split(' ')[0].trim();
}

/**
 * Gets the appropriate name for greetings - always uses first name only.
 * Falls back through first_name -> display_name (first word) -> undefined
 */
export function getGreetingName(
  firstName?: string | null, 
  displayName?: string | null
): string | undefined {
  if (firstName) return firstName;
  return getFirstName(displayName);
}

/**
 * Formats a name for display in informal contexts (first name only)
 */
export function formatInformalName(name: string | null | undefined): string {
  return getFirstName(name) || '';
}
