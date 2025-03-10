// app/search/text/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SearchIcon } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';

export default function TextSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load initial results based on URL params
  useEffect(() => {
    if (searchParams.get('query')) {
      fetchResults(searchParams.get('query'));
    }
  }, []);

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    
    if (term) {
      params.set("query", term);
    } else {
      params.delete("query");
    }
    
    router.replace(`${pathname}?${params.toString()}`);
    fetchResults(term);
  }, 300);

  const fetchResults = async (searchTerm: string) => {
    if (!searchTerm) {
      setResults([]);
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`/api/search/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: searchTerm,
          filters: { type: 'lost' }
        }),
      });
      
      const data = await response.json();
      setResults(data.items || []);
    } catch (error) {
      console.error('Error searching items:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Search Lost Items</h1>
      
      <Card className="p-6 mb-8">
        <div className="flex gap-2">
          <Input
            placeholder="Search for lost items..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            className="flex-1"
          />
          <Button 
            onClick={() => fetchResults(query)}
            disabled={loading}
          >
            <SearchIcon className="mr-2 h-4 w-4" />
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>
      </Card>
      
      {results.length > 0 ? (
        <div>
          <h2 className="text-xl font-semibold mb-4">Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {results.map((item) => (
              <Card key={item.id} className="p-4">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-gray-500">Location: {item.location}</p>
                <Button className="mt-2" variant="outline">View Details</Button>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        query && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-500">No results found for "{query}"</p>
          </div>
        )
      )}
    </div>
  );
}
