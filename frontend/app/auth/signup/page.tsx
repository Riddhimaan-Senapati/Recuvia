"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { createBrowserSupabaseClient } from "@/app/utils/supabase-browser";

const supabase = createBrowserSupabaseClient();

export default function SignUp() {
  const router = useRouter();

  const handleSignUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    router.push("/");
    router.refresh();
  };

  const handleGoogleSignUp = async () => {
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
      title="Create an Account"
      submitLabel="Sign Up"
      loadingLabel="Creating account..."
      onSubmit={handleSignUp}
      onGoogle={handleGoogleSignUp}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/auth/signin" className="text-found hover:underline">
            Sign In
          </Link>
        </>
      }
    />
  );
}
