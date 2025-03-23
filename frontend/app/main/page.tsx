// app/page.tsx
'use client';

import { useState, useEffect, useRef, ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageIcon, SearchIcon, Upload, Trash2, Search } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface ItemImage {
  image_url: string;
}

interface Profile {
  email: string;
}

interface Item {
  id: string;
  title: string;
  description?: string;
  location: string;
  created_at?: string;
  profiles?: Profile;
  item_images: ItemImage[];
  score?: number;
}

// Add type definition for Auth context
interface AuthContextType {
  user: any; 
  loading: boolean;
  signOut: () => void; // Explicitly define signOut as a function that returns void
}

export default function MainPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('lost'); // Set lost as default tab
  const [searchQuery, setSearchQuery] = useState<string>('');
  // Add type casting for useAuth to fix the signOut error
  const { user, loading: authLoading, signOut } = useAuth() as AuthContextType;
  
  // Upload states
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [searchImage, setSearchImage] = useState<File | null>(null);
  const [searchImagePreview, setSearchImagePreview] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchFileInputRef = useRef<HTMLInputElement | null>(null);
  const supabase = createClientComponentClient();
  const router = useRouter();
  
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };
  
  const handleSearchImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setSearchImage(file);
    setSearchImagePreview(URL.createObjectURL(file));
  };
  
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!imageFile) {
      alert('Please select an image');
      return;
    }
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description || '');
      formData.append('location', location);
      formData.append('image', imageFile);
      
      const response = await fetch('/api/milvus/upload', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload item');
      }
      
      // Reset form
      setTitle('');
      setDescription('');
      setLocation('');
      setImageFile(null);
      setImagePreview(null);
      
      alert('Item uploaded successfully!');
    } catch (error) {
      console.error('Error uploading item:', error);
      alert('Error uploading item: ' + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };
  
  const handleTextSearch = async () => {
    if (!searchQuery.trim()) {
      setItems([]);
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/milvus/search/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Search failed');
      
      setItems(data.items || []);
    } catch (error) {
      console.error('Error searching:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleImageSearch = async () => {
    if (!searchImage) return;
    
    setSearchLoading(true);
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('image', searchImage);
      
      const response = await fetch('/api/milvus/search/image', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Search failed');
      
      setItems(data.items || []);
    } catch (error) {
      console.error('Error searching by image:', error);
      setItems([]);
    } finally {
      setSearchLoading(false);
      setLoading(false);
    }
  };
  
  const handleSignOut = () => {
    // Fix signOut call by ensuring it's a function
    if (typeof signOut === 'function') {
      signOut();
    } else {
      console.error('signOut is not a function');
    }
  };
  
  const handleDeleteItem = async (item: Item) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }
    
    setDeleting(true);
    
    try {
      // Extract the filename from the URL
      const url = item.item_images[0].image_url;
      const fileName = url.split('/').pop();
      
      const response = await fetch('/api/milvus/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: item.id,
          fileName: fileName,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete item');
      }
      
      // Remove the deleted item from the items state
      setItems(items.filter(i => i.id !== item.id));
      
      alert('Item deleted successfully!');
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Error deleting item: ' + (error as Error).message);
    } finally {
      setDeleting(false);
    }
  };
  
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTextSearch();
    }
  };
  
  // Add a new function to perform image search with an existing image URL
  const handleSearchWithItem = async (imageUrl: string, title: string) => {
    setLoading(true);
    
    try {
      // Fetch the image as a blob
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
      }
      
      const imageBlob = await imageResponse.blob();
      
      // Create a file object from the blob
      const fileName = `search-${Date.now()}.jpg`;
      const file = new File([imageBlob], fileName, { type: 'image/jpeg' });
      
      // Set the search image preview for user feedback
      setSearchImage(file);
      setSearchImagePreview(imageUrl);
      
      // Create a FormData object for the API request
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/milvus/search/image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Search API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      // Set search results
      setItems(data.items || []);
      
      // Switch to Lost tab if not already there
      if (activeTab !== 'lost') {
        setActiveTab('lost');
      }
    } catch (error) {
      console.error('Error searching by existing image:', error);
      alert(`Error searching with this image: ${(error as Error).message}`);
      setItems([]);
    } finally {
      setLoading(false);
    }
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
          {/* Tab Description Section */}
          <div className="mb-6 text-center">
            <p className="text-muted-foreground">
              Use the <span className="font-semibold text-lost">Lost Items</span> tab to search for items you've lost.
              Use the <span className="font-semibold text-found">Found Items</span> tab to upload items you've found.
            </p>
          </div>
          
          <Tabs defaultValue="lost" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-6">
              <TabsTrigger 
                value="lost" 
                className="w-1/2 data-[state=active]:bg-lost data-[state=active]:text-lost-foreground"
              >
                Lost Items
              </TabsTrigger>
              <TabsTrigger 
                value="found" 
                className="w-1/2 data-[state=active]:bg-found data-[state=active]:text-found-foreground"
              >
                Found Items
              </TabsTrigger>
            </TabsList>
            
            {/* Lost Items Tab */}
            <TabsContent value="lost">
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Search for your lost items..." 
                    value={searchQuery}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <Button 
                    onClick={handleTextSearch}
                    className="bg-lost text-lost-foreground hover:bg-lost/90"
                  >
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
                    className="bg-lost text-lost-foreground hover:bg-lost/90"
                  >
                    {searchLoading ? 'Searching...' : 'Find Similar'}
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {loading ? (
                  <p className="col-span-3 text-center py-8">Searching for items...</p>
                ) : items.length > 0 ? (
                  items.map((item) => (
                    <Card key={item.id} className="p-4 flex flex-col h-full">
                      {item.item_images && item.item_images[0] && (
                        <div className="relative h-48 w-full mb-3 group">
                          <Image
                            src={item.item_images[0].image_url}
                            alt={item.title}
                            fill
                            className="object-cover rounded"
                          />
                          
                          {/* Overlay on hover */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded flex flex-col justify-between p-2 text-white">
                            {/* Score display at top */}
                            <div className="text-sm font-semibold bg-black/60 self-start px-2 py-1 rounded">
                              Score: {item.score ? item.score.toFixed(4) : 'N/A'}
                            </div>
                            
                            {/* Search button at bottom */}
                            <Button 
                              onClick={() => handleSearchWithItem(item.item_images[0].image_url, item.title)}
                              className="self-end bg-lost text-lost-foreground hover:bg-lost/90"
                              size="sm"
                            >
                              <Search className="h-4 w-4 mr-1" />
                              Search Similar
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold">{item.title}</h3>
                        
                        {(user.email === item.profiles?.email || user.email === 'riddhimaan22@gmail.com') && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-100 p-1 h-auto"
                            onClick={() => handleDeleteItem(item)}
                            disabled={deleting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Location: {item.location || "Unknown"}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                        Reported by: {item.profiles?.email || "Unknown user"}
                      </p>
                      {item.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">{item.description}</p>
                      )}
                    </Card>
                  ))
                ) : (
                  <p className="col-span-3 text-center py-8 text-gray-500 dark:text-gray-400">
                    {searchQuery || searchImagePreview 
                      ? "No matching items found. Try a different search." 
                      : "Search for lost items using text or image above."}
                  </p>
                )}
              </div>
            </TabsContent>
            
            {/* Found Items Tab */}
            <TabsContent value="found">
              <div className="mb-8">
                <Card className="p-6 border-found/20">
                  <h2 className="text-xl font-semibold mb-4 text-found">Upload a Found Item</h2>
                  <p className="text-muted-foreground mb-4">
                    Found something that might belong to someone else? Upload it here to help it find its way back home.
                  </p>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block mb-1">Title *</label>
                      <Input
                        value={title}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                        required
                        placeholder="Item name or brief description"
                      />
                    </div>
                    
                    <div>
                      <label className="block mb-1">Description</label>
                      <Textarea
                        value={description}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                        rows={3}
                        placeholder="Provide more details about the item"
                      />
                    </div>
                    
                    <div>
                      <label className="block mb-1">Location *</label>
                      <Input
                        value={location}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setLocation(e.target.value)}
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
                      className="w-full bg-found text-found-foreground hover:bg-found/90"
                    >
                      {uploading ? 'Uploading...' : 'Upload Found Item'}
                    </Button>
                  </form>
                </Card>
              </div>
              
              <div className="text-center py-4">
                <p className="text-gray-500 dark:text-gray-400">
                  Thank you for helping return lost items to their owners.
                </p>
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