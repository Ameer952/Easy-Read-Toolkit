import {
   DarkTheme,
   DefaultTheme,
   ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { ThemeProvider, useTheme } from "@/hooks/useTheme";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

function RootNavigator() {
   const { theme } = useTheme();
   const { user, isLoading } = useAuth();
   const segments = useSegments();
   const router = useRouter();

   useEffect(() => {
      if (isLoading) return;

      const inTabsGroup = segments[0] === "(tabs)";
      const inProtectedRoute =
         segments[0] === "camera" ||
         segments[0] === "pdf-upload" ||
         segments[0] === "url-import";
      const inAuthRoute = segments[0] === "login" || segments[0] === "register";

      if (!user && (inTabsGroup || inProtectedRoute)) {
         // Not authenticated, trying to access protected content
         router.replace("/login");
      } else if (user && inAuthRoute) {
         // Already authenticated, don’t stay on auth screens
         router.replace("/(tabs)");
      }
   }, [user, segments, isLoading, router]);

   if (isLoading) {
      // You can swap this for a proper splash/loading screen if you want
      return null;
   }

   return (
      <NavigationThemeProvider
         value={theme === "dark" ? DarkTheme : DefaultTheme}
      >
         <Stack>
            {/* Main tabs */}
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

            {/* Settings (opened from Profile) */}
            <Stack.Screen name="settings" options={{ headerShown: false }} />

            {/* Auth screens */}
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ headerShown: false }} />

            {/* Utility / tool screens */}
            <Stack.Screen name="camera" options={{ headerShown: false }} />
            <Stack.Screen name="pdf-upload" options={{ headerShown: false }} />
            <Stack.Screen name="url-import" options={{ headerShown: false }} />

            {/* 404 fallback */}
            <Stack.Screen name="+not-found" />
         </Stack>

         <StatusBar style={theme === "dark" ? "light" : "dark"} />
      </NavigationThemeProvider>
   );
}

export default function RootLayout() {
   const [loaded] = useFonts({
      SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
   });

   if (!loaded) {
      return null;
   }

   return (
      <ThemeProvider>
         <AuthProvider>
            <RootNavigator />
         </AuthProvider>
      </ThemeProvider>
   );
}
