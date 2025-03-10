'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ImageIcon, SearchIcon } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';

export default function MainPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('found');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchItems(activeTab);
  }, [activeTab]);

  const fetchItems = async (type) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*, item_images(*)')
        .eq('type', type)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setItems(data || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Navigation */}
      <header className="flex justify-between items-center mb-8">
        <Link href="/" className="text-2xl font-bold">FindR</Link>
        <div className="space-x-4">
          <Link href="/auth/signin">
            <Button variant="outline">Sign In</Button>
          </Link>
          <Link href="/auth/signup">
            <Button>Sign Up</Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <Tabs defaultValue="found" onValueChange={setActiveTab}>
          <TabsList className="w-full mb-6">
            <TabsTrigger value="lost" className="w-1/2">Lost Items</TabsTrigger>
            <TabsTrigger value="found" className="w-1/2">Found Items</TabsTrigger>
          </TabsList>
          
          <div className="mb-6 flex gap-4">
            <div className="flex flex-1 gap-2">
              <Input 
                placeholder="Search items..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button>
                <SearchIcon className="mr-2 h-4 w-4" />
                Search
              </Button>
            </div>
            
            <Link href="/search/image">
              <Button variant="outline">
                <ImageIcon className="mr-2 h-4 w-4" />
                Image Search
              </Button>
            </Link>
          </div>
          
          <TabsContent value="lost">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {loading ? (
                <p>Loading...</p>
              ) : (
                items.map((item) => (
                  <Card key={item.id} className="p-4">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-gray-500">Location: {item.location}</p>
                    <Button className="mt-2" variant="outline">View Details</Button>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="found">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {loading ? (
                <p>Loading...</p>
              ) : (
                items.map((item) => (
                  <Card key={item.id} className="p-4">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-gray-500">Location: {item.location}</p>
                    <Button className="mt-2" variant="outline">View Details</Button>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
