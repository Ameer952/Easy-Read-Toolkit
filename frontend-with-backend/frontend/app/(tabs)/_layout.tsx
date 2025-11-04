import React, { useEffect, useState } from "react";
import { Platform, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { HapticTab } from "@/components/HapticTab";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { subscribeAvatar } from "@/lib/avatarEvents";
import { useTheme } from "@/hooks/useTheme";

export default function TabLayout() {
   const { theme } = useTheme();
   const { user } = useAuth();
   const [avatarUri, setAvatarUri] = useState<string | null>(null);

   useEffect(() => {
      const loadAvatar = async () => {
         try {
            if (!user) {
               setAvatarUri(null);
               return;
            }
            const key = user.email
               ? `avatar_${user.email}`
               : "avatar_default_user";
            const stored = await AsyncStorage.getItem(key);
            setAvatarUri(stored || null);
         } catch (e) {
            console.warn("Failed to load avatar for tab:", e);
         }
      };

      // initial load (or when user changes)
      loadAvatar();

      // live updates from ProfileScreen
      const unsubscribe = subscribeAvatar((uri) => {
         setAvatarUri(uri);
      });

      return unsubscribe;
   }, [user]);

   return (
      <Tabs
         screenOptions={{
            headerShown: false,
            tabBarButton: HapticTab,
            tabBarActiveTintColor: Colors[theme].tint,
            tabBarInactiveTintColor: Colors[theme].icon,
            tabBarStyle: Platform.select({
               ios: {
                  position: "absolute",
                  height: 88,
                  paddingBottom: 34,
                  backgroundColor: Colors[theme].background, // <- solid, e.g. white in light mode
                  borderTopColor: Colors[theme].border,
                  borderTopWidth: StyleSheet.hairlineWidth,
               },
               default: {
                  height: 88,
                  backgroundColor: Colors[theme].background,
                  borderTopColor: Colors[theme].border,
                  borderTopWidth: StyleSheet.hairlineWidth,
               },
            }),
         }}
      >
         <Tabs.Screen
            name="index"
            options={{
               title: "Home",
               tabBarIcon: ({ color }) => (
                  <Ionicons name="home" size={28} color={color} />
               ),
            }}
         />

         <Tabs.Screen
            name="documents"
            options={{
               title: "Documents",
               tabBarIcon: ({ color }) => (
                  <Ionicons
                     name="document-text-outline"
                     size={28}
                     color={color}
                  />
               ),
            }}
         />

         <Tabs.Screen
            name="profile"
            options={{
               title: "Profile",
               tabBarIcon: ({ color, size, focused }) =>
                  avatarUri ? (
                     <Image
                        source={{ uri: avatarUri }}
                        style={[
                           styles.avatarIcon,
                           {
                              width: size + 4,
                              height: size + 4,
                              borderRadius: (size + 4) / 2,
                              borderColor: focused
                                 ? Colors[theme].tint
                                 : "transparent",
                           },
                        ]}
                        contentFit="cover"
                     />
                  ) : (
                     <Ionicons
                        name="person-circle-outline"
                        size={28}
                        color={color}
                     />
                  ),
            }}
         />
      </Tabs>
   );
}

const styles = StyleSheet.create({
   avatarIcon: {
      borderWidth: 2,
   },
});
