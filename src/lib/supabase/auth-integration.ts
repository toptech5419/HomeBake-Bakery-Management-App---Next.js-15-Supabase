import { supabase } from './client';

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
}

/**
 * Simpler approach: Sign in user with email/password to Supabase Auth
 * This creates a session that makes auth.uid() work properly
 */
export async function signInToSupabase(email: string, password: string = 'temp-password-123'): Promise<boolean> {
  try {
    // Try to sign in with existing credentials
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (!signInError && signInData.user) {
      return true;
    }
    
    // If sign in fails, try to sign up (creates user in Supabase Auth)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          email_confirm: true
        }
      }
    });
    
    if (signUpError) {
      console.error('Error signing up to Supabase:', signUpError);
      return false;
    }
    
    return !!signUpData.user;
  } catch (error) {
    console.error('Error in signInToSupabase:', error);
    return false;
  }
}

/**
 * Ensure current user is authenticated with Supabase
 */
export async function ensureSupabaseAuth(user: User): Promise<boolean> {
  try {
    // Check if already authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user?.email === user.email) {
      return true; // Already authenticated with correct user
    }
    
    // Not authenticated or wrong user, sign in
    return await signInToSupabase(user.email);
  } catch (error) {
    console.error('Error ensuring Supabase auth:', error);
    return false;
  }
}

/**
 * Sign out from Supabase Auth
 */
export async function signOutFromSupabase(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Error signing out from Supabase:', error);
  }
}