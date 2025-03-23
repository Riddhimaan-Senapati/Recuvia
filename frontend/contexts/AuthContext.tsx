'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter, usePathname } from 'next/navigation';
import { Session, User } from '@supabase/supabase-js';

// Create a single instance of Supabase client
const supabaseClient = createClientComponentClient();

// Define the type for the context value
type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn?: (email: string, password: string) => Promise<void>;
  signUp?: (email: string, password: string) => Promise<void>;
  signOut?: () => Promise<void>;
};

// Create context with proper typing
const AuthContext = createContext<AuthContextType | null>(null);

// Define props type for AuthProvider
type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const getUser = async () => {
      // Use the existing client
      const { data: { user } } = await supabaseClient.auth.getUser();
      setUser(user);
      setLoading(false);

      // Handle protected routes
      const isAuthRoute = pathname.startsWith('/auth/');
      const isMainPage = pathname === '/main';
      const isHomePage = pathname === '/';

      if (user) {
        // User is logged in
        if (isAuthRoute) {
          // Redirect away from auth pages if already logged in
          router.push('/main');
        }
      } else {
        // User is not logged in
        if (isMainPage) {
          // Redirect to sign in if trying to access protected page
          router.push('/auth/signin');
        }
      }
    };

    getUser();

    // Set up auth state change listener
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Handle auth state changes
      if (event === 'SIGNED_IN') {
        router.push('/main');
      } else if (event === 'SIGNED_OUT') {
        router.push('/');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  const signOut = async () => {
    // Use the existing client
    await supabaseClient.auth.signOut();
    setUser(null);
  };

  const value = {
    user,
    loading,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 