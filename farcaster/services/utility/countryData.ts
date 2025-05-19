
/**
 * Converts country codes from different formats to ISO 3166-1 alpha-2 format
 * @param countryCode The country code to convert
 * @returns The ISO 3166-1 alpha-2 country code
 */
export function countryCodeToISO2(countryCode: string): string {
  // Normalize the country code by removing any '+' prefix and trimming whitespace
  const normalizedCode = countryCode.replace(/^\+/, '').trim();
  
  // Common country code mappings (can be expanded as needed)
  const countryCodeMap: Record<string, string> = {
    '1': 'US',    // United States
    '44': 'GB',   // United Kingdom
    '91': 'IN',   // India
    '234': 'NG',  // Nigeria
    '254': 'KE',  // Kenya
    '255': 'TZ',  // Tanzania
    '233': 'GH',  // Ghana
    '27': 'ZA',   // South Africa
    // Add more country codes as needed
  };
  
  // For ISO2 codes that are already in the correct format
  if (/^[A-Z]{2}$/.test(normalizedCode)) {
    return normalizedCode;
  }
  
  // Try to find the country code in our map
  return countryCodeMap[normalizedCode] || normalizedCode;
}