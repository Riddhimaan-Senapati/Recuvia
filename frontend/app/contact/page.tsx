'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ContactPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to email client
    window.location.href = "mailto:riddhimaan22@gmail.com";
    // Allow time for the email client to open before redirecting back
    const timer = setTimeout(() => {
      router.push("/");
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [router]);
  
  return (
    <main className="container mx-auto px-4 py-12 min-h-screen bg-gradient-to-b from-background via-background to-muted/25">
      <div className="max-w-3xl mx-auto bg-card p-8 rounded-lg shadow-md border border-border/50">
        <div className="mb-8 flex justify-between items-center">
          <Link href="/">
            <Button variant="ghost" className="p-0 hover:bg-transparent hover:text-primary">
              &larr; Back to Home
            </Button>
          </Link>
          
          <span className="text-sm text-muted-foreground">FindR</span>
        </div>
        
        <h1 className="text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-lost to-found">Contact Us</h1>
        
        <div className="space-y-6">
          <div className="text-center bg-muted/50 p-6 rounded-lg">
            <p className="text-xl mb-4 font-medium">
              Redirecting you to your email client...
            </p>
            
            <p className="text-lg">
              If you're not automatically redirected, please email us at: 
              <a href="mailto:riddhimaan22@gmail.com" className="text-found font-semibold ml-2 underline underline-offset-4">
                riddhimaan22@gmail.com
              </a>
            </p>
          </div>
          
          <div className="text-center mt-10">
            <Button asChild size="lg" className="bg-found text-found-foreground hover:bg-found/90">
              <Link href="/">Return to Home</Link>
            </Button>
          </div>
          
          <div className="text-center text-sm text-muted-foreground mt-12 pt-6 border-t">
            <p>Built with ❤️ by Riddhimaan Senapati</p>
          </div>
        </div>
      </div>
    </main>
  );
} 