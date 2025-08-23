// Country data containing specific information for each supported country

export type CountryData = {
  code: string;
  name: string;
  flag: string;
  currency: {
    code: string;
    name: string;
    symbol: string;
  };
  servicesAvailable: {
    electricity: boolean;
    data: boolean;
    airtime: boolean;
  };
  phoneCode: string;
};

// List of supported countries with their data
const COUNTRIES: Record<string, CountryData> = {
  ng: {
    code: "ng",
    name: "Nigeria",
    flag: "/flags/nigeria.svg",
    currency: {
      code: "NGN",
      name: "Nigerian Naira",
      symbol: "₦",
    },
    servicesAvailable: {
      electricity: true,
      data: true,
      airtime: true
    },
    phoneCode: "+234"
  },
  gh: {
    code: "gh",
    name: "Ghana",
    flag: "/flags/ghana.svg",
    currency: {
      code: "GHS",
      name: "Ghanaian Cedi",
      symbol: "₵"
    },
    servicesAvailable: {
      electricity: true,
      data: true,
      airtime: true 
    },
    phoneCode: "+233"
  },
  ke: {
    code: "ke",
    name: "Kenya",
    flag: "/flags/kenya.svg",
    currency: {
      code: "KES",
      name: "Kenyan Shilling",
      symbol: "KSh"
    },
    servicesAvailable: {
      electricity: true,
      data: true,
      airtime: true
    },
    phoneCode: "+254"
  },
  ug: {
    code: "ug",
    name: "Uganda",
    flag: "/flags/uganda.svg",
    currency: {
      code: "UGX",
      name: "Ugandan Shilling",
      symbol: "USh"
    },
    servicesAvailable: {
      electricity: true,
      data: true,
      airtime: true // Assuming airtime service is not available
    },
    phoneCode: "+256"
  }
};

/**
 * Get country data for a specific country code
 * @param countryCode - The 2-letter country code
 * @returns The country data or undefined if not found
 */
export const getCountryData = (countryCode: string): CountryData | undefined => {
  const code = countryCode.toLowerCase();
  return COUNTRIES[code];
};

/**
 * Get all supported countries
 * @returns Array of country data objects
 */
export const getAllCountries = (): CountryData[] => {
  return Object.values(COUNTRIES);
};

/**
 * Check if a specific service is available in a country
 * @param countryCode - The 2-letter country code
 * @param service - The service to check (electricity, data, airtime)
 * @returns True if the service is available, false otherwise
 */
export const isServiceAvailable = (
  countryCode: string,
  service: keyof CountryData['servicesAvailable']
): boolean => {
  const country = getCountryData(countryCode);
  if (!country) return false;
  return country.servicesAvailable[service];
};

export default COUNTRIES;