"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useSearch } from "@/hooks/useSearch";
import { SearchPanel } from "@/components/SearchPanel";
import { ResultsGrid } from "@/components/ResultsGrid";
import { UploadForm } from "@/components/UploadForm";

interface AuthContextType {
  user: any;
  loading: boolean;
  signOut: () => void;
}

export default function MainPage() {
  const { user, loading: authLoading, signOut } = useAuth() as AuthContextType;
  const [activeTab, setActiveTab] = useState("lost");
  const search = useSearch(activeTab, setActiveTab);

  const handleSignOut = () => {
    if (typeof signOut === "function") {
      signOut();
    } else {
      console.error("signOut is not a function");
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-8">
        <Link href="/" className="text-2xl font-bold">
          Recuvia
        </Link>
        <div className="space-x-4">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-gray-700 dark:text-gray-300">
                {user.email}
              </span>
              <ThemeToggle />
              <Button variant="destructive" onClick={handleSignOut}>
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
              Use the{" "}
              <span className="font-semibold text-lost">Lost Items</span> tab to
              search for items you've lost. Use the{" "}
              <span className="font-semibold text-found">Found Items</span> tab
              to upload items you've found.
            </p>
          </div>

          <Tabs
            defaultValue="lost"
            value={activeTab}
            onValueChange={setActiveTab}
          >
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
              <SearchPanel {...search} />
              <ResultsGrid search={search} user={user} />
            </TabsContent>

            <TabsContent value="found">
              <UploadForm />
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
