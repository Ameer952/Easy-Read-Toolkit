import { Image } from "expo-image";
import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActionButton } from "@/components/ActionButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";

export default function HomeScreen() {
   const { theme } = useTheme();
   const { user } = useAuth();
   const router = useRouter();
   const insets = useSafeAreaInsets();

   const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return "Good morning";
      if (hour < 17) return "Good afternoon";
      return "Good evening";
   };

   const getFirstName = () => {
      if (!user?.name) return "there";
      return user.name.split(" ")[0];
   };

   return (
      <ThemedView
         style={[
            styles.container,
            { backgroundColor: Colors[theme].background },
         ]}
      >
         {/* Header (same height logic as Documents) */}
         <ThemedView
            style={[
               styles.header,
               {
                  backgroundColor: Colors[theme].headerBackground,
                  paddingTop: insets.top + 20,
               },
            ]}
         >
            <ThemedView style={styles.headerContent}>
               <ThemedView style={styles.headerTextContainer}>
                  <ThemedText style={styles.headerTitleOnly}>
                     Easy Read ToolKit
                  </ThemedText>
                  <ThemedText style={styles.headerSubtitle}>
                     Home page
                  </ThemedText>
               </ThemedView>

               <Image
                  source={require("@/assets/images/easyread logo 2.png")}
                  style={styles.logo}
                  contentFit="contain"
               />
            </ThemedView>
         </ThemedView>

         <ScrollView
            style={[
               styles.scrollView,
               { backgroundColor: Colors[theme].background },
            ]}
            contentContainerStyle={{
               paddingBottom: insets.bottom + 120,
               paddingTop: 20,
            }}
            showsVerticalScrollIndicator={false}
            bounces={false}
         >
            {/* Greeting Card */}
            <ThemedView
               style={[
                  styles.greetingCard,
                  {
                     backgroundColor: Colors[theme].surface,
                     borderColor: Colors[theme].border,
                  },
               ]}
            >
               <ThemedText style={styles.greeting}>
                  {getGreeting()}, {getFirstName()}!
               </ThemedText>
               <ThemedText style={styles.supportiveText}>
                  Ready to make reading easier? Let's get started!
               </ThemedText>
            </ThemedView>

            {/* Actions */}
            <ThemedView style={styles.actionsSection}>
               <ThemedText style={styles.sectionTitle}>Actions</ThemedText>
               <ThemedView style={styles.actionButtons}>
                  {/* <ActionButton
                     title="Scan Document"
                     iconName="camera"
                     onPress={() => router.push("/camera")}
                  /> */}
                  <ActionButton
                     title="Paste URL"
                     iconName="link-outline"
                     onPress={() => router.push("/url-import")}
                  />
                  <ActionButton
                     title="Upload PDF"
                     iconName="document-text-outline"
                     onPress={() => router.push("/pdf-upload")}
                  />
                  <ActionButton
                     title="Translate Text"
                     iconName="language-outline"
                     onPress={() => router.push("/translator")}
                  />
               </ThemedView>
            </ThemedView>
         </ScrollView>
      </ThemedView>
   );
}

const styles = StyleSheet.create({
   container: { flex: 1 },

   header: {
      paddingBottom: 24,
      paddingHorizontal: 20,
   },
   headerContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
   },
   logo: {
      width: 50,
      height: 50,
      marginLeft: 12,
   },
   headerTextContainer: {
      flexShrink: 1,
      flex: 1,
   },
   headerTitleOnly: {
      fontSize: 28,
      fontWeight: "bold",
      color: "#fff",
      marginBottom: 2,
   },
   headerSubtitle: {
      fontSize: 16,
      color: "#fff",
      opacity: 0.85,
      marginTop: 2,
   },

   scrollView: {
      flex: 1,
      paddingHorizontal: 20,
   },
   greetingCard: {
      borderWidth: 1,
      borderRadius: 16,
      paddingVertical: 28,
      paddingHorizontal: 20,
      marginTop: 16,
      marginBottom: 32,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
   },
   greeting: {
      fontSize: 30,
      fontWeight: "700",
      marginBottom: 8,
   },
   supportiveText: {
      fontSize: 16,
      lineHeight: 24,
      opacity: 0.75,
   },
   actionsSection: {
      marginBottom: 32,
   },
   sectionTitle: {
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 16,
   },
   actionButtons: {
      gap: 12,
   },
});
