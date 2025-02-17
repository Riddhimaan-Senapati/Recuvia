'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ImageIcon, SearchIcon, Upload } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function MainPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <ImageIcon className="h-6 w-6 text-found" />
            <span className="text-xl font-bold">FindR</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild>
              <Link href="/auth/sign-in">Sign In</Link>
            </Button>
            <Button className="bg-found text-found-foreground hover:bg-found/90" asChild>
              <Link href="/auth/sign-up">Sign Up</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container py-8">
        <Tabs defaultValue="lost" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="lost" className="data-[state=active]:bg-lost data-[state=active]:text-lost-foreground">
              Lost Items
            </TabsTrigger>
            <TabsTrigger value="found" className="data-[state=active]:bg-found data-[state=active]:text-found-foreground">
              Found Items
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lost" className="space-y-8">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-6 text-lost">Report a Lost Item</h2>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Search Database</h3>
                    <div className="flex gap-2">
                      <Input placeholder="Search for your item..." className="flex-1" />
                      <Button className="bg-lost text-lost-foreground hover:bg-lost/90">
                        <SearchIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Upload Image</h3>
                    <Button className="w-full bg-lost text-lost-foreground hover:bg-lost/90">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="found" className="space-y-8">
            <div className="grid gap-6 md:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <Card key={item} className="overflow-hidden">
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-found mb-2">Found Item #{item}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Location: Example Location
                    </p>
                    <Button className="w-full bg-found text-found-foreground hover:bg-found/90">
                      View Details
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}