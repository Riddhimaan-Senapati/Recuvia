// app/api/auth/signup/route.ts'
import { supabase } from "@/lib/supabase";
export async function POST(req: Request) {
    const { email, password } = await req.json();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    // Return response
  }
  