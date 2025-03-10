// app/search/image/page.tsx
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, ImageIcon } from 'lucide-react';
import Image from 'next/image';

export default function ImageSearchPage() {
  const fileInputRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSearch = async () => {
    if (!selectedImage) return;
    
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      
      const response = await fetch('/api/search/image', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      setResults(data.items || []);
    } catch (error) {
      console.error('Error searching by image:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Search by Image</h1>
      
      <Card className="p-6 mb-8">
        <div 
          className="border-2 border-dashed rounded-lg p-8 text-center"
          onClick={() => fileInputRef.current?.click()}
        >
          {previewUrl ? (
            <div className="relative h-64 w-full">
              <Image
                src={previewUrl}
                alt="Preview"
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
          ) : (
            <>
              <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">Upload an Image</h3>
              <p className="text-sm text-gray-500 mb-4">
                Upload an image to find similar items in our database
              </p>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Select Image
              </Button>
            </>
          )}
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />
        </div>
        
        <div className="mt-4 text-center">
          <Button 
            onClick={handleSearch} 
            disabled={!selectedImage || loading}
          >
            {loading ? 'Searching...' : 'Search Similar Items'}
          </Button>
        </div>
      </Card>
      
      {results.length > 0 && (
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
      )}
    </div>
  );
}
