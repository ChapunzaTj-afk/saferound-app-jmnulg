
import { colors } from "@/styles/commonStyles";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { SystemBars } from "react-native-edge-to-edge";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import React, { useEffect, useState } from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useColorScheme, View, ActivityIndicator } from "react-native";
import { Stack, useRouter, usePathname, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import { WidgetProvider } from "@/contexts/WidgetContext";
import * as SplashScreen from "expo-splash-screen";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    console.log("[Auth Bootstrap] Loading:", loading, "User:", user ? user.email : "none", "Pathname:", pathname);
    
    if (loading) {
      console.log("[Auth Bootstrap] Still loading, waiting...");
      return;
    }

    // Prevent navigation loops
    if (isNavigating) {
      console.log("[Auth Bootstrap] Already navigating, skipping...");
      return;
    }

    const inAuthGroup = segments[0] === "(tabs)";
    const onAuthScreen = pathname === "/auth" || pathname === "/auth-callback" || pathname === "/auth-popup";

    console.log("[Auth Bootstrap] In auth group:", inAuthGroup, "On auth screen:", onAuthScreen);

    if (!user && !onAuthScreen) {
      console.log("[Auth Bootstrap] User not authenticated, redirecting to /auth");
      setIsNavigating(true);
      router.replace("/auth");
      setTimeout(() => setIsNavigating(false), 500);
    } else if (user && onAuthScreen) {
      console.log("[Auth Bootstrap] User authenticated, redirecting to dashboard");
      setIsNavigating(true);
      router.replace("/(tabs)/dashboard");
      setTimeout(() => setIsNavigating(false), 500);
    } else {
      console.log("[Auth Bootstrap] Navigation state is correct");
    }
  }, [user, loading, pathname, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
      <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
      <Stack.Screen name="create-round" options={{ headerShown: true, title: "Create Round" }} />
      <Stack.Screen name="round/[id]" options={{ headerShown: true, title: "Round Details" }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <WidgetProvider>
            <RootLayoutNav />
            <StatusBar style="auto" />
            <SystemBars style="auto" />
          </WidgetProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
