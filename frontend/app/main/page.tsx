// app/main/page.tsx
'use client';

import { useState, useRef, ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageIcon, SearchIcon, Upload, Trash2, Search, CheckCircle, Clock } from 'lucide-react';
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

interface AuthContextType {
  user: any; 
  loading: boolean;
  signOut: () => void;
}

export default function MainPage() {
  // --- NEW: Similarity threshold and max results states ---
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.3);
  const [maxResults, setMaxResults] = useState<string>('20'); // string to allow 'all' and 'custom'
  const [customMaxResults, setCustomMaxResults] = useState<string>('');

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('lost');
  const [searchQuery, setSearchQuery] = useState<string>('');
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
  
  const [searchProgress, setSearchProgress] = useState<'idle' | 'searching' | 'complete' | 'error'>('idle');
  const [searchStatusMessage, setSearchStatusMessage] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'complete' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  // --- NEW: Show/hide warning state ---
  const [showWarning, setShowWarning] = useState<boolean>(true);


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

  // FIX: Reset file input value after removing image
  const handleRemoveSearchImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSearchImage(null);
    setSearchImagePreview(null);
    if (searchFileInputRef.current) {
      searchFileInputRef.current.value = "";
    }
  };
  
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!imageFile) {
      alert('Please select an image');
      return;
    }
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }
    if (!location.trim()) {
      alert('Please enter a location');
      return;
    }
    setUploadStatus('uploading');
    setStatusMessage('Uploading your found item...');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description || '');
      formData.append('location', location);
      formData.append('image', imageFile);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const text = await response.text();
      let result;
      if (text && text.trim()) {
        try {
          result = JSON.parse(text);
        } catch (e) {
          throw new Error(`Invalid response format: ${text.substring(0, 100)}...`);
        }
      } else {
        throw new Error(`Server returned empty response with status: ${response.status}`);
      }
      if (!response.ok) {
        throw new Error(result?.error || `Upload failed with status: ${response.status}`);
      }
      setUploadStatus('complete');
      setStatusMessage('Item uploaded successfully!');
      setTitle('');
      setDescription('');
      setLocation('');
      setImageFile(null);
      setImagePreview(null);
      setTimeout(() => {
        setUploadStatus('idle');
        setStatusMessage('');
      }, 5000);
    } catch (error) {
      console.error('Error uploading item:', error);
      setUploadStatus('error');
      setStatusMessage(`Error: ${(error as Error).message}`);
    } finally {
      setUploading(false);
    }
  };
  
  const handleTextSearch = async () => {
    // Convert maxResults to number or undefined for 'all'
    const maxResultsNum = maxResults === 'all' ? undefined : Number(maxResults);

    if (!searchQuery.trim()) {
      setItems([]);
      return;
    }
    setLoading(true);
    setSearchProgress('searching');
    setSearchStatusMessage('Searching for items...');
    try {
      // --- Custom max results validation ---
      let maxResultsNum: number | undefined = undefined;
      if (maxResults === 'custom') {
        if (!customMaxResults || isNaN(Number(customMaxResults)) || Number(customMaxResults) < 1) {
          alert('Please enter a valid positive number for custom max results.');
          setLoading(false);
          return;
        }
        maxResultsNum = Number(customMaxResults);
      } else if (maxResults !== 'all') {
        maxResultsNum = Number(maxResults);
      }
      // If 'all', undefined is sent (handled by backend as large value)
      const response = await fetch('/api/search/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          threshold: similarityThreshold,
          maxResults: maxResultsNum,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Search failed');
      setItems(data.items || []);
      setSearchProgress('complete');
      setSearchStatusMessage(`Found ${data.items?.length || 0} items`);
    } catch (error) {
      console.error('Error searching:', error);
      setItems([]);
      setSearchProgress('error');
      setSearchStatusMessage(`Error: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleImageSearch = async () => {
    const maxResultsNum = maxResults === 'all' ? undefined : Number(maxResults);
    if (!searchImage) return;
    setSearchLoading(true);
    setLoading(true);
    setSearchProgress('searching');
    setSearchStatusMessage('Processing image search...');
    try {
      if (maxResults === 'custom') {
        if (!customMaxResults || isNaN(Number(customMaxResults)) || Number(customMaxResults) < 1) {
          alert('Please enter a valid positive number for custom max results.');
          setSearchLoading(false);
          setLoading(false);
          return;
        }
      }
      const formData = new FormData();
      formData.append('image', searchImage);
      formData.append('threshold', String(similarityThreshold));
      formData.append('maxResults', maxResults === 'custom' ? customMaxResults : maxResults);
      const response = await fetch('/api/search/image', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Search failed');
      setItems(data.items || []);
      setSearchProgress('complete');
      setSearchStatusMessage(`Found ${data.items?.length || 0} items`);
    } catch (error) {
      console.error('Error searching by image:', error);
      setItems([]);
      setSearchProgress('error');
      setSearchStatusMessage(`Error: ${(error as Error).message}`);
    } finally {
      setSearchLoading(false);
      setLoading(false);
    }
  };
  
  const handleSearchWithItem = async (imageUrl: string, title: string) => {
    setLoading(true);
    setSearchProgress('searching');
    setSearchStatusMessage(`Finding items similar to "${title}"...`);
    try {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
      }
      const imageBlob = await imageResponse.blob();
      const fileName = `search-${Date.now()}.jpg`;
      const file = new File([imageBlob], fileName, { type: 'image/jpeg' });
      setSearchImage(file);
      setSearchImagePreview(imageUrl);
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch('/api/search/image', {
        method: 'POST',
        body: formData,
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Search API error: ${response.status} - ${text}`);
      }
      if (!text) {
        setItems([]);
        setSearchProgress('error');
        setSearchStatusMessage('Error: Empty response from server');
        return;
      }
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Failed to parse response as JSON: ${text}`);
      }
      setItems(data.items || []);
      setSearchProgress('complete');
      setSearchStatusMessage(`Found ${data.items?.length || 0} similar items`);
      if (activeTab !== 'lost') {
        setActiveTab('lost');
      }
    } catch (error) {
      console.error('Error searching by existing image:', error);
      alert(`Error searching with this image: ${(error as Error).message}`);
      setItems([]);
      setSearchProgress('error');
      setSearchStatusMessage(`Error: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSignOut = () => {
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
      const url = item.item_images[0].image_url;
      const fileName = url.split('/').pop();
      const response = await fetch('/api/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: item.id,
          fileName: fileName,
        }),
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete item');
      }
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
  
  if (authLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    return null; 
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-8">
        <Link href="/" className="text-2xl font-bold">Recuvia</Link>
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

      {user ? (
        <main>
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
            
            <TabsContent value="lost">
              {/* --- WARNING FOR TEXT SEARCH, DISMISSIBLE --- */}
              {showWarning && (
                <div className="mb-2 p-2 rounded bg-yellow-100 text-yellow-800 border border-yellow-300 text-sm flex items-center justify-between">
                  <span>
                    <strong>Note:</strong> For text search, lower similarity thresholds (e.g., 0.1–0.3) are usually required to get relevant results. For image search, higher values may work better.
                  </span>
                  <button
                    className="ml-4 px-2 py-0.5 rounded bg-yellow-200 hover:bg-yellow-300 text-yellow-900 text-xs"
                    onClick={() => setShowWarning(false)}
                  >
                    Hide
                  </button>
                </div>
              )}

              {/* --- Search Options: Similarity Threshold & Max Results --- */}
              <div className="mb-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex items-center gap-2 w-full md:w-auto relative group">
                  <label htmlFor="threshold-slider" className="font-medium text-sm flex items-center">
                    Similarity Threshold
                    <span className="ml-1 cursor-pointer text-gray-400" tabIndex={0}>
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor">?</text></svg>
                      <span className="absolute left-0 top-8 z-10 hidden group-hover:block group-focus:block bg-gray-800 text-white text-xs rounded px-2 py-1 shadow-lg w-56">
                        Controls how similar a match must be to your search. Lower values return more (but less similar) results. Higher values return fewer, but more similar, results.
                      </span>
                    </span>
                  </label>
                  <input
                    id="threshold-slider"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={similarityThreshold}
                    onChange={e => setSimilarityThreshold(Number(e.target.value))}
                    className="w-32 mx-2"
                  />
                  <span className="text-sm w-10 text-center">{similarityThreshold}</span>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto relative group">
                  <label htmlFor="max-results-select" className="font-medium text-sm flex items-center">
                    Max Results
                    <span className="ml-1 cursor-pointer text-gray-400" tabIndex={0}>
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor">?</text></svg>
                      <span className="absolute left-0 top-8 z-10 hidden group-hover:block group-focus:block bg-gray-800 text-white text-xs rounded px-2 py-1 shadow-lg w-56">
                        Limits the number of items shown in the results. Choose "All" to show every match found (may be slow for large numbers). Select "Custom" to enter your own value.
                      </span>
                    </span>
                  </label>
                  <select
                    id="max-results-select"
                    value={maxResults}
                    onChange={e => setMaxResults(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="all">All</option>
                    <option value="custom">Custom…</option>
                  </select>
                  {maxResults === 'custom' && (
                    <input
                      type="number"
                      min={1}
                      value={customMaxResults}
                      onChange={e => {
                        // Only allow positive integers
                        const val = e.target.value;
                        if (/^\d*$/.test(val)) setCustomMaxResults(val);
                      }}
                      placeholder="Enter number"
                      className="ml-2 border rounded px-2 py-1 text-sm w-24"
                    />
                  )}
                </div>
              </div>
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
                    disabled={searchProgress === 'searching'}
                  >
                    {searchProgress === 'searching' ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <SearchIcon className="mr-2 h-4 w-4" />
                        Search
                      </>
                    )}
                  </Button>
                </div>
                
                {/* --- IMAGE SEARCH UPLOAD WITH DELETE OPTION --- */}
                <div className="flex gap-2">
                  <div 
                    className="border rounded-md flex-1 flex items-center px-3 cursor-pointer"
                    onClick={() => searchFileInputRef.current?.click()}
                  >
                    {searchImagePreview ? (
                      <>
                        <div className="relative h-10 w-10 mr-2">
                          <Image
                            src={searchImagePreview}
                            alt="Search"
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                        <span className="text-gray-500 mr-2">Image selected</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 p-1 h-auto"
                          aria-label="Remove image"
                          onClick={handleRemoveSearchImage}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="mr-2 h-4 w-4 text-gray-400" />
                        <span className="text-gray-500">
                          Upload image to search
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      ref={searchFileInputRef}
                      onChange={handleSearchImageChange}
                      accept="image/*"
                      className="hidden"
                      aria-label="Select image for search"
                    />
                  </div>
                  <Button 
                    onClick={handleImageSearch}
                    disabled={!searchImage || searchLoading}
                    className="bg-lost text-lost-foreground hover:bg-lost/90"
                  >
                    {searchLoading ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Find Similar
                      </>
                    )}
                  </Button>
                </div>
                {/* --- END IMAGE SEARCH UPLOAD --- */}
              </div>
              
              {searchProgress !== 'idle' && (
                <div className={`mb-4 p-3 rounded-md ${
                  searchProgress === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                  searchProgress === 'complete' ? 'bg-green-50 text-green-700 border border-green-200' :
                  'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  <div className="flex items-center">
                    {searchProgress === 'error' && (
                      <div className="mr-2 text-red-500">⚠️</div>
                    )}
                    {searchProgress === 'complete' && (
                      <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                    )}
                    {searchProgress === 'searching' && (
                      <Clock className="mr-2 h-5 w-5 text-blue-500 animate-pulse" />
                    )}
                    <p className="font-medium">{searchStatusMessage}</p>
                  </div>
                </div>
              )}

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
                          
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded flex flex-col justify-between p-2 text-white">
                            <div className="text-sm font-semibold bg-black/60 self-start px-2 py-1 rounded">
                              Score: {item.score ? item.score.toFixed(4) : 'N/A'}
                            </div>
                            
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
                        className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
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
                            <div className="absolute bottom-2 right-2">
                              <Button 
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="bg-white/80 hover:bg-white text-gray-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setImageFile(null);
                                  setImagePreview(null);
                                  if (fileInputRef.current) {
                                    fileInputRef.current.value = "";
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="py-8">
                            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                            <p className="text-gray-500 dark:text-gray-400">Click to upload an image (required)</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                              Upload a clear photo to help others identify their lost item
                            </p>
                          </div>
                        )}
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImageChange}
                          accept="image/*"
                          className="hidden"
                          aria-label="Upload image"
                        />
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      disabled={uploading || !imageFile || !title || !location}
                      className="w-full bg-found text-found-foreground hover:bg-found/90"
                    >
                      {uploading ? (
                        <>
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        'Upload Found Item'
                      )}
                    </Button>
                    
                    {uploadStatus !== 'idle' && (
                      <div
                        className={`mt-4 rounded-2xl shadow-lg border transition-all duration-200 ${
                          uploadStatus === 'error'
                            ? 'bg-red-50/90 border-red-200 text-red-700'
                            : uploadStatus === 'complete'
                            ? 'bg-green-50/90 border-green-200 text-green-700'
                            : 'bg-blue-50/90 border-blue-200 text-blue-700'
                        }`}
                        style={{ minWidth: 320, maxWidth: 480, margin: '0 auto', padding: '1.5rem' }}
                        role="alert"
                        aria-live="assertive"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          {uploadStatus === 'error' && (
                            <span className="inline-flex items-center justify-center rounded-full bg-red-100 p-2">
                              <Trash2 className="h-5 w-5 text-red-500" />
                            </span>
                          )}
                          {uploadStatus === 'complete' && (
                            <span className="inline-flex items-center justify-center rounded-full bg-green-100 p-2">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            </span>
                          )}
                          {uploadStatus === 'uploading' && (
                            <span className="inline-flex items-center justify-center rounded-full bg-blue-100 p-2">
                              <Clock className="h-5 w-5 text-blue-500 animate-spin" />
                            </span>
                          )}
                          <div className="flex-1">
                            <p className="font-semibold text-base">
                              {uploadStatus === 'error'
                                ? 'Upload Error'
                                : uploadStatus === 'complete'
                                ? 'Upload Successful!'
                                : 'Uploading...'}
                            </p>
                            <p className="text-sm opacity-80">{statusMessage}</p>
                          </div>
                        </div>
                        {uploadStatus === 'complete' && (
                          <div className="mt-2 text-sm text-green-700">
                            <p>Your item has been successfully uploaded and is now searchable.</p>
                          </div>
                        )}
                      </div>
                    )}
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