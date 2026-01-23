/**
 * Phone Number Utilities
 * 
 * Centralized utilities for Brazilian phone number handling.
 * 
 * STORAGE FORMAT: Only digits (e.g., "5551999999999")
 * DISPLAY FORMAT: +55 (XX) XXXXX-XXXX or +55 (XX) XXXX-XXXX
 * 
 * @see docs/canonical/DEVELOPMENT_STANDARDS.md
 */

/**
 * Normalizes a phone number to storage format (digits only).
 * Automatically adds Brazil DDI (55) if missing.
 * 
 * @example
 * normalizePhone("+55 (51) 99999-9999") => "5551999999999"
 * normalizePhone("51999999999") => "5551999999999"
 * normalizePhone("999999999") => null (invalid)
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  let digits = phone.replace(/\D/g, '');
  
  // If 10 or 11 digits (DDD + number), add Brazil DDI
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }
  
  // Valid Brazilian phone: 55 + DDD (2) + number (8 or 9) = 12 or 13 digits
  if (digits.length === 12 || digits.length === 13) {
    if (digits.startsWith('55')) {
      return digits;
    }
  }
  
  return null;
}

/**
 * Formats a normalized phone number for display.
 * 
 * @example
 * formatPhoneDisplay("5551999999999") => "+55 (51) 99999-9999"
 * formatPhoneDisplay("5551999999") => "+55 (51) 9999-9999"
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return '';
  
  const digits = phone.replace(/\D/g, '');
  
  // Brazilian mobile with DDI: 55 + DDD (2) + number (9) = 13 digits
  if (digits.length === 13 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const part1 = digits.slice(4, 9);
    const part2 = digits.slice(9);
    return `+55 (${ddd}) ${part1}-${part2}`;
  }
  
  // Brazilian landline with DDI: 55 + DDD (2) + number (8) = 12 digits
  if (digits.length === 12 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const part1 = digits.slice(4, 8);
    const part2 = digits.slice(8);
    return `+55 (${ddd}) ${part1}-${part2}`;
  }
  
  // Mobile without DDI: DDD (2) + number (9) = 11 digits
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  
  // Landline without DDI: DDD (2) + number (8) = 10 digits
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  
  // Return as-is if format not recognized
  return phone;
}

/**
 * Formats input value with mask while typing.
 * Shows masked format, but allows flexible input.
 * 
 * @example
 * formatPhoneInput("55") => "+55"
 * formatPhoneInput("5551") => "+55 (51"
 * formatPhoneInput("55519") => "+55 (51) 9"
 * formatPhoneInput("5551999999999") => "+55 (51) 99999-9999"
 */
export function formatPhoneInput(value: string): string {
  let digits = value.replace(/\D/g, '');
  
  // Auto-add Brazil DDI for 10 or 11 digit inputs (DDD + number)
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith('55')) {
    digits = `55${digits}`;
  }
  
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `+${digits}`;
  if (digits.length <= 4) return `+${digits.slice(0, 2)} (${digits.slice(2)}`;
  if (digits.length <= 6) return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4)}`;
  
  // For 12 digits (landline with DDI): +55 (XX) XXXX-XXXX
  if (digits.length <= 12) {
    const ddd = digits.slice(2, 4);
    const firstPart = digits.slice(4, 8);
    const secondPart = digits.slice(8, 12);
    return `+${digits.slice(0, 2)} (${ddd}) ${firstPart}${secondPart ? '-' + secondPart : ''}`;
  }
  
  // For 13 digits (mobile with DDI): +55 (XX) XXXXX-XXXX
  const ddd = digits.slice(2, 4);
  const firstPart = digits.slice(4, 9);
  const secondPart = digits.slice(9, 13);
  return `+${digits.slice(0, 2)} (${ddd}) ${firstPart}${secondPart ? '-' + secondPart : ''}`;
}

/**
 * Validates if a phone number is valid for storage.
 * 
 * @example
 * isValidPhone("+55 (51) 99999-9999") => true
 * isValidPhone("51999999999") => true
 * isValidPhone("999999999") => false (missing DDD)
 */
export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  
  const digits = phone.replace(/\D/g, '');
  
  // 10 digits: DDD + landline (will be prefixed with 55)
  if (digits.length === 10) return true;
  
  // 11 digits: DDD + mobile (will be prefixed with 55)
  if (digits.length === 11) return true;
  
  // 12 digits: 55 + DDD + landline
  if (digits.length === 12 && digits.startsWith('55')) return true;
  
  // 13 digits: 55 + DDD + mobile
  if (digits.length === 13 && digits.startsWith('55')) return true;
  
  return false;
}

/**
 * Creates a WhatsApp link from a phone number.
 * Handles both normalized and formatted inputs.
 * 
 * @example
 * getWhatsAppUrl("5551999999999") => "https://wa.me/5551999999999"
 * getWhatsAppUrl("+55 (51) 99999-9999") => "https://wa.me/5551999999999"
 */
export function getWhatsAppUrl(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  const digits = phone.replace(/\D/g, '');
  
  // Ensure it starts with country code
  const fullNumber = digits.startsWith('55') ? digits : `55${digits}`;
  
  // Validate length
  if (fullNumber.length !== 12 && fullNumber.length !== 13) {
    return null;
  }
  
  return `https://wa.me/${fullNumber}`;
}

/**
 * Extracts just the digits from a phone string.
 * Useful for comparison or validation.
 */
export function getPhoneDigits(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}
