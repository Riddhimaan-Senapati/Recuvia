'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Process the OAuth callback
    const handleCallback = async () => {
      try {
        // Get the auth code from the URL
        const hash = window.location.hash;
        const query = window.location.search;
        
        // Exchange the code for a session
        const { error } = await supabase.auth.exchangeCodeForSession(
          query || hash
        );

        if (error) {
          console.error('Error processing auth callback:', error);
        }
      } catch (error) {
        console.error('Unexpected error during auth callback:', error);
      } finally {
        // Redirect to home page whether successful or not
        // User will be authenticated or not based on the session state
        router.push('/main');
        router.refresh();
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Completing sign in...</h2>
        <p className="text-gray-500">Please wait while we redirect you.</p>
      </div>
    </div>
  );
}
