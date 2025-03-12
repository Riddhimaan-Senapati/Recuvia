'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ImageIcon, SearchIcon, Upload } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
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
            <Button variant="ghost" asChild>
              <Link href="/main">Browse Items</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/auth/signin">Sign In</Link>
            </Button>
            <Button className="bg-found text-found-foreground hover:bg-found/90" asChild>
              <Link href="/auth/signup">Sign Up</Link>
            </Button>
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
            Using advanced AI-powered image recognition to reunite you with your lost items.
            Simply upload a photo and we'll search our database of found items.
          </p>
          <div className="mt-12 flex flex-col gap-4 sm:flex-row">
            <Button size="lg" className="gap-2 bg-lost text-lost-foreground hover:bg-lost/90" asChild>
              <Link href="/main">
                <Upload className="h-5 w-5" />
                Upload Lost Item
              </Link>
            </Button>
            <Button size="lg" className="gap-2 bg-found text-found-foreground hover:bg-found/90" asChild>
              <Link href="/main">
                <SearchIcon className="h-5 w-5" />
                Browse Found Items
              </Link>
            </Button>
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
            <h3 className="mb-2 text-xl font-semibold text-lost">Upload Your Item</h3>
            <p className="text-muted-foreground">
              Take a photo of your lost item and upload it to our platform.
            </p>
          </Card>
          <Card className="p-6 border-found/20">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-found/10">
              <SearchIcon className="h-6 w-6 text-found" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-found">AI-Powered Search</h3>
            <p className="text-muted-foreground">
              Our advanced AI scans through thousands of found items to find potential matches.
            </p>
          </Card>
          <Card className="p-6 border-found/20">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-found/10">
              <ImageIcon className="h-6 w-6 text-found" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-found">Get Matched</h3>
            <p className="text-muted-foreground">
              Review matches and connect with finders to retrieve your belongings.
            </p>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container flex h-16 items-center justify-between">
          <span className="text-sm text-muted-foreground">
            © 2025 FindR. All rights reserved.
          </span>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              Privacy
            </Button>
            <Button variant="ghost" size="sm">
              Terms
            </Button>
            <Button variant="ghost" size="sm">
              Contact
            </Button>
          </div>
        </div>
      </footer>
    </main>
  );
}