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
  tier: 1 | 2; // 1 = Reloadly (full support), 2 = DingConnect only
};

// List of supported countries with their data
const COUNTRIES: Record<string, CountryData> = {
  // === TIER 1: Full Reloadly Support ===
  ng: {
    code: "ng",
    name: "Nigeria",
    flag: "/flags/nigeria.svg",
    currency: { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
    servicesAvailable: { electricity: true, data: true, airtime: true },
    phoneCode: "+234",
    tier: 1
  },
  gh: {
    code: "gh",
    name: "Ghana",
    flag: "/flags/ghana.svg",
    currency: { code: "GHS", name: "Ghanaian Cedi", symbol: "₵" },
    servicesAvailable: { electricity: true, data: true, airtime: true },
    phoneCode: "+233",
    tier: 1
  },
  ke: {
    code: "ke",
    name: "Kenya",
    flag: "/flags/kenya.svg",
    currency: { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
    servicesAvailable: { electricity: true, data: true, airtime: true },
    phoneCode: "+254",
    tier: 1
  },
  ug: {
    code: "ug",
    name: "Uganda",
    flag: "/flags/uganda.svg",
    currency: { code: "UGX", name: "Ugandan Shilling", symbol: "USh" },
    servicesAvailable: { electricity: true, data: true, airtime: true },
    phoneCode: "+256",
    tier: 1
  },

  // === TIER 2: DingConnect International Countries ===
  // Caribbean
  jm: {
    code: "jm",
    name: "Jamaica",
    flag: "",
    currency: { code: "JMD", name: "Jamaican Dollar", symbol: "J$" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+1876",
    tier: 2
  },
  ht: {
    code: "ht",
    name: "Haiti",
    flag: "",
    currency: { code: "HTG", name: "Haitian Gourde", symbol: "G" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+509",
    tier: 2
  },
  do: {
    code: "do",
    name: "Dominican Republic",
    flag: "",
    currency: { code: "DOP", name: "Dominican Peso", symbol: "RD$" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+1809",
    tier: 2
  },
  tt: {
    code: "tt",
    name: "Trinidad and Tobago",
    flag: "",
    currency: { code: "TTD", name: "Trinidad Dollar", symbol: "TT$" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+1868",
    tier: 2
  },
  bb: {
    code: "bb",
    name: "Barbados",
    flag: "",
    currency: { code: "BBD", name: "Barbadian Dollar", symbol: "Bds$" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+1246",
    tier: 2
  },

  // Latin America
  mx: {
    code: "mx",
    name: "Mexico",
    flag: "",
    currency: { code: "MXN", name: "Mexican Peso", symbol: "$" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+52",
    tier: 2
  },
  gt: {
    code: "gt",
    name: "Guatemala",
    flag: "",
    currency: { code: "GTQ", name: "Guatemalan Quetzal", symbol: "Q" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+502",
    tier: 2
  },
  hn: {
    code: "hn",
    name: "Honduras",
    flag: "",
    currency: { code: "HNL", name: "Honduran Lempira", symbol: "L" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+504",
    tier: 2
  },
  sv: {
    code: "sv",
    name: "El Salvador",
    flag: "",
    currency: { code: "USD", name: "US Dollar", symbol: "$" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+503",
    tier: 2
  },
  ni: {
    code: "ni",
    name: "Nicaragua",
    flag: "",
    currency: { code: "NIO", name: "Nicaraguan Córdoba", symbol: "C$" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+505",
    tier: 2
  },
  co: {
    code: "co",
    name: "Colombia",
    flag: "",
    currency: { code: "COP", name: "Colombian Peso", symbol: "$" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+57",
    tier: 2
  },
  pe: {
    code: "pe",
    name: "Peru",
    flag: "",
    currency: { code: "PEN", name: "Peruvian Sol", symbol: "S/" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+51",
    tier: 2
  },
  br: {
    code: "br",
    name: "Brazil",
    flag: "",
    currency: { code: "BRL", name: "Brazilian Real", symbol: "R$" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+55",
    tier: 2
  },

  // Asia
  ph: {
    code: "ph",
    name: "Philippines",
    flag: "",
    currency: { code: "PHP", name: "Philippine Peso", symbol: "₱" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+63",
    tier: 2
  },
  in: {
    code: "in",
    name: "India",
    flag: "",
    currency: { code: "INR", name: "Indian Rupee", symbol: "₹" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+91",
    tier: 2
  },
  pk: {
    code: "pk",
    name: "Pakistan",
    flag: "",
    currency: { code: "PKR", name: "Pakistani Rupee", symbol: "₨" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+92",
    tier: 2
  },
  bd: {
    code: "bd",
    name: "Bangladesh",
    flag: "",
    currency: { code: "BDT", name: "Bangladeshi Taka", symbol: "৳" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+880",
    tier: 2
  },
  np: {
    code: "np",
    name: "Nepal",
    flag: "",
    currency: { code: "NPR", name: "Nepalese Rupee", symbol: "₨" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+977",
    tier: 2
  },
  lk: {
    code: "lk",
    name: "Sri Lanka",
    flag: "",
    currency: { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+94",
    tier: 2
  },
  vn: {
    code: "vn",
    name: "Vietnam",
    flag: "",
    currency: { code: "VND", name: "Vietnamese Dong", symbol: "₫" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+84",
    tier: 2
  },
  id: {
    code: "id",
    name: "Indonesia",
    flag: "",
    currency: { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+62",
    tier: 2
  },

  // Africa (Additional)
  za: {
    code: "za",
    name: "South Africa",
    flag: "",
    currency: { code: "ZAR", name: "South African Rand", symbol: "R" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+27",
    tier: 2
  },
  tz: {
    code: "tz",
    name: "Tanzania",
    flag: "",
    currency: { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+255",
    tier: 2
  },
  rw: {
    code: "rw",
    name: "Rwanda",
    flag: "",
    currency: { code: "RWF", name: "Rwandan Franc", symbol: "FRw" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+250",
    tier: 2
  },
  et: {
    code: "et",
    name: "Ethiopia",
    flag: "",
    currency: { code: "ETB", name: "Ethiopian Birr", symbol: "Br" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+251",
    tier: 2
  },
  eg: {
    code: "eg",
    name: "Egypt",
    flag: "",
    currency: { code: "EGP", name: "Egyptian Pound", symbol: "E£" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+20",
    tier: 2
  },
  ma: {
    code: "ma",
    name: "Morocco",
    flag: "",
    currency: { code: "MAD", name: "Moroccan Dirham", symbol: "د.م." },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+212",
    tier: 2
  },
  sn: {
    code: "sn",
    name: "Senegal",
    flag: "",
    currency: { code: "XOF", name: "CFA Franc", symbol: "CFA" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+221",
    tier: 2
  },
  cm: {
    code: "cm",
    name: "Cameroon",
    flag: "",
    currency: { code: "XAF", name: "Central African CFA Franc", symbol: "FCFA" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+237",
    tier: 2
  },

  // Middle East
  sa: {
    code: "sa",
    name: "Saudi Arabia",
    flag: "",
    currency: { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+966",
    tier: 2
  },
  ae: {
    code: "ae",
    name: "United Arab Emirates",
    flag: "",
    currency: { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+971",
    tier: 2
  },

  // North America
  us: {
    code: "us",
    name: "United States",
    flag: "",
    currency: { code: "USD", name: "US Dollar", symbol: "$" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+1",
    tier: 2
  },
  ca: {
    code: "ca",
    name: "Canada",
    flag: "",
    currency: { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+1",
    tier: 2
  },

  // Europe
  gb: {
    code: "gb",
    name: "United Kingdom",
    flag: "",
    currency: { code: "GBP", name: "British Pound", symbol: "£" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+44",
    tier: 2
  },
  de: {
    code: "de",
    name: "Germany",
    flag: "",
    currency: { code: "EUR", name: "Euro", symbol: "€" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+49",
    tier: 2
  },
  fr: {
    code: "fr",
    name: "France",
    flag: "",
    currency: { code: "EUR", name: "Euro", symbol: "€" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+33",
    tier: 2
  },
  es: {
    code: "es",
    name: "Spain",
    flag: "",
    currency: { code: "EUR", name: "Euro", symbol: "€" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+34",
    tier: 2
  },
  it: {
    code: "it",
    name: "Italy",
    flag: "",
    currency: { code: "EUR", name: "Euro", symbol: "€" },
    servicesAvailable: { electricity: false, data: true, airtime: true },
    phoneCode: "+39",
    tier: 2
  },
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
 * Get countries by tier
 * @param tier - 1 for Reloadly, 2 for DingConnect
 */
export const getCountriesByTier = (tier: 1 | 2): CountryData[] => {
  return Object.values(COUNTRIES).filter(c => c.tier === tier);
};

/**
 * Check if a country uses DingConnect (Tier 2)
 */
export const isDingConnectCountry = (countryCode: string): boolean => {
  const country = getCountryData(countryCode);
  return country?.tier === 2;
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