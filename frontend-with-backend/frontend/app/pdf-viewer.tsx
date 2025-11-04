import React, { useEffect, useState } from "react";
import { Platform, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";

import * as IntentLauncher from "expo-intent-launcher";
import * as FS from "expo-file-system/legacy"; // use legacy to avoid deprecation squiggles

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";

export default function PDFViewer() {
   const { theme } = useTheme();
   const router = useRouter();
   const { url, title } = useLocalSearchParams<{
      url?: string;
      title?: string;
   }>();
   const [errorMsg, setErrorMsg] = useState<string | null>(null);

   useEffect(() => {
      if (!url) {
         setErrorMsg("No PDF found.");
         return;
      }

      if (Platform.OS === "android") {
         (async () => {
            try {
               // Convert file:// to content:// so external apps can read it
               const contentUri = await FS.getContentUriAsync(url as string);

               await IntentLauncher.startActivityAsync(
                  "android.intent.action.VIEW",
                  {
                     data: contentUri,
                     flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
                     type: "application/pdf",
                  }
               );

               // optional: go back after handing off to the viewer
               router.back();
            } catch (e: any) {
               setErrorMsg(e?.message || "Unable to open PDF.");
            }
         })();
      }
   }, [url]);

   if (!url) {
      return (
         <ThemedView style={styles.container}>
            <ThemedText style={styles.title}>PDF</ThemedText>
            <ThemedText>No PDF available.</ThemedText>
         </ThemedView>
      );
   }

   // Android: show a small status screen while launching external viewer
   if (Platform.OS === "android") {
      return (
         <ThemedView style={styles.container}>
            <ThemedText style={styles.title}>{title ?? "PDF"}</ThemedText>
            {errorMsg ? (
               <ThemedText style={{ color: Colors[theme].tint }}>
                  {errorMsg}
               </ThemedText>
            ) : (
               <ThemedText>Opening PDF…</ThemedText>
            )}
         </ThemedView>
      );
   }

   // iOS: WebView can display local PDFs
   return (
      <ThemedView style={styles.container}>
         <ThemedText style={styles.title}>{title ?? "PDF Document"}</ThemedText>
         <WebView
            style={styles.webview}
            source={{ uri: url as string }}
            originWhitelist={["*"]}
            allowsBackForwardNavigationGestures
         />
      </ThemedView>
   );
}

const styles = StyleSheet.create({
   container: { flex: 1 },
   title: { fontSize: 18, fontWeight: "bold", padding: 16 },
   webview: { flex: 1 },
});
