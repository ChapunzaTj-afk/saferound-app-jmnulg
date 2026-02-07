
import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { fetchUser } = useAuth();

  useEffect(() => {
    console.log("[Auth Callback] Processing OAuth callback");
    
    // Give the auth system time to process the callback
    const processCallback = async () => {
      try {
        // Wait a bit for the session to be established
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        console.log("[Auth Callback] Fetching user session");
        await fetchUser();
        
        console.log("[Auth Callback] Redirecting to dashboard");
        router.replace("/(tabs)/dashboard");
      } catch (error) {
        console.error("[Auth Callback] Error processing callback:", error);
        router.replace("/auth");
      }
    };

    processCallback();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: "#333",
  },
});
