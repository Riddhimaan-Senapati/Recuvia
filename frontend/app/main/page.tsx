// app/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageIcon, SearchIcon, Upload } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function MainPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('found');
  const [searchQuery, setSearchQuery] = useState('');
  const { user, loading: authLoading, signOut } = useAuth();
  
  // Upload states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchImage, setSearchImage] = useState(null);
  const [searchImagePreview, setSearchImagePreview] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const fileInputRef = useRef(null);
  const searchFileInputRef = useRef(null);
  const supabase = createClientComponentClient();
  const router = useRouter();
  
  useEffect(() => {
    if (!authLoading && user) {
      fetchItems(activeTab);
    }
  }, [activeTab, authLoading, user]);
  
  const fetchItems = async (type) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/items?type=${type}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Failed to fetch items');
      
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };
  
  const handleSearchImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setSearchImage(file);
    setSearchImagePreview(URL.createObjectURL(file));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!imageFile) {
      alert('Please select an image');
      return;
    }
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('location', location);
      formData.append('type', activeTab);
      formData.append('image', imageFile);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload item');
      }
      
      // Reset form
      setTitle('');
      setDescription('');
      setLocation('');
      setImageFile(null);
      setImagePreview(null);
      
      // Refresh items
      fetchItems(activeTab);
      
      alert('Item uploaded successfully!');
    } catch (error) {
      console.error('Error uploading item:', error);
      alert('Error uploading item: ' + error.message);
    } finally {
      setUploading(false);
    }
  };
  
  const handleTextSearch = async () => {
    if (!searchQuery.trim()) {
      fetchItems('lost'); // Reset to regular view
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/search/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          filters: { type: 'lost' },
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Search failed');
      
      setItems(data.items || []);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleImageSearch = async () => {
    if (!searchImage) return;
    
    setSearchLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('image', searchImage);
      
      const response = await fetch('/api/search/image', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Search failed');
      
      setItems(data.items || []);
    } catch (error) {
      console.error('Error searching by image:', error);
    } finally {
      setSearchLoading(false);
    }
  };
  
  const handleSignOut = () => {
    signOut();
  };
  
  if (authLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    return null; // The AuthContext will handle redirection
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Navigation */}
      <header className="flex justify-between items-center mb-8">
        <Link href="/" className="text-2xl font-bold">FindR</Link>
        <div className="space-x-4">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-gray-700 dark:text-gray-300">{user.email}</span>
              <ThemeToggle />
              <Button 
                variant="destructive" 
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <>
              <ThemeToggle />
              <Link href="/auth/signin">
                <Button variant="outline">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button>Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Content - Only show if user is authenticated */}
      {user ? (
        <main>
          <Tabs defaultValue="found" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-6">
              <TabsTrigger value="lost" className="w-1/2">Lost Items</TabsTrigger>
              <TabsTrigger value="found" className="w-1/2">Found Items</TabsTrigger>
            </TabsList>
            
            {/* Upload Section - Only shown in Found tab */}
            {activeTab === 'found' && (
              <Card className="p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">
                  Upload a Found Item
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block mb-1">Title *</label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      placeholder="Item name or brief description"
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-1">Description</label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Provide more details about the item"
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-1">Location *</label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                      placeholder="Where was this item found?"
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-1">Image *</label>
                    <div 
                      className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {imagePreview ? (
                        <div className="relative h-48 w-full">
                          <Image
                            src={imagePreview}
                            alt="Preview"
                            fill
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <div className="py-4">
                          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                          <p>Click to upload an image (required)</p>
                        </div>
                      )}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        accept="image/*"
                        className="hidden"
                        required
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={uploading || !imageFile || !title || !location}
                    className="w-full"
                  >
                    {uploading ? 'Uploading...' : 'Upload Found Item'}
                  </Button>
                </form>
              </Card>
            )}
            
            {/* Search Section - Only shown in Lost tab */}
            {activeTab === 'lost' && (
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Search lost items..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleTextSearch()}
                  />
                  <Button onClick={handleTextSearch}>
                    <SearchIcon className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <div 
                    className="border rounded-md flex-1 flex items-center px-3 cursor-pointer"
                    onClick={() => searchFileInputRef.current?.click()}
                  >
                    {searchImagePreview ? (
                      <div className="relative h-10 w-10 mr-2">
                        <Image
                          src={searchImagePreview}
                          alt="Search"
                          fill
                          className="object-cover rounded"
                        />
                      </div>
                    ) : (
                      <ImageIcon className="mr-2 h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-gray-500">
                      {searchImagePreview ? 'Image selected' : 'Upload image to search'}
                    </span>
                    <input
                      type="file"
                      ref={searchFileInputRef}
                      onChange={handleSearchImageChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                  <Button 
                    onClick={handleImageSearch}
                    disabled={!searchImage || searchLoading}
                  >
                    {searchLoading ? 'Searching...' : 'Find Similar'}
                  </Button>
                </div>
              </div>
            )}
            
            {/* Lost Items Tab */}
            <TabsContent value="lost">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {loading ? (
                  <p>Loading...</p>
                ) : items.length > 0 ? (
                  items.map((item) => (
                    <Card key={item.id} className="p-4 flex flex-col h-full">
                      {item.item_images && item.item_images[0] && (
                        <div className="relative h-48 w-full mb-3">
                          <Image
                            src={item.item_images[0].image_url}
                            alt={item.title}
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                      )}
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-gray-500">Location: {item.location}</p>
                      {/* Display the email from profiles */}
                      <p className="text-sm text-gray-500 font-medium">
                        Reported by: {item.profiles?.email || "Unknown user"}
                      </p>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{item.description}</p>
                      )}
                    </Card>
                  ))
                ) : (
                  <p className="col-span-3 text-center py-8 text-gray-500">No lost items found. Try broadening your search.</p>
                )}
              </div>
            </TabsContent>
            
            {/* Found Items Tab */}
            <TabsContent value="found">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {loading ? (
                  <p>Loading...</p>
                ) : items.length > 0 ? (
                  items.map((item) => (
                    <Card key={item.id} className="p-4 flex flex-col h-full">
                      {item.item_images && item.item_images[0] && (
                        <div className="relative h-48 w-full mb-3">
                          <Image
                            src={item.item_images[0].image_url}
                            alt={item.title}
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                      )}
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-gray-500">Location: {item.location}</p>
                      {/* Display the email from profiles */}
                      <p className="text-sm text-gray-500 font-medium">
                        Found by: {item.profiles?.email || "Unknown user"}
                      </p>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{item.description}</p>
                      )}
                    </Card>
                  ))
                ) : (
                  <p className="col-span-3 text-center py-8 text-gray-500">No found items available.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      ) : (
        <div className="text-center py-12">
          <p>Please sign in to access this page</p>
        </div>
      )}
    </div>
  );
}
