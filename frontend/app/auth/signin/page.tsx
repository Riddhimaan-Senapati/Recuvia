"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { createBrowserSupabaseClient } from "@/app/utils/supabase-browser";

const supabase = createBrowserSupabaseClient();

export default function SignIn() {
  const router = useRouter();

  const handleSignIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    router.push("/main");
    router.refresh();
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  };

  return (
    <AuthShell
      title="Sign In"
      submitLabel="Sign In"
      loadingLabel="Signing in..."
      onSubmit={handleSignIn}
      onGoogle={handleGoogleSignIn}
      footer={
        <>
          Don't have an account?{" "}
          <Link href="/auth/signup" className="text-found hover:underline">
            Sign Up
          </Link>
        </>
      }
    />
  );
}
