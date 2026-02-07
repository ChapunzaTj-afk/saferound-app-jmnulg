
import "react-native-reanimated";
import React, { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme, View, ActivityIndicator } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { colors } from "@/styles/commonStyles";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "auth",
};

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "auth" || segments[0] === "auth-popup" || segments[0] === "auth-callback";

    if (!user && !inAuthGroup) {
      // Redirect to auth if not authenticated
      console.log("[Auth Bootstrap] User not authenticated, redirecting to /auth");
      router.replace("/auth");
    } else if (user && inAuthGroup) {
      // Redirect to dashboard if authenticated
      console.log("[Auth Bootstrap] User authenticated, redirecting to /dashboard");
      router.replace("/dashboard");
    }

    setIsNavigationReady(true);
  }, [user, loading, segments]);

  if (loading || !isNavigationReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
      <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="create-round" options={{ presentation: "modal", headerShown: true, title: "Create Round" }} />
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

  const SafeRoundLightTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.error,
    },
  };

  const SafeRoundDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: colors.primary,
      background: '#1A1A1A',
      card: '#2A2A2A',
      text: '#FFFFFF',
      border: '#3A3A3A',
      notification: colors.error,
    },
  };

  return (
    <>
      <StatusBar style="auto" animated />
      <ThemeProvider
        value={colorScheme === "dark" ? SafeRoundDarkTheme : SafeRoundLightTheme}
      >
        <AuthProvider>
          <WidgetProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <RootLayoutNav />
              <SystemBars style="auto" />
            </GestureHandlerRootView>
          </WidgetProvider>
        </AuthProvider>
      </ThemeProvider>
    </>
  );
}
