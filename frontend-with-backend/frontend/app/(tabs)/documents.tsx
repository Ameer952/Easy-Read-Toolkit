import {
   StyleSheet,
   ScrollView,
   TouchableOpacity,
   Alert,
   View,
   RefreshControl,
   NativeSyntheticEvent,
   NativeScrollEvent,
   Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sharing from "expo-sharing";
import * as FS from "expo-file-system/legacy";
import { printToFileAsync } from "expo-print";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { useReaderTextStyle } from "@/hooks/useReaderPreferences";
import { fetchUserDocuments, deleteUserDocument } from "../../lib/api";

/* =========================================================
   TYPES
   ========================================================= */

type SourceTag = "scan" | "url" | "upload" | "translator";

interface Document {
   id: string;
   title: string;
   content: string;
   type: string;
   date: string;
   url?: string;
   fileUrl?: string;
   imageUri?: string;
   fileName?: string;
   sourceTag?: SourceTag;
}

const AUTH_TOKEN_KEYS = ["easyread.token", "authToken", "token"];

/* =========================================================
   HELPERS
   ========================================================= */

const getAuthToken = async () => {
   for (const key of AUTH_TOKEN_KEYS) {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;

      try {
         const parsed = JSON.parse(raw);
         if (typeof parsed === "string") return parsed;
         if (parsed?.token) return parsed.token;
         if (parsed?.authToken) return parsed.authToken;
         if (parsed?.accessToken) return parsed.accessToken;
         if (parsed?.jwt) return parsed.jwt;
      } catch {
         return raw;
      }
   }
   return null;
};

const isPdfDoc = (doc: Document) =>
   doc.type === "pdf" || (doc.fileName ?? "").toLowerCase().endsWith(".pdf");

const escapeHtml = (str: string) =>
   str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* =========================================================
   COMPONENT
   ========================================================= */

export default function DocumentsScreen() {
   const { theme } = useTheme();
   const insets = useSafeAreaInsets();
   const router = useRouter();
   const { textStyle: readerTextStyle } = useReaderTextStyle();

   const [documents, setDocuments] = useState<Document[]>([]);
   const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
   const [fullDoc, setFullDoc] = useState<Document | null>(null);
   const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);

   const [refreshing, setRefreshing] = useState(false);
   const [pullProgress, setPullProgress] = useState(0);

   useFocusEffect(
      useCallback(() => {
         loadDocuments();
      }, [])
   );

   const loadDocuments = async () => {
      try {
         const token = await getAuthToken();
         if (!token) {
            setDocuments([]);
            return;
         }
         const data = await fetchUserDocuments(token);
         const apiDocs = (data?.documents || []) as any[];

         const mapped: Document[] = apiDocs.map((d) => ({
            id: d.id,
            title: d.title,
            content: d.content,
            type: d.type,
            date: d.createdAt,
            fileName: d.fileName ?? undefined,
            sourceTag: d.sourceTag ?? undefined,
            fileUrl: d.fileUrl ?? undefined,
         }));

         setDocuments(mapped);
      } catch (error: any) {
         console.error("Failed to load documents:", error);
         Alert.alert(
            "Error",
            String(error?.message || "Failed to load documents")
         );
      }
   };

   const onRefresh = async () => {
      setRefreshing(true);
      await loadDocuments();
      setRefreshing(false);
   };

   const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const pullDist = Math.min(Math.max(-y, 0), 120);
      setPullProgress(pullDist / 120);
   };

   const rotateDeg = `${Math.floor(pullProgress * 360)}deg`;
   const iconOpacity = pullProgress;

   const formatDateTime = (isoString: string) => {
      const d = new Date(isoString);
      return (
         d.toLocaleDateString() +
         "   " +
         d.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
         })
      );
   };

   /* =========================================================
     OPEN DOCS (PREVIEW + PDF HANDLING)
     ========================================================= */

   const openDocument = (doc: Document) => {
      setPreviewDoc(doc);
   };

   const openPdfFromDoc = async (doc: Document) => {
      try {
         let localPath = doc.fileUrl;

         // If we have a stored path, check if file exists on this device
         if (localPath) {
            const info = await FS.getInfoAsync(localPath).catch(() => null);
            if (!info?.exists) {
               localPath = undefined;
            }
         }

         // If no valid file on this device, recreate PDF from content
         if (!localPath) {
            if (!doc.content) {
               Alert.alert(
                  "PDF not available",
                  "This PDF file is not available on this device."
               );
               return;
            }

            // Use reading preferences for size / line-height / alignment
            const fontSize =
               typeof readerTextStyle.fontSize === "number"
                  ? readerTextStyle.fontSize
                  : 16;
            const lineHeightPx =
               typeof readerTextStyle.lineHeight === "number"
                  ? readerTextStyle.lineHeight
                  : Math.round(fontSize * 1.5);
            const textAlign =
               (readerTextStyle.textAlign as
                  | "left"
                  | "center"
                  | "right"
                  | "justify") || "left";

            // Hard-code same font stack as the app
            const fontFamilyCSS =
               'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", Roboto, "Segoe UI", Arial, sans-serif';

            const html = `
              <html>
                <head>
                  <meta charset="utf-8" />
                  <style>
                    body {
                      font-family: ${fontFamilyCSS};
                      padding: 24px;
                      font-size: ${fontSize}px;
                      line-height: ${lineHeightPx}px;
                      text-align: ${textAlign};
                    }
                    h1 {
                      margin: 0 0 16px;
                      font-size: ${fontSize + 4}px;
                    }
                    p {
                      white-space: pre-wrap;
                      margin-top: 12px;
                    }
                  </style>
                </head>
                <body>
                  <h1>Easy Read</h1>
                  <p>${escapeHtml(doc.content).replace(/\n/g, "<br/>")}</p>
                </body>
              </html>
            `.trim();

            const pdf = await printToFileAsync({ html });
            localPath = pdf.uri;
         }

         router.push({
            pathname: "/pdf-viewer",
            params: { url: localPath, title: doc.title },
         });
      } catch (e: any) {
         Alert.alert("Open Failed", String(e?.message || e));
      }
   };

   const handleViewFull = async (doc: Document) => {
      setPreviewDoc(null);

      if (isPdfDoc(doc)) {
         await openPdfFromDoc(doc);
      } else {
         setFullDoc(doc);
      }
   };

   /* =========================================================
     SHARE & DELETE
     ========================================================= */

   const shareDocument = async (doc: Document) => {
      try {
         const tempPath = `${FS.cacheDirectory}easy-read-${doc.id}.txt`;
         await FS.writeAsStringAsync(tempPath, doc.content ?? "");
         await Sharing.shareAsync(tempPath, { mimeType: "text/plain" });
      } catch (e: any) {
         Alert.alert("Share Failed", String(e?.message || e));
      }
   };

   const performDelete = async () => {
      if (!deleteTarget) return;
      const doc = deleteTarget;
      try {
         const token = await getAuthToken();
         if (!token) {
            Alert.alert(
               "Error",
               "You need to be signed in to delete documents."
            );
            return;
         }
         await deleteUserDocument(token, doc.id);
         setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      } catch (e: any) {
         Alert.alert("Delete Failed", String(e?.message || e));
      } finally {
         setDeleteTarget(null);
      }
   };

   const typeLabelFor = (doc: Document) => {
      switch (doc.sourceTag) {
         case "scan":
            return "Scanned Document";
         case "url":
            return "Web Article";
         case "upload":
            return "Uploaded PDF";
         case "translator":
            return "Translated Text";
      }
      return "Web Article";
   };

   const iconNameFor = (doc: Document) => {
      if (doc.sourceTag === "scan") return "camera-outline";
      if (doc.sourceTag === "url") return "globe-outline";
      if (doc.sourceTag === "upload") return "document-text-outline";
      if (doc.sourceTag === "translator") return "language-outline";
      return "globe-outline";
   };

   /* =========================================================
     RENDER
     ========================================================= */

   return (
      <ThemedView
         style={[
            styles.container,
            { backgroundColor: Colors[theme].background },
         ]}
      >
         <ThemedView
            style={[
               styles.header,
               {
                  backgroundColor: Colors[theme].headerBackground,
                  paddingTop: insets.top + 20,
               },
            ]}
         >
            <ThemedText style={styles.headerTitle}>Documents</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
               Your reading library
            </ThemedText>
         </ThemedView>

         {Platform.OS !== "ios" && (
            <View style={styles.pullContainer}>
               <View
                  style={[
                     styles.pullIconWrap,
                     {
                        opacity: iconOpacity,
                        transform: [{ rotate: rotateDeg }],
                        borderColor: Colors[theme].border,
                        backgroundColor: Colors[theme].surface,
                     },
                  ]}
               >
                  <Ionicons
                     name={refreshing ? "reload-outline" : "sync-outline"}
                     size={18}
                     color={Colors[theme].accent}
                  />
               </View>
               {pullProgress > 0.3 && !refreshing && (
                  <ThemedText style={styles.pullText}>
                     Pull to sync documents…
                  </ThemedText>
               )}
            </View>
         )}

         <ScrollView
            style={styles.scrollView}
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            refreshControl={
               <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={Colors[theme].accent}
                  colors={[Colors[theme].accent]}
                  progressViewOffset={Platform.OS === "ios" ? 64 : 0}
               />
            }
         >
            <TouchableOpacity
               style={[
                  styles.addButton,
                  { backgroundColor: Colors[theme].buttonBackground },
               ]}
               onPress={() => Alert.alert("TODO: Add document")}
               activeOpacity={0.9}
            >
               <Ionicons name="add" size={20} color="#fff" />
               <ThemedText style={styles.addButtonText}>
                  Add Document
               </ThemedText>
            </TouchableOpacity>

            {documents.length === 0 ? (
               <ThemedView style={styles.emptyState}>
                  <Ionicons
                     name="document-text-outline"
                     size={64}
                     color={Colors[theme].icon}
                  />
                  <ThemedText style={styles.emptyStateText}>
                     No documents yet.{"\n"}Add your first document to get
                     started!
                  </ThemedText>
               </ThemedView>
            ) : (
               <ThemedView style={styles.documentsSection}>
                  <ThemedText style={styles.sectionTitle}>
                     Recent Documents
                  </ThemedText>

                  {documents.map((doc) => (
                     <TouchableOpacity
                        key={doc.id}
                        style={[
                           styles.documentItem,
                           {
                              backgroundColor: Colors[theme].surface,
                              borderColor: Colors[theme].border,
                           },
                        ]}
                        onPress={() => openDocument(doc)}
                        activeOpacity={0.85}
                     >
                        <ThemedView
                           style={[
                              styles.documentIcon,
                              { backgroundColor: Colors[theme].surface },
                           ]}
                        >
                           <Ionicons
                              name={iconNameFor(doc)}
                              size={35}
                              color={Colors[theme].accent}
                           />
                        </ThemedView>

                        <ThemedView style={styles.documentInfo}>
                           <ThemedText
                              style={styles.documentTitle}
                              numberOfLines={1}
                           >
                              {doc.title}
                           </ThemedText>

                           <ThemedText
                              style={[
                                 styles.documentDate,
                                 { color: Colors[theme].textSecondary },
                              ]}
                           >
                              {formatDateTime(doc.date)}
                           </ThemedText>

                           <ThemedText
                              style={[
                                 styles.documentPreview,
                                 { color: Colors[theme].textSecondary },
                              ]}
                              numberOfLines={2}
                           >
                              {doc.content.substring(0, 100)}...
                           </ThemedText>
                        </ThemedView>

                        <View style={styles.actions}>
                           <TouchableOpacity
                              onPress={() => shareDocument(doc)}
                              hitSlop={10}
                              style={styles.actionBtn}
                           >
                              <Ionicons
                                 name="share-outline"
                                 size={20}
                                 color={Colors[theme].accent}
                              />
                           </TouchableOpacity>
                           <TouchableOpacity
                              onPress={() => setDeleteTarget(doc)}
                              hitSlop={10}
                              style={[styles.actionBtn, { marginTop: 8 }]}
                           >
                              <Ionicons
                                 name="trash-outline"
                                 size={20}
                                 color={Colors[theme].accent}
                              />
                           </TouchableOpacity>
                        </View>
                     </TouchableOpacity>
                  ))}
               </ThemedView>
            )}
         </ScrollView>

         {/* Preview modal (tap document) */}
         {previewDoc && (
            <ThemedView style={styles.modalOverlay}>
               <TouchableOpacity
                  style={styles.modalBackdrop}
                  activeOpacity={1}
                  onPress={() => setPreviewDoc(null)}
               />
               <ThemedView
                  style={[
                     styles.modalCard,
                     {
                        backgroundColor: Colors[theme].surface,
                        borderColor: Colors[theme].border,
                     },
                  ]}
               >
                  <ThemedText style={styles.modalTitle}>
                     {previewDoc.title}
                  </ThemedText>
                  <ThemedText
                     style={[
                        styles.modalSubText,
                        { color: Colors[theme].textSecondary },
                     ]}
                  >
                     {typeLabelFor(previewDoc)} ·{" "}
                     {formatDateTime(previewDoc.date)}
                  </ThemedText>
                  <ThemedText
                     style={[
                        styles.modalBody,
                        { color: Colors[theme].textSecondary },
                     ]}
                  >
                     {previewDoc.content.substring(0, 200)}...
                  </ThemedText>

                  <View style={styles.modalButtonRow}>
                     <TouchableOpacity
                        style={[
                           styles.modalButton,
                           { borderColor: Colors[theme].border },
                        ]}
                        onPress={() => setPreviewDoc(null)}
                     >
                        <ThemedText
                           style={[
                              styles.modalButtonText,
                              { color: Colors[theme].text },
                           ]}
                        >
                           Cancel
                        </ThemedText>
                     </TouchableOpacity>

                     <TouchableOpacity
                        style={[
                           styles.modalButton,
                           {
                              borderColor: Colors[theme].accent,
                              backgroundColor: Colors[theme].accent,
                           },
                        ]}
                        onPress={() => handleViewFull(previewDoc)}
                     >
                        <ThemedText
                           style={[styles.modalButtonText, { color: "#fff" }]}
                        >
                           View Full
                        </ThemedText>
                     </TouchableOpacity>
                  </View>
               </ThemedView>
            </ThemedView>
         )}

         {/* Full text modal for non-PDF docs */}
         {fullDoc && (
            <ThemedView style={styles.modalOverlay}>
               <TouchableOpacity
                  style={styles.modalBackdrop}
                  activeOpacity={1}
                  onPress={() => setFullDoc(null)}
               />
               <ThemedView
                  style={[
                     styles.modalCardLarge,
                     {
                        backgroundColor: Colors[theme].surface,
                        borderColor: Colors[theme].border,
                     },
                  ]}
               >
                  <ThemedText style={styles.modalTitle}>
                     {fullDoc.title}
                  </ThemedText>
                  <ScrollView style={{ flex: 1, marginTop: 8 }}>
                     <ThemedText style={styles.fullText}>
                        {fullDoc.content}
                     </ThemedText>
                  </ScrollView>
                  <View style={[styles.modalButtonRow, { marginTop: 12 }]}>
                     <TouchableOpacity
                        style={[
                           styles.modalButton,
                           { borderColor: Colors[theme].border, flex: 1 },
                        ]}
                        onPress={() => setFullDoc(null)}
                     >
                        <ThemedText
                           style={[
                              styles.modalButtonText,
                              { color: Colors[theme].text },
                           ]}
                        >
                           Close
                        </ThemedText>
                     </TouchableOpacity>
                  </View>
               </ThemedView>
            </ThemedView>
         )}

         {/* Delete confirmation overlay */}
         {deleteTarget && (
            <ThemedView style={styles.modalOverlay}>
               <TouchableOpacity
                  style={styles.modalBackdrop}
                  activeOpacity={1}
                  onPress={() => setDeleteTarget(null)}
               />
               <ThemedView
                  style={[
                     styles.modalCard,
                     {
                        backgroundColor: Colors[theme].surface,
                        borderColor: Colors[theme].border,
                     },
                  ]}
               >
                  <ThemedText style={styles.modalTitle}>
                     Delete Document
                  </ThemedText>
                  <ThemedText
                     style={[
                        styles.modalBody,
                        { color: Colors[theme].textSecondary },
                     ]}
                  >
                     Delete “{deleteTarget.title}”? This cannot be undone.
                  </ThemedText>

                  <View style={styles.modalButtonRow}>
                     <TouchableOpacity
                        style={[
                           styles.modalButton,
                           { borderColor: Colors[theme].border },
                        ]}
                        onPress={() => setDeleteTarget(null)}
                     >
                        <ThemedText
                           style={[
                              styles.modalButtonText,
                              { color: Colors[theme].text },
                           ]}
                        >
                           Cancel
                        </ThemedText>
                     </TouchableOpacity>

                     <TouchableOpacity
                        style={[
                           styles.modalButton,
                           {
                              borderColor: Colors[theme].accent,
                              backgroundColor: Colors[theme].accent,
                           },
                        ]}
                        onPress={performDelete}
                     >
                        <ThemedText
                           style={[styles.modalButtonText, { color: "#fff" }]}
                        >
                           Delete
                        </ThemedText>
                     </TouchableOpacity>
                  </View>
               </ThemedView>
            </ThemedView>
         )}
      </ThemedView>
   );
}

