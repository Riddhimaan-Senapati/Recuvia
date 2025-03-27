'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ImageIcon, SearchIcon, Upload } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from "@/components/ui/theme-toggle";


export default function Home() {
  const { user, signOut } = useAuth();

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2">
            <ImageIcon className="h-6 w-6 text-found" />
            <span className="text-xl font-bold">FindR</span>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-gray-700 dark:text-gray-300">{user.email}</span>
                <ThemeToggle />
                <Button 
                  variant="destructive" 
                  onClick={signOut}
                >
                  Sign Out
                </Button>
                <Button className="bg-found text-found-foreground hover:bg-found/90" asChild>
                  <Link href="/main">Go to Dashboard</Link>
                </Button>
              </div>
            ) : (
              <>
                <ThemeToggle />
                <Button variant="ghost" asChild>
                  <Link href="/main">Browse Items</Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
                <Button className="bg-found text-found-foreground hover:bg-found/90" asChild>
                  <Link href="/auth/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container px-4 py-24 md:py-32">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="text-found">Find</span> What You've <span className="text-lost">Lost</span>
          </h1>
          <p className="mt-6 max-w-[42rem] text-lg text-muted-foreground sm:text-xl">
            Using AI-powered semantic search to connect lost items with their owners.
            Search by text description or upload a photo to find visual matches.
          </p>
          <div className="mt-12 flex flex-col gap-4 sm:flex-row">
            {user ? (
              <Button size="lg" className="gap-2 bg-found text-found-foreground hover:bg-found/90" asChild>
                <Link href="/main">
                  <SearchIcon className="h-5 w-5" />
                  Go to Dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Button size="lg" className="gap-2 bg-lost text-lost-foreground hover:bg-lost/90" asChild>
                  <Link href="/auth/signup">
                    <Upload className="h-5 w-5" />
                    Sign Up to Report Items
                  </Link>
                </Button>
                <Button size="lg" className="gap-2 bg-found text-found-foreground hover:bg-found/90" asChild>
                  <Link href="/auth/signin">
                    <SearchIcon className="h-5 w-5" />
                    Sign In to Search
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container px-4 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          <Card className="p-6 border-lost/20">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-lost/10">
              <Upload className="h-6 w-6 text-lost" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-lost">Report Found Items</h3>
            <p className="text-muted-foreground">
              Upload photos and details of items you've found to help reunite them with their owners.
            </p>
          </Card>
          <Card className="p-6 border-found/20">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-found/10">
              <SearchIcon className="h-6 w-6 text-found" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-found">Dual Search Methods</h3>
            <p className="text-muted-foreground">
              Find your lost items using text descriptions or by uploading a similar image for visual matching.
            </p>
          </Card>
          <Card className="p-6 border-found/20">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-found/10">
              <ImageIcon className="h-6 w-6 text-found" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-found">Vector Similarity</h3>
            <p className="text-muted-foreground">
              Our platform uses vector embeddings and Milvus database to find the most similar matches to your query.
            </p>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container px-4 py-16 border-t">
        <h2 className="text-3xl font-bold text-center mb-12">How FindR Works</h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6 border-primary/20">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl font-bold">1</div>
            <h3 className="mb-2 text-xl font-semibold">Sign Up</h3>
            <p className="text-muted-foreground">
              Create an account to access all features of the platform.
            </p>
          </Card>
          <Card className="p-6 border-primary/20">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl font-bold">2</div>
            <h3 className="mb-2 text-xl font-semibold">Report or Search</h3>
            <p className="text-muted-foreground">
              Upload found items or search for your lost belongings.
            </p>
          </Card>
          <Card className="p-6 border-primary/20">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl font-bold">3</div>
            <h3 className="mb-2 text-xl font-semibold">Review Matches</h3>
            <p className="text-muted-foreground">
              Browse through potential matches with similarity scores.
            </p>
          </Card>
          <Card className="p-6 border-primary/20">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl font-bold">4</div>
            <h3 className="mb-2 text-xl font-semibold">Reconnect</h3>
            <p className="text-muted-foreground">
              Contact the submitter to arrange retrieval of your item.
            </p>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container flex flex-col md:flex-row h-auto md:h-16 py-4 md:py-0 items-center justify-between">
          <div className="flex flex-col items-center md:items-start space-y-2 md:space-y-0">
            <span className="text-sm text-muted-foreground">
              &copy; 2025 FindR. All rights reserved.
            </span>
          </div>
          
          <span className="text-sm text-muted-foreground my-2 md:my-0">
            Built with <span className="text-red-500">❤</span> by Riddhimaan Senapati
          </span>
          
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/privacy">Privacy</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/terms">Terms</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/contact">Contact</Link>
            </Button>
          </div>
        </div>
      </footer>
    </main>
  );
}