
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { authClient, setBearerToken, clearAuthTokens, API_URL } from "@/lib/auth";

// Configure WebBrowser for better OAuth experience
WebBrowser.maybeCompleteAuthSession();

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Web-only: Open OAuth popup
function openOAuthPopup(provider: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const popupUrl = `${window.location.origin}/auth-popup?provider=${provider}`;
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      popupUrl,
      "oauth-popup",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    if (!popup) {
      reject(new Error("Failed to open popup. Please allow popups."));
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "oauth-success" && event.data?.token) {
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        resolve(event.data.token);
      } else if (event.data?.type === "oauth-error") {
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        reject(new Error(event.data.error || "OAuth failed"));
      }
    };

    window.addEventListener("message", handleMessage);

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener("message", handleMessage);
        reject(new Error("Authentication cancelled"));
      }
    }, 500);
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[AuthContext] Initializing, fetching user session...");
    fetchUser();

    // Listen for deep links (e.g. from social auth redirects)
    const subscription = Linking.addEventListener("url", (event) => {
      console.log("[AuthContext] Deep link received:", event.url);
      // Allow time for the client to process the token if needed
      setTimeout(() => {
        console.log("[AuthContext] Refreshing user session after deep link");
        fetchUser();
      }, 1000);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const fetchUser = async () => {
    try {
      console.log("[AuthContext] Fetching user session...");
      setLoading(true);
      
      const session = await authClient.getSession();
      console.log("[AuthContext] Session response:", session);
      
      if (session?.data?.user) {
        console.log("[AuthContext] User authenticated:", session.data.user.email);
        setUser(session.data.user as User);
        
        // Sync token to SecureStore for utils/api.ts
        if (session.data.session?.token) {
          console.log("[AuthContext] Storing bearer token");
          await setBearerToken(session.data.session.token);
        }
      } else {
        console.log("[AuthContext] No active session found");
        setUser(null);
        await clearAuthTokens();
      }
    } catch (error) {
      console.error("[AuthContext] Failed to fetch user:", error);
      setUser(null);
      await clearAuthTokens();
    } finally {
      setLoading(false);
      console.log("[AuthContext] Fetch user complete");
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log("[AuthContext] Signing in with email:", email);
      
      // Better Auth client API - the data and options are in the same object
      const result = await authClient.signIn.email({
        email,
        password,
        fetchOptions: {
          onSuccess: async (ctx) => {
            console.log("[AuthContext] Sign in success, context:", ctx);
          },
          onError: (ctx) => {
            console.error("[AuthContext] Sign in error:", ctx.error);
          }
        }
      });
      
      console.log("[AuthContext] Sign in result:", result);
      
      // Check if there was an error in the result
      if (result.error) {
        throw new Error(result.error.message || "Sign in failed");
      }
      
      // Fetch user after successful sign in
      await fetchUser();
    } catch (error: any) {
      console.error("[AuthContext] Email sign in failed:", error);
      // Extract meaningful error message
      const errorMessage = error?.message || "Sign in failed. Please check your credentials.";
      throw new Error(errorMessage);
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    try {
      console.log("[AuthContext] Signing up with email:", email, "name:", name);
      
      // Better Auth client API - the data and options are in the same object
      const result = await authClient.signUp.email({
        email,
        password,
        name: name || undefined,
        fetchOptions: {
          onSuccess: async (ctx) => {
            console.log("[AuthContext] Sign up success, context:", ctx);
          },
          onError: (ctx) => {
            console.error("[AuthContext] Sign up error:", ctx.error);
          }
        }
      });
      
      console.log("[AuthContext] Sign up result:", result);
      
      // Check if there was an error in the result
      if (result.error) {
        throw new Error(result.error.message || "Sign up failed");
      }
      
      // Fetch user after successful sign up
      await fetchUser();
    } catch (error: any) {
      console.error("[AuthContext] Email sign up failed:", error);
      // Extract meaningful error message
      const errorMessage = error?.message || "Sign up failed. Please try again.";
      throw new Error(errorMessage);
    }
  };

  const signInWithSocial = async (provider: "google" | "apple" | "github") => {
    try {
      console.log("[AuthContext] Starting social sign in with:", provider);
      
      if (Platform.OS === "web") {
        // Web: Use popup window
        const token = await openOAuthPopup(provider);
        await setBearerToken(token);
        await fetchUser();
      } else {
        // Native: Use WebBrowser directly to avoid the Better Auth Expo client bug
        // The redirect URI should match what's registered in the OAuth provider
        const redirectUri = Linking.createURL("auth-callback");
        console.log("[AuthContext] Native redirect URI:", redirectUri);
        
        // Construct the OAuth URL using Better Auth's endpoint
        // Better Auth expects: /api/auth/sign-in/social
        // But for native, we need to use the direct OAuth flow
        const oauthUrl = `${API_URL}/api/auth/sign-in/social?provider=${provider}&callbackURL=${encodeURIComponent(redirectUri)}`;
        
        console.log("[AuthContext] Opening OAuth URL:", oauthUrl);
        
        // Open the OAuth flow in a browser
        const result = await WebBrowser.openAuthSessionAsync(
          oauthUrl,
          redirectUri
        );
        
        console.log("[AuthContext] WebBrowser result:", result);
        
        if (result.type === "success") {
          console.log("[AuthContext] OAuth success, URL:", result.url);
          // The session should now be set via cookies/storage
          // Wait a bit for the session to be established
          await new Promise(resolve => setTimeout(resolve, 1500));
          await fetchUser();
        } else if (result.type === "cancel") {
          throw new Error("Authentication cancelled");
        } else {
          throw new Error("Authentication failed");
        }
      }
    } catch (error: any) {
      console.error(`[AuthContext] ${provider} sign in failed:`, error);
      const errorMessage = error?.message || `${provider} sign in failed`;
      throw new Error(errorMessage);
    }
  };

  const signInWithGoogle = () => signInWithSocial("google");
  const signInWithApple = () => signInWithSocial("apple");
  const signInWithGitHub = () => signInWithSocial("github");

  const signOut = async () => {
    try {
      console.log("[AuthContext] Signing out...");
      await authClient.signOut();
      console.log("[AuthContext] Sign out successful");
    } catch (error) {
      console.error("[AuthContext] Sign out failed (API):", error);
    } finally {
      // Always clear local state
      console.log("[AuthContext] Clearing local auth state");
      setUser(null);
      await clearAuthTokens();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithApple,
        signInWithGitHub,
        signOut,
        fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