/* =========================================================
   STYLES
   ========================================================= */

const styles = StyleSheet.create({
   container: { flex: 1 },

   header: { paddingBottom: 24, paddingHorizontal: 20 },
   headerTitle: {
      fontSize: 28,
      fontWeight: "bold",
      color: "#fff",
      marginBottom: 4,
   },
   headerSubtitle: { fontSize: 16, color: "#fff", opacity: 0.8 },

   pullContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      alignItems: "center",
      zIndex: 10,
      pointerEvents: "none",
   },

   pullIconWrap: {
      width: 32,
      height: 32,
      borderWidth: 1,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
   },

   pullText: {
      fontSize: 12,
      opacity: 0.8,
      marginTop: 6,
   },

   scrollView: { flex: 1, paddingHorizontal: 20 },

   addButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      marginTop: 20,
      marginBottom: 24,
      gap: 8,
   },
   addButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },

   documentsSection: { marginBottom: 32 },
   sectionTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },

   documentItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      gap: 8,
   },

   documentIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 8,
   },

   documentInfo: { flex: 1 },
   documentTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
   documentDate: { fontSize: 14, marginBottom: 4 },
   documentPreview: { fontSize: 12, lineHeight: 16 },

   actions: {
      flexDirection: "column",
      alignItems: "flex-end",
      justifyContent: "center",
   },
   actionBtn: {
      padding: 6,
   },

   emptyState: {
      alignItems: "center",
      paddingVertical: 48,
      paddingHorizontal: 32,
   },
   emptyStateText: { textAlign: "center", marginTop: 16, lineHeight: 20 },

   // modal shared
   modalOverlay: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
   },
   modalBackdrop: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.45)",
   },
   modalCard: {
      width: "86%",
      borderRadius: 18,
      paddingHorizontal: 18,
      paddingVertical: 16,
      borderWidth: 1,
   },
   modalCardLarge: {
      width: "90%",
      maxHeight: "75%",
      borderRadius: 18,
      paddingHorizontal: 18,
      paddingVertical: 16,
      borderWidth: 1,
   },
   modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 4,
   },
   modalSubText: {
      fontSize: 13,
      marginBottom: 8,
   },
   modalBody: {
      fontSize: 14,
      lineHeight: 20,
      marginTop: 4,
      marginBottom: 12,
   },
   modalButtonRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: 4,
   },
   modalButton: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
   },
   modalButtonText: {
      fontSize: 14,
      fontWeight: "600",
   },
   fullText: {
      fontSize: 14,
      lineHeight: 20,
   },
});
