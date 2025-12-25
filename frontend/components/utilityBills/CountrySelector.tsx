import React from 'react';
import { getAllCountries, CountryData } from '@/utils/countryData';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CountrySelectorProps {
  value: string;
  onChange: (value: string) => void;
  serviceFilter?: 'electricity' | 'data' | 'airtime'; // Filter by service availability
}

// Flag component using flag-icons NPM package
function CountryFlag({ countryCode, className = "" }: { countryCode: string; className?: string }) {
  return (
    <span
      className={`fi fi-${countryCode.toLowerCase()} ${className}`}
      aria-label={`${countryCode} flag`}
    />
  );
}

export default function CountrySelector({ value, onChange, serviceFilter }: CountrySelectorProps) {
  const allCountries = getAllCountries();

  // Filter countries by service availability if serviceFilter is provided
  const countries = serviceFilter
    ? allCountries.filter(c => c.servicesAvailable[serviceFilter])
    : allCountries;

  const selectedCountry = countries.find(c => c.code === value);

  // Sort countries: Tier 1 first, then alphabetically
  const sortedCountries = [...countries].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return a.name.localeCompare(b.name);
  });

  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a country">
          {value && selectedCountry && (
            <div className="flex items-center gap-2">
              <CountryFlag countryCode={selectedCountry.code} className="text-lg" />
              <span>{selectedCountry.name}</span>
              {selectedCountry.tier === 2 && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                  Intl
                </span>
              )}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {sortedCountries.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            <div className="flex items-center gap-2">
              <CountryFlag countryCode={country.code} className="text-lg" />
              <span>{country.name}</span>
              {country.tier === 2 && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded ml-1">
                  Intl
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}