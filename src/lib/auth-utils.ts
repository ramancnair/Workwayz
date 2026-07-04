import { auth as firebaseAuth } from './firebase';
import { updatePassword as fbUpdatePassword } from 'firebase/auth';
import { supabase } from './supabase';

/**
 * Updates the user's password client-side depending on the active auth provider.
 */
export async function changeUserPassword(newPassword: string, authProvider: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (authProvider === 'supabase') {
      if (!supabase) {
        throw new Error("Supabase is not initialized.");
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } else if (authProvider === 'firebase') {
      if (!firebaseAuth) {
        throw new Error("Firebase is not initialized.");
      }
      
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        return { success: false, error: "Authentication session is initializing. Please try again in a moment." };
      }
      
      await fbUpdatePassword(currentUser, newPassword);
      return { success: true };
    } else {
      return { success: false, error: `Password update is not supported for ${authProvider} provider.` };
    }
  } catch (err: any) {
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}
