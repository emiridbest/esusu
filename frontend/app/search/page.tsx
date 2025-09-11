"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface SearchResult {
  transactionHash: string;
  type: string;
  subType?: string;
  amount: number;
  token: string;
  createdAt: string;
}

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setResults(data.results || []);
        } else {
          setError(data.error || 'Failed to fetch search results.');
        }
      } catch (e) {
        setError('An unexpected error occurred.');
      }
      setLoading(false);
    };

    fetchResults();
  }, [query]);

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Search Results for &quot;{query}&quot;</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : results.length > 0 ? (
            <ul className="space-y-4">
              {results.map((item) => (
                <li key={item.transactionHash} className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <Link href={`/tx/${item.transactionHash}`}>
                    <div className="flex justify-between">
                      <div>
                        <p className="font-semibold capitalize">{item.subType?.replace('_', ' ') || item.type}</p>
                        <p className="text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{item.amount} {item.token}</p>
                        <p className="text-sm text-muted-foreground truncate">{item.transactionHash}</p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>No results found for &quot;{query}&quot;.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchResults />
    </Suspense>
  );
}
