import React from 'react';
import Image from 'next/image';
import { getAllCountries } from '@/utils/countryData';
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
}

export default function CountrySelector({ value, onChange }: CountrySelectorProps) {
  const countries = getAllCountries();

  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a country">
          {value && (
            <div className="flex items-center">
              {countries.find(c => c.code === value)?.flag && (
                <div className="w-4 h-4 relative mr-2 overflow-hidden">
                  <Image
                    src={countries.find(c => c.code === value)?.flag || ''}
                    alt={countries.find(c => c.code === value)?.name || ''}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              {countries.find(c => c.code === value)?.name}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {countries.map((country) => (
          <SelectItem key={country.code} value={country.code} className="flex items-center">
            <div className="flex items-center">
              {country.flag && (
                <div className="w-4 h-4 relative mr-2 overflow-hidden">
                  <Image
                    src={country.flag}
                    alt={country.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              {country.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}