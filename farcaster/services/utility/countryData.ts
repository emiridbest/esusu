
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
    '27': 'ZA'   // South Africa
  };
  
  // For ISO2 codes that are already in the correct format
  if (/^[A-Z]{2}$/.test(normalizedCode)) {
    return normalizedCode;
  }
  
  // Try to find the country code in our map
  return countryCodeMap[normalizedCode] || normalizedCode;
}

// Add this enhanced mapping function to replace the previous one
export function mapProviderToParent(providerId: string, countryCode: string): { 
  parentId: string, 
  parentName: string,
  isSameFamily: boolean 
} {
  // Normalize country code to lowercase
  const country = countryCode.toLowerCase();
  
  // Nigeria providers
  if (country === 'ng') {
    // MTN Nigeria family
    if (['341', '345', '346', '1236'].includes(providerId)) {
      return { 
        parentId: '341', 
        parentName: 'MTN Nigeria',
        isSameFamily: true
      };
    }
    
    // Airtel Nigeria family
    if (['342', '646', '1256'].includes(providerId)) {
      return { 
        parentId: '342', 
        parentName: 'Airtel Nigeria',
        isSameFamily: true
      };
    }
    
    // Glo Nigeria family
    if (['344', '647', '931'].includes(providerId)) {
      return { 
        parentId: '344', 
        parentName: 'Glo Nigeria',
        isSameFamily: true
      };
    }
    
    // 9Mobile family
    if (['340', '645'].includes(providerId)) {
      return { 
        parentId: '340', 
        parentName: '9Mobile (Etisalat) Nigeria',
        isSameFamily: true
      };
    }
  }
  
  // Ghana providers
  else if (country === 'gh') {
    // MTN Ghana family
    if (['150', '643'].includes(providerId)) {
      return { 
        parentId: '150', 
        parentName: 'MTN Ghana',
        isSameFamily: true
      };
    }
    
    // Airtel-Tigo Ghana
    if (['153'].includes(providerId)) {
      return { 
        parentId: '153', 
        parentName: 'Airtel-Tigo Ghana',
        isSameFamily: true
      };
    }
    
    // Telecel Ghana family
    if (['155', '770'].includes(providerId)) {
      return { 
        parentId: '155', 
        parentName: 'Telecel Ghana',
        isSameFamily: true
      };
    }
  }
  
  // Uganda providers
  else if (country === 'ug') {
    // MTN Uganda family
    if (['515', '1151', '1171'].includes(providerId)) {
      return { 
        parentId: '515', 
        parentName: 'MTN Uganda',
        isSameFamily: true
      };
    }
    
    // Airtel Uganda family
    if (['516', '1152', '1172'].includes(providerId)) {
      return { 
        parentId: '516', 
        parentName: 'Airtel Uganda',
        isSameFamily: true
      };
    }
    
    // Uganda Telecom
    if (['641'].includes(providerId)) {
      return { 
        parentId: '641', 
        parentName: 'Uganda Telecom',
        isSameFamily: true
      };
    }
  }
  
  // If no mapping found, return the original
  return { 
    parentId: providerId, 
    parentName: '',
    isSameFamily: false
  };
}
